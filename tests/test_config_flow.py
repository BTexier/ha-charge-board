from homeassistant.config_entries import SOURCE_USER
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_mock_service


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


async def test_reconfigure_charger_keeps_its_id(hass):
    from homeassistant.config_entries import SOURCE_RECONFIGURE

    entry = MockConfigEntry(
        domain="charge_board",
        subentries_data=[
            {
                "data": {"name": "Dé", "power_entity": "sensor.p", "power_threshold_w": 100},
                "subentry_type": "charger",
                "title": "Dé",
                "unique_id": None,
            }
        ],
    )
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    (sid,) = entry.subentries
    result = await hass.config_entries.subentries.async_init(
        (entry.entry_id, "charger"), context={"source": SOURCE_RECONFIGURE, "subentry_id": sid}
    )
    assert result["type"] is FlowResultType.FORM and result["step_id"] == "reconfigure"
    result = await hass.config_entries.subentries.async_configure(
        result["flow_id"],
        {"name": "Dé 2", "power_entity": "sensor.p", "power_threshold_w": 300},
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reconfigure_successful"
    await hass.async_block_till_done()
    assert list(entry.subentries) == [sid]
    assert entry.subentries[sid].data["power_threshold_w"] == 300
    assert entry.subentries[sid].title == "Dé 2"


async def test_options_flow_lists_phones_and_stores_notifications(hass):
    async_mock_service(hass, "notify", "mobile_app_iphone")
    async_mock_service(hass, "notify", "persistent_notification")
    entry = MockConfigEntry(domain="charge_board")
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    phones = result["data_schema"].schema["notify_service"].config["options"]
    assert phones == ["mobile_app_iphone"]
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"notify_service": "mobile_app_iphone", "notifications": ["unplugged"]}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert entry.options["notify_service"] == "mobile_app_iphone"
    assert entry.options["notifications"] == ["unplugged"]


async def test_options_flow_keeps_a_phone_that_left_home_assistant(hass):
    entry = MockConfigEntry(domain="charge_board", options={"notify_service": "mobile_app_old"})
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], {"notify_service": "mobile_app_old", "peak_price": 0.2}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY


async def test_vehicle_flow_accepts_odometer_fuel_and_source(hass):
    entry = MockConfigEntry(domain="charge_board")
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    data = {
        "name": "Twingo",
        "capacity_kwh": 27.5,
        "odometer_entity": "sensor.twingo_km",
        "fuel_l100": 6,
        "target_source": "vehicle",
    }
    await _subentry(hass, entry, "vehicle", data)
    (sub,) = entry.subentries.values()
    assert {k: sub.data[k] for k in data} == data
