from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    ConfigSubentryFlow,
    OptionsFlow,
    SubentryFlowResult,
)
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import (
    DEFAULT_GAP_HOURS,
    DEFAULT_POWER_THRESHOLD_W,
    DEFAULT_TARGET,
    DOMAIN,
    OVERVIEW_STYLES,
    SUBENTRY_CHARGER,
    SUBENTRY_VEHICLE,
)
from .hub import parse_windows


def _entity(*domains: str) -> selector.EntitySelector:
    return selector.EntitySelector(selector.EntitySelectorConfig(domain=list(domains)))


def _number(step: float | str, unit: str | None = None, max_: float = 100_000):
    config = selector.NumberSelectorConfig(min=0, max=max_, step=step, mode="box")
    if unit:
        config["unit_of_measurement"] = unit
    return selector.NumberSelector(config)


CHARGER_SCHEMA = vol.Schema(
    {
        vol.Required("name"): str,
        vol.Required("power_entity"): _entity("sensor"),
        vol.Optional("energy_entity"): _entity("sensor"),
        vol.Optional("plug_entity"): _entity("binary_sensor", "sensor"),
        vol.Optional("plugged_states", default=[]): selector.TextSelector(
            selector.TextSelectorConfig(multiple=True)
        ),
        vol.Optional("switch_entity"): _entity("switch"),
        vol.Optional("power_threshold_w", default=DEFAULT_POWER_THRESHOLD_W): _number(1, "W"),
        vol.Optional("gap_hours", default=DEFAULT_GAP_HOURS): _number(0.5, "h", 48),
    }
)

VEHICLE_SCHEMA = vol.Schema(
    {
        vol.Required("name"): str,
        vol.Required("capacity_kwh"): _number(0.1, "kWh", 500),
        vol.Optional("soc_entity"): _entity("sensor"),
        vol.Optional("target_entity"): _entity("number", "input_number", "sensor"),
        vol.Optional("target_fixed", default=DEFAULT_TARGET): _number(1, "%", 100),
    }
)

OPTIONS_SCHEMA = vol.Schema(
    {
        vol.Optional("price_entity"): _entity("sensor", "input_number"),
        vol.Optional("off_peak_price"): _number("any", max_=10),
        vol.Optional("peak_price"): _number("any", max_=10),
        vol.Optional("off_peak_entity"): _entity("binary_sensor", "input_boolean"),
        vol.Optional("off_peak_windows"): str,
        vol.Optional("overview_style", default="detailed"): selector.SelectSelector(
            selector.SelectSelectorConfig(options=OVERVIEW_STYLES, translation_key="overview_style")
        ),
    }
)


class ChargeBoardConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None) -> ConfigFlowResult:
        return self.async_create_entry(title="Charge Board", data={})

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return TariffOptionsFlow()

    @classmethod
    @callback
    def async_get_supported_subentry_types(
        cls, config_entry: ConfigEntry
    ) -> dict[str, type[ConfigSubentryFlow]]:
        return {SUBENTRY_CHARGER: ChargerSubentryFlow, SUBENTRY_VEHICLE: VehicleSubentryFlow}


class TariffOptionsFlow(OptionsFlow):
    """Tariff and overview style; the update listener reloads the entry."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors = {}
        if user_input is not None:
            if parse_windows(user_input.get("off_peak_windows", "")) is None:
                errors["off_peak_windows"] = "invalid_windows"
            else:
                return self.async_create_entry(data=user_input)
        schema = self.add_suggested_values_to_schema(
            OPTIONS_SCHEMA, user_input or self.config_entry.options
        )
        return self.async_show_form(step_id="init", data_schema=schema, errors=errors)


class _SimpleSubentryFlow(ConfigSubentryFlow):
    schema: vol.Schema

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> SubentryFlowResult:
        if user_input is not None:
            return self.async_create_entry(title=user_input["name"], data=user_input)
        return self.async_show_form(step_id="user", data_schema=self.schema)

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Edit in place: the subentry id is the charger / vehicle id of its sessions."""
        subentry = self._get_reconfigure_subentry()
        if user_input is not None:
            # The update listener reloads the entry (trackers are saved and restored).
            return self.async_update_and_abort(
                self._get_entry(), subentry, title=user_input["name"], data=user_input
            )
        schema = self.add_suggested_values_to_schema(self.schema, subentry.data)
        return self.async_show_form(step_id="reconfigure", data_schema=schema)


class ChargerSubentryFlow(_SimpleSubentryFlow):
    schema = CHARGER_SCHEMA


class VehicleSubentryFlow(_SimpleSubentryFlow):
    schema = VEHICLE_SCHEMA
