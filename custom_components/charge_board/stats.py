"""Monthly statistics and consumption (pure, no Home Assistant imports)."""

from __future__ import annotations

from datetime import datetime, tzinfo

from .model import Session


def local_month(t: float, tz: tzinfo) -> str:
    return datetime.fromtimestamp(t, tz).strftime("%Y-%m")


def _start(s: Session) -> float:
    return s.charge_start or s.plugged_at or 0.0


def _weighted(sessions: list[Session], attr: str) -> float | None:
    """kWh-weighted mean of a per-session value, over the sessions that have it."""
    pairs = [(getattr(s, attr), s.energy_kwh) for s in sessions if getattr(s, attr) is not None]
    weight = sum(w for _, w in pairs)
    return sum(v * w for v, w in pairs) / weight if weight > 0 else None


def _ratios(row: dict) -> None:
    """Per-100-km cost, petrol cost and savings; None as soon as a term is missing."""
    km, cost = row["km"], row["cost"]
    row["cost_per_100km"] = cost / km * 100 if km and cost is not None else None
    price, l100 = row["fuel_price"], row["fuel_l100"]
    fuel = km * l100 / 100 * price if km and price is not None and l100 is not None else None
    row["fuel_cost"] = fuel
    row["savings"] = fuel - cost if fuel is not None and cost is not None else None


def _row(month: str, sessions: list[Session], km: float | None) -> dict:
    priced = [s for s in sessions if s.cost is not None]
    sourced = [s for s in sessions if s.has_off_peak_source]
    sourced_kwh = sum(s.energy_kwh for s in sourced)
    row = {
        "month": month,
        "sessions": len(sessions),
        "energy_kwh": sum(s.energy_kwh for s in sessions),
        "cost": sum(s.cost for s in priced) if priced else None,
        "unpriced": len(sessions) - len(priced),
        "off_peak_share": (
            sum(s.off_peak.kwh for s in sourced) / sourced_kwh if sourced_kwh > 0 else None
        ),
        "off_peak_cost": sum(s.off_peak.cost or 0.0 for s in priced),
        "peak_cost": sum(s.peak.cost or 0.0 for s in priced),
        "km": km,
        "fuel_price": _weighted(sessions, "fuel_price"),
        "fuel_l100": _weighted(sessions, "fuel_l100"),
    }
    _ratios(row)
    return row


def month_rows(
    sessions: list[Session], months: list[str], km: dict[str, float | None], tz: tzinfo
) -> list[dict]:
    """One row per "YYYY-MM" month; a session belongs to the local month of its start."""
    by_month: dict[str, list[Session]] = {m: [] for m in months}
    for s in sessions:
        month = local_month(_start(s), tz)
        if month in by_month:
            by_month[month].append(s)
    return [_row(m, by_month[m], km.get(m)) for m in months]


def total_row(rows: list[dict]) -> dict:
    """Sums of the rows; km only when every month has them, ratios recomputed on the sums."""
    priced = [r["cost"] for r in rows if r["cost"] is not None]
    energy = sum(r["energy_kwh"] for r in rows)
    shared = [r for r in rows if r["off_peak_share"] is not None]
    shared_kwh = sum(r["energy_kwh"] for r in shared)
    fuel_rows = [r for r in rows if r["fuel_price"] is not None]
    fuel_kwh = sum(r["energy_kwh"] for r in fuel_rows)

    def mean(key: str) -> float | None:
        rows_ = [r for r in fuel_rows if r[key] is not None]
        kwh = sum(r["energy_kwh"] for r in rows_)
        return sum(r[key] * r["energy_kwh"] for r in rows_) / kwh if kwh > 0 else None

    total = {
        "month": None,
        "sessions": sum(r["sessions"] for r in rows),
        "energy_kwh": energy,
        "cost": sum(priced) if priced else None,
        "unpriced": sum(r["unpriced"] for r in rows),
        "off_peak_share": (
            sum(r["off_peak_share"] * r["energy_kwh"] for r in shared) / shared_kwh
            if shared_kwh > 0
            else None
        ),
        "off_peak_cost": sum(r["off_peak_cost"] for r in rows),
        "peak_cost": sum(r["peak_cost"] for r in rows),
        "km": (
            sum(r["km"] for r in rows) if rows and all(r["km"] is not None for r in rows) else None
        ),
        "fuel_price": mean("fuel_price") if fuel_kwh > 0 else None,
        "fuel_l100": mean("fuel_l100") if fuel_kwh > 0 else None,
    }
    _ratios(total)
    # Savings of the year only when every month has its own (no extrapolated fuel price).
    for key in ("fuel_cost", "savings"):
        values = [r[key] for r in rows]
        total[key] = sum(values) if values and None not in values else None
    return total


MIN_KM_FOR_CONSUMPTION = 5


def consumption_since(
    soc_then: float | None,
    soc_now: float | None,
    km_then: float | None,
    km_now: float | None,
    capacity_kwh: float | None,
) -> float | None:
    """Battery-side kWh/100 km since a reference (the last unplug); None without a basis."""
    if None in (soc_then, soc_now, km_then, km_now, capacity_kwh):
        return None
    km = km_now - km_then
    used = (soc_then - soc_now) / 100 * capacity_kwh
    if km < MIN_KM_FOR_CONSUMPTION or used < 0:
        return None
    return used / km * 100
