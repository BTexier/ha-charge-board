import pytest
from homeassistant.core import State
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
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
