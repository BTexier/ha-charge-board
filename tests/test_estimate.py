import pytest

from custom_components.charge_board.estimate import estimate_end


def test_estimate_end():
    assert estimate_end(0, 40, 100, 27.5, 2200) == pytest.approx(16.5 / 2.2 * 3600)
    assert estimate_end(0, None, 100, 27.5, 2200) is None
    assert estimate_end(0, 100, 100, 27.5, 2200) is None
    assert estimate_end(0, 40, 100, 27.5, 0) is None
