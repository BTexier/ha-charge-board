from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from .hub import ChargerEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback
) -> None:
    hub = entry.runtime_data
    for cid in hub.chargers:
        async_add_entities([VehicleSelect(hub, cid)], config_subentry_id=cid)


class VehicleSelect(ChargerEntity, SelectEntity, RestoreEntity):
    """Vehicle on this charger; options are vehicle names, the hub keeps vehicle ids.

    ponytail: two vehicles with the same name collide (the last one wins); names are unique in
    practice.
    """

    platform_domain = "select"
    _attr_icon = "mdi:car-electric"

    def __init__(self, hub, charger_id: str) -> None:
        super().__init__(hub, charger_id, "vehicle", "vehicule")
        self._ids = {v["name"]: vid for vid, v in hub.vehicles.items()}
        self._attr_options = list(self._ids)

    @property
    def current_option(self) -> str | None:
        vid = self.hub.vehicle_for(self.charger_id)
        return self.hub.vehicles[vid]["name"] if vid in self.hub.vehicles else None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        if last is not None and last.state in self._ids:
            self.hub.select_vehicle(self.charger_id, self._ids[last.state])

    async def async_select_option(self, option: str) -> None:
        self.hub.select_vehicle(self.charger_id, self._ids[option])
