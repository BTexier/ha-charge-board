"""Websocket commands used by the panel."""

from __future__ import annotations

from datetime import datetime, timedelta
from uuid import uuid4

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.util import dt as dt_util

from . import corrections
from .const import DOMAIN, SIGNAL_LIVE, SIGNAL_UPDATED
from .estimate import estimate_end
from .hub import Hub
from .model import Session
from .stats import MIN_KM_FOR_CONSUMPTION, consumption_since, month_rows, total_row


def _hub(hass: HomeAssistant) -> Hub | None:
    entries = hass.config_entries.async_loaded_entries(DOMAIN)
    return entries[0].runtime_data if entries else None


def command(schema: dict):
    """Register a command that gets the hub, or answers `not_loaded`."""

    def decorator(func):
        @websocket_api.websocket_command(
            {vol.Required("type"): f"{DOMAIN}/{func.__name__}", **schema}
        )
        @websocket_api.async_response
        async def handler(hass, connection, msg):
            hub = _hub(hass)
            if hub is None:
                connection.send_error(msg["id"], "not_loaded", "EVChargeData is not loaded")
                return
            try:
                connection.send_result(msg["id"], await func(hub, msg))
            except _Error as err:
                connection.send_error(msg["id"], err.code, str(err))

        handler.ws_func = handler
        return handler

    return decorator


class _Error(Exception):
    def __init__(self, code: str, message: str = "") -> None:
        super().__init__(message or code)
        self.code = code


@callback
def async_register(hass: HomeAssistant) -> None:
    """Once per hass: commands outlive config entry reloads."""
    if hass.data.setdefault(DOMAIN, {}).get("ws"):
        return
    hass.data[DOMAIN]["ws"] = True
    for handler in (overview, sessions, session, set_vehicle, delete, merge, split, stats, vehicle):
        websocket_api.async_register_command(hass, handler)
    websocket_api.async_register_command(hass, subscribe)


def _with_names(hub: Hub, s: Session) -> dict:
    d = s.to_dict()
    d["vehicle_name"] = (hub.vehicles.get(s.vehicle_id) or {}).get("name")
    d["charger_name"] = (hub.chargers.get(s.charger_id) or {}).get("name")
    return d


def _find(hub: Hub, session_id: str) -> Session:
    for s in hub.store.sessions:
        if s.id == session_id:
            return s
    if any(t.current and t.current.id == session_id for t in hub.trackers.values()):
        raise _Error("in_progress", "session is still in progress")
    raise _Error("not_found", "unknown session")


def _start(s: Session) -> float:
    return s.charge_start or s.plugged_at or 0.0


def _local_month(t: float) -> str:
    return dt_util.as_local(dt_util.utc_from_timestamp(t)).strftime("%Y-%m")


@command({})
async def overview(hub: Hub, msg: dict) -> dict:
    now = dt_util.utcnow().timestamp()
    chargers = []
    for cid, c in hub.chargers.items():
        live = hub.live(cid)
        v = hub.vehicles.get(live["vehicle_id"])
        vehicle = end = None
        if v:
            soc = hub._number(v.get("soc_entity"))
            target = hub.target_for(live["vehicle_id"])
            vehicle = {
                "id": live["vehicle_id"],
                "name": v["name"],
                "soc": soc,
                "target": target,
                "capacity_kwh": v.get("capacity_kwh"),
            }
            end = estimate_end(now, soc, target, v.get("capacity_kwh"), live["power_w"])
        last = next((s for s in hub.store.sessions if s.charger_id == cid), None)
        chargers.append(
            {
                "id": cid,
                "name": c["name"],
                "state": live["state"],
                "vehicle": vehicle,
                "power_w": live["power_w"],
                "session": live["session"],
                "estimated_end": end,
                "last_session": _with_names(hub, last) if last else None,
            }
        )
    return {
        "style": hub.options.get("overview_style", "detailed"),
        "currency": hub.hass.config.currency,
        "chargers": chargers,
        "vehicles": [{"id": vid, "name": v["name"]} for vid, v in hub.vehicles.items()],
    }


@command(
    {
        vol.Optional("vehicle_id"): str,
        vol.Optional("charger_id"): str,
        vol.Optional("month"): vol.Match(r"^\d{4}-\d{2}$"),
    }
)
async def sessions(hub: Hub, msg: dict) -> dict:
    found = [
        s
        for s in hub.store.sessions
        if msg.get("vehicle_id") in (None, s.vehicle_id)
        and msg.get("charger_id") in (None, s.charger_id)
        and msg.get("month") in (None, _local_month(_start(s)))
    ]
    costs = [s.cost for s in found if s.cost is not None]
    sourced = [s for s in found if s.has_off_peak_source and s.energy_kwh > 0]
    total = sum(s.energy_kwh for s in sourced)
    return {
        "sessions": [_with_names(hub, s) for s in found],
        "summary": {
            "count": len(found),
            "energy_kwh": sum(s.energy_kwh for s in found),
            "cost": sum(costs) if costs else None,
            "unpriced_count": len(found) - len(costs),
            "off_peak_share": sum(s.off_peak.kwh for s in sourced) / total if total else None,
        },
    }


