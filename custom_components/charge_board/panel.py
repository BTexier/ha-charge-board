"""Sidebar panel "Recharge"."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration

from .const import DOMAIN

URL_PATH = "charge-board"
JS_URL = f"/{DOMAIN}/charge-board-panel.js"


async def async_register_panel(hass: HomeAssistant) -> None:
    # Static paths cannot be unregistered: serve the file once per hass, across reloads.
    if not hass.data.setdefault(DOMAIN, {}).get("static"):
        js = Path(__file__).parent / "frontend" / "charge-board-panel.js"
        await hass.http.async_register_static_paths([StaticPathConfig(JS_URL, str(js), False)])
        hass.data[DOMAIN]["static"] = True
    version = (await async_get_integration(hass, DOMAIN)).version
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=URL_PATH,
        webcomponent_name="charge-board-panel",
        sidebar_title="Recharge",
        sidebar_icon="mdi:ev-station",
        module_url=f"{JS_URL}?v={version}",
        embed_iframe=False,
        require_admin=False,
    )


def async_unregister_panel(hass: HomeAssistant) -> None:
    frontend.async_remove_panel(hass, URL_PATH, warn_if_unknown=False)
