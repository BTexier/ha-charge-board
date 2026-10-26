import pytest
from homeassistant.core import State
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
    async_mock_service,
    mock_restore_cache,
)

CHARGER = {
    "name": "Dé",
    "power_entity": "sensor.p",
    "plug_entity": "binary_sensor.plug",
    "plugged_states": [],
    "power_threshold_w": 100,
    "gap_hours": 3,
}
VEHICLE = {"name": "Twingo", "capacity_kwh": 27.5, "soc_entity": "sensor.soc", "target_fixed": 100}
ZOE = {"name": "Zoe", "capacity_kwh": 52, "soc_entity": "sensor.soc2", "target_fixed": 100}


@pytest.fixture
async def setup(hass):
    hass.states.async_set("sensor.p", "2200", {"unit_of_measurement": "W"})
    hass.states.async_set("binary_sensor.plug", "on")
    hass.states.async_set("sensor.soc", "40")
    hass.states.async_set("sensor.soc2", "70")
    entry = MockConfigEntry(
        domain="charge_board",
        options={"off_peak_price": 0.2, "peak_price": 0.2},
        subentries_data=[
            {"data": CHARGER, "subentry_type": "charger", "title": "Dé", "unique_id": None},
            {"data": VEHICLE, "subentry_type": "vehicle", "title": "Twingo", "unique_id": None},
            {"data": ZOE, "subentry_type": "vehicle", "title": "Zoe", "unique_id": None},
        ],
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    cid = next(s.subentry_id for s in entry.subentries.values() if s.subentry_type == "charger")
    return entry, cid


async def _run(hass, freezer, seconds):
    for _ in range(seconds // 30):
        freezer.tick(30)
        async_fire_time_changed(hass)
        await hass.async_block_till_done()


async def test_power_in_kw_is_converted(hass, setup):
    entry, cid = setup
    hass.states.async_set("sensor.p", "2.2", {"unit_of_measurement": "kW"})
    assert entry.runtime_data.sample_for(cid).power_w == 2200


async def test_unavailable_is_none(hass, setup):
    entry, cid = setup
    hass.states.async_set("sensor.p", "unavailable")
    assert entry.runtime_data.sample_for(cid).power_w is None


async def test_steady_power_still_accumulates(hass, setup, freezer):
    entry, cid = setup
    await _run(hass, freezer, 3600)
    live = entry.runtime_data.live(cid)
    assert live["state"] == "charging"
    assert live["energy_kwh"] == pytest.approx(2.2, abs=0.01)
    assert live["cost"] == pytest.approx(0.44, abs=0.01)
    assert live["session"]["soc_start"] == 40
    assert float(hass.states.get("sensor.de_energie_session").state) == pytest.approx(2.2, abs=0.01)
    assert hass.states.get("sensor.de_cout_session").attributes["unit_of_measurement"] == "EUR"
    assert hass.states.get("select.de_vehicule").state == "Twingo"


async def test_session_persists_and_is_announced(hass, setup, freezer):
    entry, cid = setup
    announced = []
    async_dispatcher_connect(hass, "charge_board_updated", lambda: announced.append(1))
    await _run(hass, freezer, 600)
    hass.states.async_set("sensor.p", "0", {"unit_of_measurement": "W"})
    freezer.tick(5)
    hass.states.async_set("binary_sensor.plug", "off")
    await hass.async_block_till_done()
    sessions = entry.runtime_data.store.sessions
    assert len(sessions) == 1
    assert sessions[0].energy_kwh == pytest.approx(2.2 / 6, abs=0.01)
    assert sessions[0].vehicle_id is not None
    assert announced
    assert entry.runtime_data.live(cid)["state"] == "free"


async def test_open_session_survives_reload(hass, setup, freezer):
    entry, cid = setup
    await _run(hass, freezer, 600)
    before = entry.runtime_data.live(cid)["energy_kwh"]
    assert before > 0.3
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.runtime_data.live(cid)["energy_kwh"] == pytest.approx(before)


async def test_trackers_are_saved_while_ticking(hass, setup, freezer, hass_storage):
    entry, cid = setup
    key = f"charge_board.{entry.entry_id}.trackers"
    await _run(hass, freezer, 90)
    assert hass_storage[key]["data"][cid]["session"]["open"] is True


@pytest.fixture
def restore_zoe(hass):
    mock_restore_cache(hass, [State("select.de_vehicule", "Zoe")])


async def test_restored_vehicle_is_used_after_reload(hass, restore_zoe, setup, freezer):
    entry, cid = setup
    zoe = next(s.subentry_id for s in entry.subentries.values() if s.title == "Zoe")
    await _run(hass, freezer, 300)
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.get("select.de_vehicule").state == "Zoe"
    await _run(hass, freezer, 60)
    session = entry.runtime_data.live(cid)["session"]
    assert session["vehicle_id"] == zoe
    assert session["soc_start"] == 70
    assert session["soc_end"] == 70


async def test_switching_vehicle_forgets_previous_soc(hass, setup, freezer):
    entry, cid = setup
    # Close the near-empty session opened at setup (dropped, < 0.01 kWh), then replug.
    for entity_id, state in (
        ("sensor.p", "0"),
        ("binary_sensor.plug", "off"),
        ("binary_sensor.plug", "on"),
    ):
        freezer.tick(1)
        hass.states.async_set(entity_id, state, {"unit_of_measurement": "W"})
        await hass.async_block_till_done()
    await _run(hass, freezer, 60)  # plugged, Twingo selected: its 40 % is remembered
    hub = entry.runtime_data
    no_soc = next(vid for vid, v in hub.vehicles.items() if v["name"] == "Zoe")
    hub.vehicles[no_soc].pop("soc_entity")  # Zoe without battery level
    await hass.services.async_call(
        "select", "select_option", {"entity_id": "select.de_vehicule", "option": "Zoe"}, True
    )
    hass.states.async_set("sensor.p", "2200", {"unit_of_measurement": "W"})
    await _run(hass, freezer, 60)
    session = hub.live(cid)["session"]
    assert session["vehicle_id"] == no_soc
    assert session["soc_start"] is None


# --- Notifications --------------------------------------------------------------------------

EVENTS = ("charge_board_plugged", "charge_board_started", "charge_board_unplugged")


async def _notify_entry(hass, **options):
    hass.states.async_set("sensor.p", "2200", {"unit_of_measurement": "W"})
    hass.states.async_set("binary_sensor.plug", "off")
    hass.states.async_set("sensor.soc", "40")
    entry = MockConfigEntry(
        domain="charge_board",
        options={"off_peak_price": 0.2, "peak_price": 0.2, **options},
        subentries_data=[
            {"data": CHARGER, "subentry_type": "charger", "title": "Dé", "unique_id": None},
            {"data": VEHICLE, "subentry_type": "vehicle", "title": "Twingo", "unique_id": None},
        ],
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def _capture(hass):
    captured = []
    for name in EVENTS:
        hass.bus.async_listen(name, captured.append)
    return captured


async def _full_cycle(hass, freezer):
    hass.states.async_set("binary_sensor.plug", "on")
    await hass.async_block_till_done()
    await _run(hass, freezer, 900)  # 15 min of charging
    hass.states.async_set("sensor.p", "0", {"unit_of_measurement": "W"})
    freezer.tick(5)
    hass.states.async_set("binary_sensor.plug", "off")
    await hass.async_block_till_done()


async def test_plug_start_unplug_notify_once_each(hass, freezer):
    calls = async_mock_service(hass, "notify", "mobile_app_iphone")
    entry = await _notify_entry(hass, notify_service="mobile_app_iphone")
    ev = await _capture(hass)
    await _full_cycle(hass, freezer)
    assert [c.data["title"] for c in calls] == [
        "Twingo plugged in",
        "Charging started",
        "Twingo unplugged",
    ]
    assert calls[0].data["message"] == "On Dé · battery 40% → target 100%"
    assert calls[0].data["data"]["url"] == "/charge-board"
    assert [e.event_type for e in ev] == list(EVENTS)
    assert ev[0].data["vehicle_name"] == "Twingo"
    assert ev[2].data["session"]["energy_kwh"] > 0
    assert len(entry.runtime_data.store.sessions) == 1


async def test_reload_mid_session_sends_nothing_new(hass, freezer):
    calls = async_mock_service(hass, "notify", "mobile_app_iphone")
    entry = await _notify_entry(hass, notify_service="mobile_app_iphone")
    hass.states.async_set("binary_sensor.plug", "on")
    await hass.async_block_till_done()
    await _run(hass, freezer, 600)
    sent = len(calls)
    assert sent == 2
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    await _run(hass, freezer, 300)
    assert len(calls) == sent


async def test_disabled_notification_still_fires_event(hass, freezer):
    calls = async_mock_service(hass, "notify", "mobile_app_iphone")
    await _notify_entry(hass, notify_service="mobile_app_iphone", notifications=["unplugged"])
    ev = await _capture(hass)
    await _full_cycle(hass, freezer)
    assert [c.data["title"] for c in calls] == ["Twingo unplugged"]
    assert [e.event_type for e in ev] == list(EVENTS)


async def test_missing_notify_service_does_not_lose_the_session(hass, freezer):
    entry = await _notify_entry(hass, notify_service="mobile_app_gone")
    ev = await _capture(hass)
    await _full_cycle(hass, freezer)
    assert len(entry.runtime_data.store.sessions) == 1
    assert ev[-1].event_type == "charge_board_unplugged"


async def test_no_phone_sends_nothing_but_fires_events(hass, freezer):
    calls = async_mock_service(hass, "notify", "mobile_app_iphone")
    await _notify_entry(hass)
    ev = await _capture(hass)
    await _full_cycle(hass, freezer)
    assert calls == []
    assert len(ev) == 3


async def test_a_failing_text_still_fires_the_event(hass, freezer, monkeypatch):
    from custom_components.charge_board import hub as hub_module

    def boom(*args):
        raise ValueError("bad text")

    monkeypatch.setattr(hub_module, "plugged_text", boom)
    async_mock_service(hass, "notify", "mobile_app_iphone")
    await _notify_entry(hass, notify_service="mobile_app_iphone")
    ev = await _capture(hass)
    await _full_cycle(hass, freezer)
    assert [e.event_type for e in ev] == list(EVENTS)


async def test_restart_with_plug_unavailable_first_sends_nothing(hass, freezer):
    calls = async_mock_service(hass, "notify", "mobile_app_iphone")
    entry = await _notify_entry(hass, notify_service="mobile_app_iphone")
    hass.states.async_set("binary_sensor.plug", "on")
    await hass.async_block_till_done()
    await _run(hass, freezer, 600)
    sent = len(calls)
    await hass.config_entries.async_unload(entry.entry_id)
    hass.states.async_set("binary_sensor.plug", "unavailable")  # as at every HA start
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    await _run(hass, freezer, 60)
    hass.states.async_set("binary_sensor.plug", "on")
    await hass.async_block_till_done()
    await _run(hass, freezer, 300)
    assert len(calls) == sent
    cid = next(iter(entry.runtime_data.chargers))
    assert entry.runtime_data.live(cid)["session"]  # the session is still the same open one


# --- Fuel price, odometer, target source ----------------------------------------------------


async def test_closed_session_freezes_fuel_price_and_reference(hass, freezer):
    hass.states.async_set("sensor.p", "2200", {"unit_of_measurement": "W"})
    hass.states.async_set("binary_sensor.plug", "on")
    hass.states.async_set("sensor.km", "577")
    entry = MockConfigEntry(
        domain="charge_board",
        options={"off_peak_price": 0.2, "peak_price": 0.2, "fuel_price": 1.86},
        subentries_data=[
            {"data": CHARGER, "subentry_type": "charger", "title": "Dé", "unique_id": None},
            {
                "data": {**VEHICLE, "odometer_entity": "sensor.km", "fuel_l100": 6},
                "subentry_type": "vehicle",
                "title": "Twingo",
                "unique_id": None,
            },
        ],
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    await _run(hass, freezer, 600)
    hass.states.async_set("sensor.p", "0", {"unit_of_measurement": "W"})
    freezer.tick(5)
    hass.states.async_set("binary_sensor.plug", "off")
    await hass.async_block_till_done()
    (s,) = entry.runtime_data.store.sessions
    assert (s.fuel_price, s.fuel_l100) == (1.86, 6)
    assert s.odometer_start == s.odometer_end == 577


async def test_target_source_defaults(hass, setup):
    entry, _cid = setup
    hub = entry.runtime_data
    twingo, zoe = (s.subentry_id for s in entry.subentries.values() if s.subentry_type == "vehicle")
    hub.vehicles[twingo]["target_entity"] = "number.target"
    assert hub.target_source(twingo) == "vehicle"
    assert hub.target_source(zoe) == "home"
    hub.vehicles[twingo]["target_source"] = "home"
    assert hub.target_source(twingo) == "home"


async def test_fuel_price_prefers_the_entity(hass, setup):
    entry, _cid = setup
    hub = entry.runtime_data
    assert hub.fuel_price() is None
    hub.options["fuel_price"] = 1.9
    assert hub.fuel_price() == 1.9
    hub.options["fuel_price_entity"] = "sensor.station"
    hass.states.async_set("sensor.station", "1.789")
    assert hub.fuel_price() == 1.789


async def test_consumption_sensor_after_a_session(hass, freezer):
    hass.states.async_set("sensor.p", "0", {"unit_of_measurement": "W"})
    hass.states.async_set("binary_sensor.plug", "off")
    hass.states.async_set("sensor.soc", "80")
    hass.states.async_set("sensor.km", "100")
    entry = MockConfigEntry(
        domain="charge_board",
        subentries_data=[
            {"data": CHARGER, "subentry_type": "charger", "title": "Dé", "unique_id": None},
            {
                "data": {**VEHICLE, "odometer_entity": "sensor.km"},
                "subentry_type": "vehicle",
                "title": "Twingo",
                "unique_id": None,
            },
        ],
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    hub = entry.runtime_data
    vid = next(iter(hub.vehicles))
    from custom_components.charge_board.model import Session

    await hub.store.async_add(
        Session(
            id="s",
            charger_id="c",
            vehicle_id=vid,
            charge_start=1.0,
            energy_kwh=5,
            soc_end=80,
            odometer_end=100,
        )
    )
    await hass.async_block_till_done()
    state = hass.states.get("sensor.twingo_consommation_recharge")
    assert state.state == "unavailable"
    hass.states.async_set("sensor.soc", "60")
    hass.states.async_set("sensor.km", "140")
    await hass.async_block_till_done()
    state = hass.states.get("sensor.twingo_consommation_recharge")
    assert float(state.state) == pytest.approx(13.75)
    assert state.attributes["unit_of_measurement"] == "kWh/100km"


# --- Home objective -------------------------------------------------------------------------


async def _home_entry(hass):
    hass.states.async_set("sensor.p", "2200", {"unit_of_measurement": "W"})
    hass.states.async_set("binary_sensor.plug", "on")
    hass.states.async_set("sensor.soc", "70")
    hass.states.async_set("switch.x", "on")
    entry = MockConfigEntry(
        domain="charge_board",
        subentries_data=[
            {
                "data": {**CHARGER, "switch_entity": "switch.x"},
                "subentry_type": "charger",
                "title": "Dé",
                "unique_id": None,
            },
            {
                "data": {**VEHICLE, "target_fixed": 80, "target_source": "home"},
                "subentry_type": "vehicle",
                "title": "Twingo",
                "unique_id": None,
            },
        ],
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_home_target_cuts_then_restores_at_unplug(hass, freezer):
    off = async_mock_service(hass, "switch", "turn_off")
    on = async_mock_service(hass, "switch", "turn_on")
    reached = []
    hass.bus.async_listen("charge_board_target_reached", reached.append)
    await _home_entry(hass)
    await _run(hass, freezer, 120)
    assert off == []
    hass.states.async_set("sensor.soc", "80")
    await _run(hass, freezer, 60)
    assert len(off) == 1 and off[0].data["entity_id"] == "switch.x"
    assert reached[0].data["target"] == 80
    hass.states.async_set("switch.x", "on")  # turned back on by hand
    await _run(hass, freezer, 120)
    assert len(off) == 1
    freezer.tick(5)
    hass.states.async_set("binary_sensor.plug", "off")
    await hass.async_block_till_done()
    assert len(on) == 1


async def test_cut_survives_a_reload(hass, freezer):
    async_mock_service(hass, "switch", "turn_off")
    on = async_mock_service(hass, "switch", "turn_on")
    entry = await _home_entry(hass)
    hass.states.async_set("sensor.soc", "85")
    await _run(hass, freezer, 60)
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    freezer.tick(5)
    hass.states.async_set("binary_sensor.plug", "off")
    await hass.async_block_till_done()
    await _run(hass, freezer, 30)
    assert len(on) == 1


async def test_vehicle_target_never_cuts(hass, setup, freezer):
    off = async_mock_service(hass, "switch", "turn_off")
    entry, cid = setup
    hub = entry.runtime_data
    hub.chargers[cid]["switch_entity"] = "switch.x"
    hub.vehicles[hub.vehicle_for(cid)]["target_source"] = "vehicle"
    hass.states.async_set("sensor.soc", "100")
    await _run(hass, freezer, 60)
    assert off == []
