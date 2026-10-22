"""End-of-charge estimate (pure)."""

from __future__ import annotations


def estimate_end(
    now: float,
    soc: float | None,
    target: float | None,
    capacity_kwh: float | None,
    power_w: float | None,
) -> float | None:
    """Timestamp when the battery reaches `target`, at the current power; None if unknown."""
    if None in (soc, target, capacity_kwh, power_w) or power_w <= 0 or soc >= target:
        return None
    return now + (target - soc) / 100 * capacity_kwh / (power_w / 1000) * 3600
