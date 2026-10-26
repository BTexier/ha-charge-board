from __future__ import annotations

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfEnergy
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import slugify

from .const import DOMAIN, SIGNAL_UPDATED
from .hub import ChargerEntity, Hub
from .stats import consumption_since


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddConfigEntryEntitiesCallback
) -> None:
    hub = entry.runtime_data
    for cid in hub.chargers:
        async_add_entities(
            [SessionEnergySensor(hub, cid), SessionCostSensor(hub, cid)], config_subentry_id=cid
        )
    for vid in hub.vehicles:
        async_add_entities([VehicleConsumptionSensor(hub, vid)], config_subentry_id=vid)


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


class VehicleConsumptionSensor(SensorEntity):
    """kWh/100 km since the last unplug, battery side (replaces a hand-made template)."""

    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_translation_key = "consumption_since_charge"
    _attr_native_unit_of_measurement = "kWh/100km"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_suggested_display_precision = 1

    def __init__(self, hub: Hub, vehicle_id: str) -> None:
        self.hub = hub
        self.vehicle_id = vehicle_id
        name = hub.vehicles[vehicle_id]["name"]
        self._attr_unique_id = f"{vehicle_id}_consumption_since_charge"
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, vehicle_id)}, name=name)
        self.entity_id = f"sensor.{slugify(name)}_consommation_recharge"

    @property
    def native_value(self) -> float | None:
        v = self.hub.vehicles[self.vehicle_id]
        last = self.hub.last_session_of(self.vehicle_id)
        if last is None:
            return None
        return consumption_since(
            last.soc_end,
            self.hub._number(v.get("soc_entity")),
            last.odometer_end,
            self.hub._number(v.get("odometer_entity")),
            v.get("capacity_kwh"),
        )

    @property
    def available(self) -> bool:
        return self.native_value is not None

    async def async_added_to_hass(self) -> None:
        v = self.hub.vehicles[self.vehicle_id]
        entities = [e for e in (v.get("soc_entity"), v.get("odometer_entity")) if e]
        self.async_on_remove(
            async_dispatcher_connect(self.hass, SIGNAL_UPDATED, self.async_write_ha_state)
        )
        if entities:
            self.async_on_remove(
                async_track_state_change_event(self.hass, entities, self._on_change)
            )

    @callback
    def _on_change(self, event: Event) -> None:
        self.async_write_ha_state()
