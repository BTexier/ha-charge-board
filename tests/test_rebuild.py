from custom_components.charge_board.model import Session
from custom_components.charge_board.rebuild import merge_rebuilt


def sess(sid, start, end, kwh, edited=False):
    return Session(
        id=sid,
        charger_id="c",
        charge_start=start,
        charge_end=end,
        unplugged_at=end,
        energy_kwh=kwh,
        edited=edited,
    )


def test_new_sessions_are_added():
    removed, added = merge_rebuilt([sess("a", 0, 10, 5)], [sess("r", 20, 30, 4)])
    assert removed == [] and [s.id for s in added] == ["r"]


def test_a_more_complete_rebuild_replaces_a_partial_session():
    removed, added = merge_rebuilt([sess("a", 5, 10, 15.5)], [sess("r", 0, 10, 17.95)])
    assert removed == ["a"] and [s.id for s in added] == ["r"]


def test_a_less_complete_rebuild_keeps_the_recorded_session():
    removed, added = merge_rebuilt([sess("a", 0, 10, 15.5)], [sess("r", 2, 10, 12.0)])
    assert removed == [] and added == []


def test_an_edited_session_is_never_replaced():
    removed, added = merge_rebuilt([sess("a", 5, 10, 1.0, edited=True)], [sess("r", 0, 10, 17.95)])
    assert removed == [] and added == []


def test_the_open_session_window_is_left_alone():
    _removed, added = merge_rebuilt([], [sess("r", 0, 10, 3)], busy_from=8)
    assert added == []


def test_a_rounding_difference_does_not_replace_a_recorded_session():
    removed, added = merge_rebuilt([sess("a", 0, 10, 15.50)], [sess("r", 0, 10, 15.55)])
    assert removed == [] and added == []
