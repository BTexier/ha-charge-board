from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.charge_board.model import Session, TariffSlice

CHARGER = {
    "name": "Dé",
    "power_entity": "sensor.p",
    "plug_entity": "binary_sensor.plug",
    "plugged_states": [],
    "power_threshold_w": 100,
    "gap_hours": 3,
}
VEHICLE = {"name": "Twingo", "capacity_kwh": 27.5, "soc_entity": "sensor.soc", "target_fixed": 80}
PARIS = ZoneInfo("Europe/Paris")


def ts(*args) -> float:
    return datetime(*args, tzinfo=PARIS).timestamp()


def sess(sid, start, kwh=5.0, cost=1.0, source=True, vehicle_id=None, cid="c"):
    end = start + 3600
    return Session(
        id=sid,
        charger_id=cid,
        vehicle_id=vehicle_id,
        plugged_at=start,
        charge_start=start,
        charge_end=end,
        unplugged_at=end,
        charging_s=3600,
        energy_kwh=kwh,
        cost=cost,
        off_peak=TariffSlice(kwh / 2, None if cost is None else cost / 2),
        peak=TariffSlice(kwh / 2, None if cost is None else cost / 2),
        has_off_peak_source=source,
    )


@pytest.fixture
async def env(hass, hass_ws_client):
    await hass.config.async_set_time_zone("Europe/Paris")
    hass.states.async_set("sensor.p", "0", {"unit_of_measurement": "W"})
    hass.states.async_set("binary_sensor.plug", "off")
    hass.states.async_set("sensor.soc", "40")
    entry = MockConfigEntry(
        domain="charge_board",
        options={"off_peak_price": 0.2, "peak_price": 0.2},
        subentries_data=[
            {"data": CHARGER, "subentry_type": "charger", "title": "Dé", "unique_id": None},
            {"data": VEHICLE, "subentry_type": "vehicle", "title": "Twingo", "unique_id": None},
        ],
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    hub = entry.runtime_data
    cid = next(iter(hub.chargers))
    vid = next(iter(hub.vehicles))
    return hub, cid, vid, await hass_ws_client(hass)


async def put(hub, *sessions):
    await hub.store.async_replace([], list(sessions))


async def test_sessions_month_filter_uses_local_time(env):
    hub, cid, _, ws = env
    await put(
        hub,
        sess("a", ts(2026, 10, 31, 23, 30), cid=cid),
        sess("b", ts(2026, 11, 1, 0, 30), cid=cid),
    )
    await ws.send_json_auto_id({"type": "charge_board/sessions", "month": "2026-10"})
    r = (await ws.receive_json())["result"]
    assert [s["id"] for s in r["sessions"]] == ["a"]
    assert r["summary"]["count"] == 1
    await ws.send_json_auto_id({"type": "charge_board/sessions", "month": "2026-11"})
    assert [s["id"] for s in (await ws.receive_json())["result"]["sessions"]] == ["b"]


async def test_summary_without_off_peak_source_is_none(env):
    hub, cid, _, ws = env
    await put(hub, sess("a", ts(2026, 10, 1), source=False, cid=cid))
    await ws.send_json_auto_id({"type": "charge_board/sessions"})
    summary = (await ws.receive_json())["result"]["summary"]
    assert summary["off_peak_share"] is None
    assert summary["energy_kwh"] == 5.0
    await put(hub, sess("b", ts(2026, 10, 2), cid=cid))
    await ws.send_json_auto_id({"type": "charge_board/sessions"})
    assert (await ws.receive_json())["result"]["summary"]["off_peak_share"] == pytest.approx(0.5)


async def test_merge_then_list(env):
    hub, cid, _, ws = env
    await put(
        hub,
        sess("a", ts(2026, 10, 1, 8), cid=cid),
        sess("b", ts(2026, 10, 1, 12), cid=cid),
        sess("c", ts(2026, 10, 1, 16), cid=cid),
    )
    await ws.send_json_auto_id({"type": "charge_board/merge", "session_id": "a", "other_id": "c"})
    assert (await ws.receive_json())["error"]["code"] == "invalid"
    await ws.send_json_auto_id({"type": "charge_board/merge", "session_id": "a", "other_id": "b"})
    ids = (await ws.receive_json())["result"]["sessions"]
    assert len(ids) == 1
    await ws.send_json_auto_id({"type": "charge_board/sessions"})
    r = (await ws.receive_json())["result"]
    assert len(r["sessions"]) == 2
    assert r["summary"]["energy_kwh"] == 15.0
    assert r["sessions"][1]["edited"] is True


async def test_split_open_session_is_refused(hass, env, freezer):
    hub, cid, _, ws = env
    hass.states.async_set("sensor.p", "2000", {"unit_of_measurement": "W"})
    hass.states.async_set("binary_sensor.plug", "on")
    hub._feed_all()
    freezer.tick(60)
    hub._feed_all()
    open_id = hub.trackers[cid].current.id
    await ws.send_json_auto_id({"type": "charge_board/split", "session_id": open_id, "at": 1.0})
    assert (await ws.receive_json())["error"]["code"] == "in_progress"


async def test_delete_unknown_is_not_found(env):
    hub, cid, _, ws = env
    await ws.send_json_auto_id({"type": "charge_board/delete", "session_id": "nope"})
    assert (await ws.receive_json())["error"]["code"] == "not_found"
    await put(hub, sess("a", ts(2026, 10, 1), cid=cid))
    await ws.send_json_auto_id({"type": "charge_board/delete", "session_id": "a"})
    assert (await ws.receive_json())["result"] == {"sessions": []}
    assert hub.store.sessions == []


async def test_set_vehicle_and_session_detail(env):
    hub, cid, vid, ws = env
    await put(hub, sess("a", ts(2026, 10, 1), cid=cid))
    await ws.send_json_auto_id(
        {"type": "charge_board/set_vehicle", "session_id": "a", "vehicle_id": vid}
    )
    assert (await ws.receive_json())["result"] == {"sessions": ["a"]}
    await ws.send_json_auto_id({"type": "charge_board/session", "session_id": "a"})
    r = (await ws.receive_json())["result"]
    assert (r["vehicle_name"], r["charger_name"], r["edited"]) == ("Twingo", "Dé", True)


async def test_overview_estimated_end_only_when_known(hass, env, freezer):
    hub, cid, vid, ws = env
    await put(hub, sess("a", ts(2026, 10, 1), cid=cid))
    await ws.send_json_auto_id({"type": "charge_board/overview"})
    r = (await ws.receive_json())["result"]
    c = r["chargers"][0]
    assert (r["style"], r["currency"]) == ("detailed", hass.config.currency)
    assert r["vehicles"] == [{"id": vid, "name": "Twingo"}]
    assert c["state"] == "free" and c["estimated_end"] is None and c["last_session"]["id"] == "a"
    assert c["vehicle"] == {
        "id": vid,
        "name": "Twingo",
        "soc": 40.0,
        "target": 80,
        "capacity_kwh": 27.5,
    }
    hass.states.async_set("sensor.p", "2200", {"unit_of_measurement": "W"})
    await ws.send_json_auto_id({"type": "charge_board/overview"})
    c = (await ws.receive_json())["result"]["chargers"][0]
    assert c["state"] == "charging"
    assert c["estimated_end"] == pytest.approx(
        dt_util.utcnow().timestamp() + 0.4 * 27.5 / 2.2 * 3600
    )


async def test_subscribe_events(hass, env):
    hub, cid, _, ws = env
    await ws.send_json_auto_id({"type": "charge_board/subscribe"})
    assert (await ws.receive_json())["success"]
    await put(hub, sess("a", ts(2026, 10, 1), cid=cid))
    assert (await ws.receive_json())["event"] == {"event": "updated"}


async def test_summary_unpriced_count(env):
    hub, cid, _, ws = env
    await put(hub, sess("a", ts(2026, 10, 1), cost=2.0, cid=cid))
    await ws.send_json_auto_id({"type": "charge_board/sessions"})
    summary = (await ws.receive_json())["result"]["summary"]
    assert (summary["cost"], summary["unpriced_count"]) == (2.0, 0)
    await put(hub, sess("b", ts(2026, 10, 2), cost=None, cid=cid))
    await ws.send_json_auto_id({"type": "charge_board/sessions"})
    summary = (await ws.receive_json())["result"]["summary"]
    assert (summary["cost"], summary["unpriced_count"]) == (2.0, 1)


async def test_stats_command_returns_twelve_months(env, monkeypatch):
    hub, _cid, vid, ws = env

    async def km(vehicle_id, months):
        return {"2026-10": 300.0}, set()

    monkeypatch.setattr(hub, "async_km_by_month", km)
    await put(hub, sess("a", ts(2026, 10, 10, 22), kwh=10, cost=1.4, vehicle_id=vid))
    await ws.send_json({"id": 1, "type": "charge_board/stats", "year": 2026, "vehicle_id": vid})
    res = (await ws.receive_json())["result"]
    assert len(res["rows"]) == 12
    october = res["rows"][9]
    assert october["month"] == "2026-10"
    assert october["km"] == 300.0
    assert october["km_partial"] is False
    assert october["cost_per_100km"] == pytest.approx(1.4 / 300 * 100)
    assert res["total"]["sessions"] == 1
    assert res["currency"] == "EUR"


async def test_stats_for_all_vehicles_has_no_km(env, monkeypatch):
    hub, _cid, vid, ws = env
    await put(hub, sess("a", ts(2026, 10, 10, 22), vehicle_id=vid))
    await ws.send_json({"id": 1, "type": "charge_board/stats", "year": 2026})
    res = (await ws.receive_json())["result"]
    assert all(r["km"] is None for r in res["rows"])
    assert res["rows"][9]["sessions"] == 1


async def test_vehicle_command_shapes_config_and_flags_ignored_cut(env, monkeypatch):
    hub, _cid, vid, ws = env  # VEHICLE has no target entity: home objective; CHARGER has no switch

    async def km(vehicle_id, start, end):
        return 100.0, start

    monkeypatch.setattr(hub, "async_km_between", km)
    now = dt_util.utcnow().timestamp()
    await put(
        hub,
        sess("first", now - 40 * 86400, kwh=5, vehicle_id=vid),
        sess("a", now - 86400, kwh=13, cost=1.8, vehicle_id=vid),
    )
    await ws.send_json({"id": 1, "type": "charge_board/vehicle", "vehicle_id": vid})
    res = (await ws.receive_json())["result"]
    assert res["name"] == "Twingo"
    assert res["target_source"] == "home"
    assert res["target"] == 80
    assert res["soc"] == 40
    assert res["consumption_30d"] == pytest.approx(13.0)
    assert res["autonomy_km"] == pytest.approx(27.5 * 0.40 / 13.0 * 100)
    assert res["cut_ignored"] is True
    assert {c["key"] for c in res["config"]} >= {"soc_entity", "target", "odometer_entity"}
    soc = next(c for c in res["config"] if c["key"] == "soc_entity")
    assert soc == {"key": "soc_entity", "entity_id": "sensor.soc", "value": 40.0, "ok": True}
    assert len(res["rows"]) == 12


async def test_vehicle_command_unknown_is_not_found(env):
    _hub, _cid, _vid, ws = env
    await ws.send_json({"id": 1, "type": "charge_board/vehicle", "vehicle_id": "nope"})
    assert (await ws.receive_json())["error"]["code"] == "not_found"


async def test_vehicle_consumption_needs_5_km_and_flags_a_broken_entity(env, hass, monkeypatch):
    hub, _cid, vid, ws = env

    async def km(vehicle_id, start, end):
        return 3.0, start

    monkeypatch.setattr(hub, "async_km_between", km)
    hub.vehicles[vid]["target_entity"] = "input_number.target"
    hass.states.async_set("input_number.target", "unavailable")
    now = dt_util.utcnow().timestamp()
    await put(hub, sess("a", now - 86400, kwh=10, vehicle_id=vid))
    await ws.send_json({"id": 1, "type": "charge_board/vehicle", "vehicle_id": vid})
    res = (await ws.receive_json())["result"]
    assert res["consumption_30d"] is None
    assert res["autonomy_km"] is None
    target = next(c for c in res["config"] if c["key"] == "target")
    assert target["ok"] is False
    assert target["value"] == 80  # the fixed fallback still shows


async def test_vehicle_consumption_only_counts_energy_since_the_odometer_is_tracked(
    env, monkeypatch
):
    hub, _cid, vid, ws = env
    now = dt_util.utcnow().timestamp()

    async def km(vehicle_id, start, end):
        return 100.0, now - 5 * 86400  # odometer statistics began 5 days ago

    monkeypatch.setattr(hub, "async_km_between", km)
    await put(
        hub,
        sess("old", now - 10 * 86400, kwh=20, vehicle_id=vid),
        sess("new", now - 2 * 86400, kwh=13, vehicle_id=vid),
    )
    await ws.send_json({"id": 1, "type": "charge_board/vehicle", "vehicle_id": vid})
    res = (await ws.receive_json())["result"]
    assert res["consumption_30d"] == pytest.approx(13.0)


async def test_partial_month_pairs_km_with_the_charges_after_the_first(env, monkeypatch):
    hub, _cid, vid, ws = env
    first, second = ts(2026, 10, 16, 18), ts(2026, 10, 20, 22)
    calls = []

    async def km_by_month(vehicle_id, months):
        return {"2026-10": 568.0}, {"2026-10"}  # since 13 Oct, before the first charge

    async def km_between(vehicle_id, start, end):
        calls.append(start)
        return 443.0, start

    monkeypatch.setattr(hub, "async_km_by_month", km_by_month)
    monkeypatch.setattr(hub, "async_km_between", km_between)
    await put(
        hub,
        sess("a", first, kwh=0.7, cost=0.12, vehicle_id=vid),
        sess("b", second, kwh=72.3, cost=10.04, vehicle_id=vid),
    )
    await ws.send_json({"id": 1, "type": "charge_board/stats", "year": 2026, "vehicle_id": vid})
    october = (await ws.receive_json())["result"]["rows"][9]
    assert first in calls
    assert october["km"] == 443.0
    assert october["energy_kwh"] == pytest.approx(73.0)  # what was charged in the month
    assert october["cost_per_100km"] == pytest.approx(10.04 / 443 * 100)
