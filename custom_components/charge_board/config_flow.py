from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import DOMAIN


class ChargeBoardConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None) -> ConfigFlowResult:
        return self.async_create_entry(title="Charge Board", data={})
