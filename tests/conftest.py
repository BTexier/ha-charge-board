from pathlib import Path

import pytest

import custom_components

# The test plugin ships its own `custom_components` package; make ours discoverable too.
custom_components.__path__.append(str(Path(__file__).parent.parent / "custom_components"))


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    yield
