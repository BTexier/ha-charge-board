from homeassistant.config_entries import ConfigEntryState
from pytest_homeassistant_custom_component.common import MockConfigEntry


async def test_entry_sets_up_and_unloads(hass):
    entry = MockConfigEntry(domain="charge_board")
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert entry.state is ConfigEntryState.NOT_LOADED


async def test_user_flow_creates_entry(hass):
    result = await hass.config_entries.flow.async_init("charge_board", context={"source": "user"})
    assert result["type"] == "create_entry"
    assert result["title"] == "EVChargeData"
    assert result["data"] == {}


async def test_panel_registered_while_loaded(hass):
    entry = MockConfigEntry(domain="charge_board")
    entry.add_to_hass(hass)
    for _ in range(2):  # a reload registers the panel again (static path only once)
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
        panel = hass.data["frontend_panels"]["charge-board"]
        assert panel.sidebar_title == "EVChargeData"
        assert panel.sidebar_icon == "mdi:ev-station"
        assert panel.config["_panel_custom"]["module_url"].startswith(
            "/charge_board/charge-board-panel.js?v="
        )
        assert await hass.config_entries.async_unload(entry.entry_id)
        assert "charge-board" not in hass.data["frontend_panels"]
