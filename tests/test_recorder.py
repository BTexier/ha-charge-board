"""Tests that need the recorder: it must be set up before hass, so this module
overrides the conftest autouse fixture to request it first."""

from datetime import UTC, datetime, timedelta

import pytest
from homeassistant.components.recorder.models import StatisticMeanType
from homeassistant.components.recorder.statistics import async_import_statistics
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.components.recorder.common import (
    async_wait_recording_done,
)

CHARGER = {"name": "Dé", "power_entity": "sensor.p", "power_threshold_w": 100, "gap_hours": 3}
VEHICLE = {"name": "Twingo", "capacity_kwh": 27.5, "target_fixed": 100}


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(recorder_mock, enable_custom_integrations):
    yield


async def test_km_by_month_marks_the_first_month_partial(hass):
    await hass.config.async_set_time_zone("UTC")
    hass.states.async_set("sensor.p", "0", {"unit_of_measurement": "W"})
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
    start = datetime(2026, 10, 13, tzinfo=UTC)
    rows = [
        {"start": start + timedelta(hours=h), "state": 100 + h, "sum": h} for h in range(24 * 40)
    ]
    async_import_statistics(
        hass,
        {
            "mean_type": StatisticMeanType.NONE,
            "unit_class": "distance",
            "has_sum": True,
            "name": None,
            "source": "recorder",
            "statistic_id": "sensor.km",
            "unit_of_measurement": "km",
        },
        rows,
    )
    await async_wait_recording_done(hass)
    vid = next(iter(entry.runtime_data.vehicles))
    km, partial = await entry.runtime_data.async_km_by_month(vid, ["2026-10", "2026-11"])
    assert km["2026-10"] == pytest.approx(18 * 24 + 23)  # since the first statistic (13 Oct)
    assert partial == {"2026-10"}
    assert km["2026-11"] == pytest.approx(24 * 21)  # last imported hour: 21 Nov 23:00
    # A period starting before the statistics: km since the first one, and from when.
    since = datetime(2026, 10, 1, tzinfo=UTC).timestamp()
    end = datetime(2026, 10, 20, tzinfo=UTC).timestamp()
    km_7d, covered_from = await entry.runtime_data.async_km_between(vid, since, end)
    assert covered_from == pytest.approx(start.timestamp())
    assert km_7d == pytest.approx(7 * 24 - 1)


async def test_rebuild_history_records_a_past_charge(hass, freezer):
    t0 = datetime(2026, 10, 20, 18, tzinfo=UTC)
    freezer.move_to(t0)
    timeline = [
        (0, {"binary_sensor.plug": "off", "sensor.p": "0"}),
        (60, {"binary_sensor.plug": "on"}),
        (120, {"sensor.p": "2200"}),
        (120 + 3600, {"sensor.p": "0"}),
        (180 + 3600, {"binary_sensor.plug": "off"}),
    ]
    for offset, states in timeline:
        freezer.move_to(t0 + timedelta(seconds=offset))
        for entity_id, state in states.items():
            attrs = {"unit_of_measurement": "W"} if entity_id == "sensor.p" else {}
            hass.states.async_set(entity_id, state, attrs)
        await hass.async_block_till_done()
    await async_wait_recording_done(hass)
    freezer.move_to(t0 + timedelta(hours=3))

    entry = MockConfigEntry(
        domain="charge_board",
        options={"off_peak_price": 0.2, "peak_price": 0.2},
        subentries_data=[
            {
                "data": {**CHARGER, "plug_entity": "binary_sensor.plug", "plugged_states": []},
                "subentry_type": "charger",
                "title": "Dé",
                "unique_id": None,
            },
            {"data": VEHICLE, "subentry_type": "vehicle", "title": "Twingo", "unique_id": None},
        ],
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.runtime_data.store.sessions == []

    result = await hass.services.async_call(
        "charge_board",
        "rebuild_history",
        {"start": t0.isoformat()},
        blocking=True,
        return_response=True,
    )
    assert result == {"added": 1, "replaced": 0, "completed": 0}
    (s,) = entry.runtime_data.store.sessions
    assert s.energy_kwh == pytest.approx(2.2, abs=0.05)
    assert s.cost == pytest.approx(0.44, abs=0.01)
    assert s.plugged_at == pytest.approx((t0 + timedelta(seconds=60)).timestamp(), abs=30)
    assert s.vehicle_id == next(iter(entry.runtime_data.vehicles))

    # Running it again changes nothing.
    again = await hass.services.async_call(
        "charge_board",
        "rebuild_history",
        {"start": t0.isoformat()},
        blocking=True,
        return_response=True,
    )
    assert again == {"added": 0, "replaced": 0, "completed": 0}