@command({vol.Required("session_id"): str})
async def session(hub: Hub, msg: dict) -> dict:
    return _with_names(hub, _find(hub, msg["session_id"]))


@command({vol.Required("session_id"): str, vol.Required("vehicle_id"): str})
async def set_vehicle(hub: Hub, msg: dict) -> dict:
    s = _find(hub, msg["session_id"])
    if msg["vehicle_id"] not in hub.vehicles:
        raise _Error("invalid", "unknown vehicle")
    new = corrections.change_vehicle(s, msg["vehicle_id"])
    await hub.store.async_replace([s.id], [new])
    return {"sessions": [new.id]}


@command({vol.Required("session_id"): str})
async def delete(hub: Hub, msg: dict) -> dict:
    s = _find(hub, msg["session_id"])
    await hub.store.async_replace([s.id], [])
    return {"sessions": []}


@command({vol.Required("session_id"): str, vol.Required("other_id"): str})
async def merge(hub: Hub, msg: dict) -> dict:
    a, b = _find(hub, msg["session_id"]), _find(hub, msg["other_id"])
    same = sorted((s for s in hub.store.sessions if s.charger_id == a.charger_id), key=_start)
    if a.charger_id != b.charger_id or abs(same.index(a) - same.index(b)) != 1:
        raise _Error("invalid", "sessions are not neighbours on the same charger")
    try:
        new = corrections.merge_sessions(a, b)
    except ValueError as err:
        raise _Error("invalid", str(err)) from err
    await hub.store.async_replace([a.id, b.id], [new])
    return {"sessions": [new.id]}


@command({vol.Required("session_id"): str, vol.Required("at"): vol.Coerce(float)})
async def split(hub: Hub, msg: dict) -> dict:
    s = _find(hub, msg["session_id"])
    try:
        a, b = corrections.split_session(s, msg["at"], uuid4().hex)
    except ValueError as err:
        raise _Error("invalid", str(err)) from err
    await hub.store.async_replace([s.id], [a, b])
    return {"sessions": [a.id, b.id]}


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/subscribe"})
@callback
def subscribe(hass: HomeAssistant, connection, msg: dict) -> None:
    """Tell the panel to re-fetch: finished sessions changed or a live tick happened."""
    hub = _hub(hass)
    if hub is None:
        connection.send_error(msg["id"], "not_loaded", "EVChargeData is not loaded")
        return

    @callback
    def send() -> None:
        connection.send_message(websocket_api.event_message(msg["id"], {"event": "updated"}))

    unsubs = [async_dispatcher_connect(hass, SIGNAL_UPDATED, send)]
    unsubs += [
        async_dispatcher_connect(hass, SIGNAL_LIVE.format(cid), send) for cid in hub.chargers
    ]

    @callback
    def unsub() -> None:
        for u in unsubs:
            u()

    connection.subscriptions[msg["id"]] = unsub
    connection.send_result(msg["id"])


@command({vol.Optional("vehicle_id"): str, vol.Required("year"): int})
async def stats(hub: Hub, msg: dict) -> dict:
    """The 12 months of a year and their total; km only for one vehicle (odometers do not add)."""
    vid = msg.get("vehicle_id")
    months = [f"{msg['year']}-{m:02d}" for m in range(1, 13)]
    found = [s for s in hub.store.sessions if vid is None or s.vehicle_id == vid]
    km, partial = await hub.async_km_by_month(vid, months) if vid else ({}, set())
    rows = month_rows(found, months, km, dt_util.get_default_time_zone(), partial)
    if vid:
        await _pair_partial(hub, vid, rows, found)
    now = _local_month(dt_util.utcnow().timestamp())
    return {"currency": hub.hass.config.currency, "rows": rows, "total": total_row(rows, now)}


def _last_months(now: float, n: int = 12) -> list[str]:
    """The n months up to the current one, oldest first ("YYYY-MM", local time)."""
    year, month = (int(x) for x in _local_month(now).split("-"))
    out = []
    for _ in range(n):
        out.append(f"{year}-{month:02d}")
        year, month = (year, month - 1) if month > 1 else (year - 1, 12)
    return out[::-1]


