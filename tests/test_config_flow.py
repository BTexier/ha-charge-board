from homeassistant.config_entries import SOURCE_USER
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry


async def _subentry(hass, entry, kind, user_input):
    result = await hass.config_entries.subentries.async_init(
        (entry.entry_id, kind), context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.subentries.async_configure(result["flow_id"], user_input)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    return result


async def test_main_entry_then_charger_and_vehicle(hass):
    result = await hass.config_entries.flow.async_init(
        "charge_board", context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    entry = hass.config_entries.async_entries("charge_board")[0]
    await hass.async_block_till_done()

    await _subentry(hass, entry, "charger", {"name": "Dé", "power_entity": "sensor.charger_power"})
    await _subentry(
        hass,
        entry,
        "vehicle",
        {"name": "Twingo", "capacity_kwh": 27.5, "soc_entity": "sensor.twingo_battery"},
    )
    await hass.async_block_till_done()

    subs = {s.subentry_type: s for s in entry.subentries.values()}
    assert subs["charger"].title == "Dé"
    assert subs["charger"].data == {
        "name": "Dé",
        "power_entity": "sensor.charger_power",
        "plugged_states": [],
        "power_threshold_w": 100,
        "gap_hours": 3,
    }
    assert subs["vehicle"].title == "Twingo"
    assert subs["vehicle"].data == {
        "name": "Twingo",
        "capacity_kwh": 27.5,
        "soc_entity": "sensor.twingo_battery",
        "target_fixed": 100,
    }


async def test_options_flow_stores_tariff(hass):
    entry = MockConfigEntry(domain="charge_board")
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"price_entity": "sensor.price", "off_peak_windows": "22:00-06:00"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert entry.options == {
        "price_entity": "sensor.price",
        "off_peak_windows": "22:00-06:00",
        "overview_style": "detailed",
    }


async def test_options_flow_rejects_bad_windows(hass):
    entry = MockConfigEntry(domain="charge_board")
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"off_peak_windows": "22h-6h"}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"off_peak_windows": "invalid_windows"}
