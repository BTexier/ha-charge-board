"""Charging session data model (pure, no Home Assistant imports)."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field, fields


@dataclass
class TariffSlice:
    kwh: float = 0.0
    cost: float | None = None


@dataclass
class CurvePoint:
    t: float  # Unix seconds, start of the averaging window
    w: float  # mean power over the window


@dataclass
class Session:
    id: str
    charger_id: str
    vehicle_id: str | None = None
    plugged_at: float | None = None
    charge_start: float | None = None
    charge_end: float | None = None
    unplugged_at: float | None = None
    charging_s: float = 0.0
    energy_kwh: float = 0.0
    cost: float | None = None
    off_peak: TariffSlice = field(default_factory=TariffSlice)
    peak: TariffSlice = field(default_factory=TariffSlice)
    by_price: dict[str, TariffSlice] = field(default_factory=dict)  # "0.1356" or "none"
    has_off_peak_source: bool = False
    soc_start: float | None = None
    soc_end: float | None = None
    curve: list[CurvePoint] = field(default_factory=list)
    estimated: bool = False
    edited: bool = False
    open: bool = False

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> Session:
        known = {f.name for f in fields(cls)}
        d = {k: v for k, v in d.items() if k in known}
        for k in ("off_peak", "peak"):
            if k in d:
                d[k] = TariffSlice(**d[k])
        if "by_price" in d:
            d["by_price"] = {k: TariffSlice(**v) for k, v in d["by_price"].items()}
        if "curve" in d:
            d["curve"] = [CurvePoint(**p) for p in d["curve"]]
        return cls(**d)
