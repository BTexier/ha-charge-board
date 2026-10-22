"""Pure corrections on finished sessions (no Home Assistant imports)."""

from __future__ import annotations

from dataclasses import replace

from .const import CURVE_WINDOW_MAX_S
from .model import CurvePoint, Session, TariffSlice


def _add(a: float | None, b: float | None) -> float | None:
    return None if a is None or b is None else a + b


def _scale(v: float | None, r: float) -> float | None:
    return None if v is None else v * r


def _slice_add(a: TariffSlice, b: TariffSlice) -> TariffSlice:
    return TariffSlice(a.kwh + b.kwh, _add(a.cost, b.cost))


def _slice_scale(s: TariffSlice, r: float) -> TariffSlice:
    return TariffSlice(s.kwh * r, _scale(s.cost, r))


def change_vehicle(s: Session, vehicle_id: str) -> Session:
    return replace(s, vehicle_id=vehicle_id, edited=True)


def merge_sessions(a: Session, b: Session) -> Session:
    if a.open or b.open:
        raise ValueError("cannot merge an open session")
    if a.charger_id != b.charger_id:
        raise ValueError("sessions belong to different chargers")
    old, new = sorted((a, b), key=lambda s: s.charge_start or 0.0)
    by_price = {k: replace(v) for k, v in old.by_price.items()}
    for k, v in new.by_price.items():
        by_price[k] = _slice_add(by_price[k], v) if k in by_price else replace(v)
    return replace(
        old,
        plugged_at=old.plugged_at,
        charge_end=new.charge_end,
        unplugged_at=new.unplugged_at,
        soc_end=new.soc_end,
        charging_s=old.charging_s + new.charging_s,
        energy_kwh=old.energy_kwh + new.energy_kwh,
        cost=_add(old.cost, new.cost),
        off_peak=_slice_add(old.off_peak, new.off_peak),
        peak=_slice_add(old.peak, new.peak),
        by_price=by_price,
        has_off_peak_source=old.has_off_peak_source and new.has_off_peak_source,
        curve=sorted((replace(p) for p in old.curve + new.curve), key=lambda p: p.t),
        estimated=old.estimated or new.estimated,
        edited=True,
    )


def _curve_split(
    s: Session, at: float
) -> tuple[list[CurvePoint], list[CurvePoint], dict[bool | None, list[float]]]:
    """Cut the curve at `at`; return both halves and their energy (kWh) per off-peak flag:
    {flag: [left, right]}."""
    left: list[CurvePoint] = []
    right: list[CurvePoint] = []
    energy: dict[bool | None, list[float]] = {True: [0.0, 0.0], False: [0.0, 0.0], None: [0.0, 0.0]}
    for i, p in enumerate(s.curve):
        end = s.curve[i + 1].t if i + 1 < len(s.curve) else (s.charge_end or p.t)
        end = max(min(end, p.t + CURVE_WINDOW_MAX_S), p.t)
        e = energy[p.off_peak]
        if end <= at:
            left.append(replace(p))
            e[0] += p.w * (end - p.t) / 3.6e6
        elif p.t >= at:
            right.append(replace(p))
            e[1] += p.w * (end - p.t) / 3.6e6
        else:  # straddles the cut: split proportionally
            left.append(replace(p))
            right.append(replace(p, t=at))
            e[0] += p.w * (at - p.t) / 3.6e6
            e[1] += p.w * (end - at) / 3.6e6
    return left, right, energy


def _price_shares(s: Session, f_off: float, f_peak: float, r: float) -> dict[str, float]:
    """Left share of each by_price entry. Prices are not stored per curve point, so each entry
    is attributed to the tariff slices assuming the cheapest prices filled the off-peak slice
    first (true for HC/HP and Tempo), then split like those slices."""
    room = s.off_peak.kwh
    shares = {}
    for k in sorted(s.by_price, key=lambda k: float("inf") if k == "none" else float(k)):
        kwh = s.by_price[k].kwh
        off = min(kwh, max(room, 0.0))
        room -= off
        shares[k] = (off * f_off + (kwh - off) * f_peak) / kwh if kwh > 0 else r
    return shares


def split_session(s: Session, at: float, new_id: str) -> tuple[Session, Session]:
    """Energy and duration split along the curve; each tariff slice along the curve points of
    that slice (points of unknown tariff count with the session's global off-peak share), its
    cost at the slice's average price."""
    if s.open:
        raise ValueError("cannot split an open session")
    if s.charge_start is None or s.charge_end is None or not s.charge_start < at < s.charge_end:
        raise ValueError("split point outside the charge window")
    left, right, energy = _curve_split(s, at)
    e_left = sum(e[0] for e in energy.values())
    total = e_left + sum(e[1] for e in energy.values())
    if total > 0:
        r = e_left / total
    else:
        r = (at - s.charge_start) / (s.charge_end - s.charge_start)
    sliced = s.off_peak.kwh + s.peak.kwh
    g = s.off_peak.kwh / sliced if sliced else 0.0

    def left_share(flag: bool, weight: float) -> float:
        side = [energy[flag][i] + energy[None][i] * weight for i in (0, 1)]
        return side[0] / sum(side) if sum(side) > 0 else r

    f_off, f_peak = left_share(True, g), left_share(False, 1 - g)
    shares = _price_shares(s, f_off, f_peak, r)

    def part(left_side: bool, **kw) -> dict:
        def f(x: float) -> float:
            return x if left_side else 1 - x

        off, peak = _slice_scale(s.off_peak, f(f_off)), _slice_scale(s.peak, f(f_peak))
        cost = None if s.cost is None else (off.cost or 0.0) + (peak.cost or 0.0)
        return dict(
            charging_s=s.charging_s * f(r),
            energy_kwh=s.energy_kwh * f(r),
            cost=cost,
            off_peak=off,
            peak=peak,
            by_price={k: _slice_scale(v, f(shares[k])) for k, v in s.by_price.items()},
            edited=True,
            **kw,
        )

    a = replace(s, **part(True, charge_end=at, unplugged_at=None, soc_end=None, curve=left))
    b = replace(
        s, **part(False, id=new_id, charge_start=at, plugged_at=None, soc_start=None, curve=right)
    )
    return a, b
