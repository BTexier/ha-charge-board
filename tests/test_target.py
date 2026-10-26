import pytest

from custom_components.charge_board.target import should_cut

OK = {
    "source": "home",
    "has_plug": True,
    "has_switch": True,
    "plugged": True,
    "soc": 80,
    "target": 80,
    "already_cut": False,
}


def test_nominal_cut():
    assert should_cut(**OK) is True


@pytest.mark.parametrize(
    "change",
    [
        {"source": "vehicle"},
        {"has_plug": False},
        {"has_switch": False},
        {"plugged": False},
        {"plugged": None},
        {"soc": None},
        {"target": None},
        {"soc": 79},
        {"already_cut": True},
    ],
)
def test_no_cut(change):
    assert should_cut(**{**OK, **change}) is False
