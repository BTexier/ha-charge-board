"""Websocket commands used by the panel."""

from __future__ import annotations

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
                connection.send_error(msg["id"], "not_loaded", "Charge Board is not loaded")
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
    for handler in (overview, sessions, session, set_vehicle, delete, merge, split):
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
            target = hub._number(v.get("target_entity")) if v.get("target_entity") else None
            if target is None:
                target = v.get("target_fixed")
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
        connection.send_error(msg["id"], "not_loaded", "Charge Board is not loaded")
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
