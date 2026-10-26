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


async def test_km_by_month_marks_the_first_month_incomplete(hass):
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
    km = await entry.runtime_data.async_km_by_month(vid, ["2026-10", "2026-11"])
    assert km["2026-10"] is None
    assert km["2026-11"] == pytest.approx(24 * 21)  # last imported hour: 21 Nov 23:00
