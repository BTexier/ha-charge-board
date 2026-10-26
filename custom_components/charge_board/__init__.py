import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse
from homeassistant.helpers import config_validation as cv

from . import websocket_api
from .const import DOMAIN
from .hub import Hub
from .panel import async_register_panel, async_unregister_panel

PLATFORMS = [Platform.SELECT, Platform.SENSOR]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    websocket_api.async_register(hass)
    _async_register_services(hass)
    hub = Hub(hass, entry)
    await hub.async_start()
    entry.runtime_data = hub
    # Options or subentries changed: rebuild everything (trackers are saved and restored).
    entry.async_on_unload(entry.add_update_listener(_async_reload))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    hub.async_start_feeding()
    await async_register_panel(hass)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        await entry.runtime_data.async_stop()
        async_unregister_panel(hass)
    return unloaded


async def _async_reload(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


def _async_register_services(hass: HomeAssistant) -> None:
    """Once per hass: the action works on whichever entry is loaded."""
    if hass.services.has_service(DOMAIN, "rebuild_history"):
        return

    async def rebuild(call: ServiceCall) -> dict:
        entries = hass.config_entries.async_loaded_entries(DOMAIN)
        if not entries:
            return {"added": 0, "replaced": 0, "completed": 0}
        return await entries[0].runtime_data.async_rebuild_history(call.data.get("start"))

    hass.services.async_register(
        DOMAIN,
        "rebuild_history",
        rebuild,
        schema=vol.Schema({vol.Optional("start"): cv.datetime}),
        supports_response=SupportsResponse.OPTIONAL,
    )
