from __future__ import annotations

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfEnergy
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .hub import ChargerEntity


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback
) -> None:
    hub = entry.runtime_data
    for cid in hub.chargers:
        async_add_entities(
            [SessionEnergySensor(hub, cid), SessionCostSensor(hub, cid)], config_subentry_id=cid
        )


class SessionEnergySensor(ChargerEntity, SensorEntity):
    platform_domain = "sensor"
    _attr_device_class = SensorDeviceClass.ENERGY
    _attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
    _attr_suggested_display_precision = 2

    def __init__(self, hub, charger_id: str) -> None:
        super().__init__(hub, charger_id, "session_energy", "energie_session")

    @property
    def native_value(self) -> float:
        return self.hub.live(self.charger_id)["energy_kwh"]


class SessionCostSensor(ChargerEntity, SensorEntity):
    platform_domain = "sensor"
    _attr_device_class = SensorDeviceClass.MONETARY
    _attr_suggested_display_precision = 2

    def __init__(self, hub, charger_id: str) -> None:
        super().__init__(hub, charger_id, "session_cost", "cout_session")
        self._attr_native_unit_of_measurement = hub.hass.config.currency

    @property
    def native_value(self) -> float | None:
        return self.hub.live(self.charger_id)["cost"]
