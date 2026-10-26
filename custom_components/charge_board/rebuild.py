"""Merge sessions rebuilt from Home Assistant's history with the recorded ones (pure)."""

from __future__ import annotations

from .model import Session

# A rebuilt session replaces recorded ones only if it holds clearly more energy.
REPLACE_MARGIN_KWH = 0.1


def _span(s: Session) -> tuple[float, float]:
    start = s.charge_start or s.plugged_at or 0.0
    return start, s.unplugged_at or s.charge_end or start


def _overlap(a: Session, b: Session) -> bool:
    (a0, a1), (b0, b1) = _span(a), _span(b)
    return a0 <= b1 and b0 <= a1


def merge_rebuilt(
    recorded: list[Session], rebuilt: list[Session], busy_from: float | None = None
) -> tuple[list[str], list[Session]]:
    """Ids of recorded sessions to remove and rebuilt sessions to add.

    A rebuilt session is added where nothing was recorded, and replaces the recorded sessions
    it overlaps only if it holds clearly more energy (e.g. recording started mid-charge) and none of
    them was corrected by hand. Rebuilt sessions reaching the live tracker's open session
    (`busy_from`) are skipped.
    """
    removed: list[str] = []
    added: list[Session] = []
    for r in rebuilt:
        if busy_from is not None and _span(r)[1] >= busy_from:
            continue
        hits = [s for s in recorded if _overlap(r, s)]
        if not hits:
            added.append(r)
        elif (
            not any(s.edited for s in hits)
            and r.energy_kwh > sum(s.energy_kwh for s in hits) + REPLACE_MARGIN_KWH
        ):
            removed += [s.id for s in hits]
            added.append(r)
    return removed, added
