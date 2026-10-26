"""When Charge Board stops a charge at a home objective (pure, no Home Assistant imports)."""

from __future__ import annotations


def should_cut(
    *,
    source: str,
    has_plug: bool,
    has_switch: bool,
    plugged: bool | None,
    soc: float | None,
    target: float | None,
    already_cut: bool,
) -> bool:
    """Only a home objective, with a plug entity (to switch back on at unplug) and a switch.

    The car's own objective is the car's business; without a plug entity the session would
    only close after the gap rule, then the switch would come back on with the car still
    plugged in: a cut / restart loop.
    """
    return (
        source == "home"
        and has_plug
        and has_switch
        and plugged is True
        and soc is not None
        and target is not None
        and soc >= target
        and not already_cut
    )