@command({vol.Required("vehicle_id"): str})
async def vehicle(hub: Hub, msg: dict) -> dict:
    """Data of the Vehicles tab: levels, consumption, monthly rows and sensor health."""
    vid = msg["vehicle_id"]
    v = hub.vehicles.get(vid)
    if v is None:
        raise _Error("not_found", "unknown vehicle")
    now = dt_util.utcnow().timestamp()
    soc = hub._number(v.get("soc_entity"))
    odometer = hub._number(v.get("odometer_entity"))
    capacity = v.get("capacity_kwh")
    mine = [s for s in hub.store.sessions if s.vehicle_id == vid]

    start = now - 30 * 86400
    km_30d, covered_from = await hub.async_km_between(vid, start, now)
    first = _first_start(mine)
    if first is not None and first > covered_from:
        # Nothing recorded before the first charge: km from it, the charges after it.
        km_30d, covered_from = await hub.async_km_between(vid, first, now)
        energy_30d = sum(s.energy_kwh for s in mine if _start(s) > covered_from)
    else:
        energy_30d = sum(s.energy_kwh for s in mine if _start(s) >= covered_from)
    enough = km_30d is not None and km_30d >= MIN_KM_FOR_CONSUMPTION and energy_30d > 0
    consumption = energy_30d / km_30d * 100 if enough else None
    autonomy = (
        capacity * soc / 100 / consumption * 100
        if consumption and soc is not None and capacity
        else None
    )
    months = _last_months(now)
    km, partial = await hub.async_km_by_month(vid, months)
    rows = month_rows(mine, months, km, _tz(), partial)
    await _pair_partial(hub, vid, rows, mine)
    for row in rows:
        km = row["km"]
        energy = row.get("paired_energy_kwh", row["energy_kwh"])
        row["kwh_100km"] = energy / km * 100 if km and km >= MIN_KM_FOR_CONSUMPTION else None

    last = hub.last_session_of(vid)
    source = hub.target_source(vid)
    fuel_entity = hub.options.get("fuel_price_entity")

    def item(key: str, entity_id: str | None, value) -> dict:
        # A configured entity is healthy only if it reads a number, whatever the fallback.
        ok = hub._number(entity_id) is not None if entity_id else value is not None
        return {"key": key, "entity_id": entity_id, "value": value, "ok": ok}

    return {
        "id": vid,
        "name": v["name"],
        "capacity_kwh": capacity,
        "soc": soc,
        "target": hub.target_for(vid),
        "target_source": source,
        "odometer": odometer,
        "consumption_30d": consumption,
        "autonomy_km": autonomy,
        "consumption_since": consumption_since(
            last.soc_end if last else None,
            soc,
            last.odometer_end if last else None,
            odometer,
            capacity,
        ),
        "fuel_l100": v.get("fuel_l100"),
        "currency": hub.hass.config.currency,
        "rows": rows,
        "sessions": [
            {"start": _start(s), "end": s.unplugged_at or s.charge_end}
            for s in mine
            if _start(s) >= start
        ],
        "config": [
            item("soc_entity", v.get("soc_entity"), soc),
            item("target", v.get("target_entity"), hub.target_for(vid)),
            item("odometer_entity", v.get("odometer_entity"), odometer),
            item("fuel_price", fuel_entity, hub.fuel_price()),
        ],
        "cut_ignored": source == "home"
        and not any(c.get("plug_entity") and c.get("switch_entity") for c in hub.chargers.values()),
    }


def _first_start(sessions: list[Session]) -> float | None:
    return min((_start(s) for s in sessions), default=None)


async def _pair_partial(hub: Hub, vid: str, rows: list[dict], sessions: list[Session]) -> None:
    """Fix the per-100-km figures of the month where the odometer tracking began.

    Its km run from when the statistics began, which may be before the first recorded
    charge: those km were driven on energy never recorded. When the first charge falls in
    that month, the km are counted from it and the ratios use only the charges after it
    (the first one refilled what was driven before). The row's sessions, energy and cost
    stay what was charged in the month.
    """
    first = _first_start(sessions)
    if first is None:
        return
    now = dt_util.utcnow().timestamp()
    tz = _tz()
    for row in rows:
        if not row["km_partial"] or _local_month(first) != row["month"]:
            continue
        start = datetime.strptime(row["month"], "%Y-%m").replace(tzinfo=tz)
        end = (start + timedelta(days=32)).replace(day=1).timestamp()
        km, _ = await hub.async_km_between(vid, first, min(end, now))
        after = [s for s in sessions if _start(s) > first]
        paired = month_rows(after, [row["month"]], {row["month"]: km}, tz)[0]
        row["km"] = km
        for key in ("cost_per_100km", "fuel_cost", "savings", "fuel_price", "fuel_l100"):
            row[key] = paired[key]
        row["paired_energy_kwh"] = paired["energy_kwh"]


def _tz():
    return dt_util.get_default_time_zone()
