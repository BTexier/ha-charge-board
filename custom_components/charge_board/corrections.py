"""Pure corrections on finished sessions (no Home Assistant imports)."""

from __future__ import annotations

from dataclasses import replace

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
        has_off_peak_source=old.has_off_peak_source or new.has_off_peak_source,
        curve=sorted((replace(p) for p in old.curve + new.curve), key=lambda p: p.t),
        estimated=old.estimated or new.estimated,
        edited=True,
    )


def _curve_split(s: Session, at: float) -> tuple[list[CurvePoint], list[CurvePoint], float, float]:
    """Cut the curve at `at`; return both halves and their energy (kWh)."""
    left: list[CurvePoint] = []
    right: list[CurvePoint] = []
    e_left = e_right = 0.0
    for i, p in enumerate(s.curve):
        end = s.curve[i + 1].t if i + 1 < len(s.curve) else (s.charge_end or p.t)
        end = max(end, p.t)
        if end <= at:
            left.append(replace(p))
            e_left += p.w * (end - p.t) / 3.6e6
        elif p.t >= at:
            right.append(replace(p))
            e_right += p.w * (end - p.t) / 3.6e6
        else:  # straddles the cut: split proportionally
            left.append(replace(p))
            right.append(CurvePoint(at, p.w))
            e_left += p.w * (at - p.t) / 3.6e6
            e_right += p.w * (end - at) / 3.6e6
    return left, right, e_left, e_right


def split_session(s: Session, at: float, new_id: str) -> tuple[Session, Session]:
    if s.open:
        raise ValueError("cannot split an open session")
    if s.charge_start is None or s.charge_end is None or not s.charge_start < at < s.charge_end:
        raise ValueError("split point outside the charge window")
    left, right, e_left, e_right = _curve_split(s, at)
    total = e_left + e_right
    if total > 0:
        r = e_left / total
    else:
        r = (at - s.charge_start) / (s.charge_end - s.charge_start)

    def part(ratio: float, **kw) -> dict:
        return dict(
            charging_s=s.charging_s * ratio,
            energy_kwh=s.energy_kwh * ratio,
            cost=_scale(s.cost, ratio),
            off_peak=_slice_scale(s.off_peak, ratio),
            peak=_slice_scale(s.peak, ratio),
            by_price={k: _slice_scale(v, ratio) for k, v in s.by_price.items()},
            edited=True,
            **kw,
        )

    a = replace(s, **part(r, charge_end=at, unplugged_at=None, soc_end=None, curve=left))
    b = replace(
        s, **part(1 - r, id=new_id, charge_start=at, plugged_at=None, soc_start=None, curve=right)
    )
    return a, b
