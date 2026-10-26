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


def enrich(
    recorded: list[Session],
    rebuilt: list[Session],
    fuel_price: float | None,
    fuel_l100: dict[str | None, float | None],
) -> list[Session]:
    """Fill what a recorded session lacks, in place; return the sessions changed.

    The odometer comes from the rebuilt session it overlaps (read in the history); the petrol
    price is today's and the reference consumption the vehicle's current one.
    ponytail: no petrol price history exists, so past sessions get today's price.
    """
    changed = []
    for s in recorded:
        before = (s.odometer_start, s.odometer_end, s.fuel_price, s.fuel_l100)
        if s.odometer_start is None:
            twin = next(
                (r for r in rebuilt if _overlap(r, s) and r.odometer_start is not None), None
            )
            if twin is not None:
                s.odometer_start, s.odometer_end = twin.odometer_start, twin.odometer_end
        if s.fuel_price is None:
            s.fuel_price = fuel_price
        if s.fuel_l100 is None:
            s.fuel_l100 = fuel_l100.get(s.vehicle_id)
        if (s.odometer_start, s.odometer_end, s.fuel_price, s.fuel_l100) != before:
            changed.append(s)
    return changed
