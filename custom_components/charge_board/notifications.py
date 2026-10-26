"""Notification texts, French or English (pure, no Home Assistant imports)."""

from __future__ import annotations

from .model import Session

_TEXTS = {
    "fr": {
        "plugged": "{} branchée",
        "plugged_anon": "Véhicule branché",
        "on": "Sur {}",
        "level": "batterie {} %",
        "target": "objectif {} %",
        "started": "Charge démarrée",
        "vehicle_on": "{} sur {}",
        "unplugged": "{} débranchée",
        "unplugged_anon": "Véhicule débranché",
        "finished": "Charge terminée",
        "estimated": " (estimé)",
        "off_peak": "{} % en heures creuses",
        "battery": "Batterie {} % → {} %",
        "charged": "Charge {}",
        "plugged_for": "branchée {}",
    },
    "en": {
        "plugged": "{} plugged in",
        "plugged_anon": "Vehicle plugged in",
        "on": "On {}",
        "level": "battery {}%",
        "target": "target {}%",
        "started": "Charging started",
        "vehicle_on": "{} on {}",
        "unplugged": "{} unplugged",
        "unplugged_anon": "Vehicle unplugged",
        "finished": "Charging finished",
        "estimated": " (estimated)",
        "off_peak": "{}% off-peak",
        "battery": "Battery {}% → {}%",
        "charged": "Charged {}",
        "plugged_for": "plugged in {}",
    },
}


def _num(lang: str, value: float, decimals: int) -> str:
    text = f"{value:.{decimals}f}"
    return text.replace(".", ",") if lang == "fr" else text


def _pct(value: float) -> str:
    return str(round(value))


def _duration(seconds: float) -> str:
    minutes = round(seconds / 60)
    if minutes < 60:
        return f"{minutes} min"
    return f"{minutes // 60} h {minutes % 60:02d}"


def _join(*parts: str | None) -> str:
    return " · ".join(p for p in parts if p)


def plugged_text(
    lang: str, charger: str, vehicle: str | None, soc: float | None, target: float | None
) -> tuple[str, str]:
    t = _TEXTS[lang]
    title = t["plugged"].format(vehicle) if vehicle else t["plugged_anon"]
    level = t["level"].format(_pct(soc)) if soc is not None else None
    goal = t["target"].format(_pct(target)) if target is not None else None
    if level and goal:
        level, goal = f"{level} → {goal}", None
    return title, _join(t["on"].format(charger), level, goal)


def started_text(
    lang: str, charger: str, vehicle: str | None, soc: float | None
) -> tuple[str, str]:
    t = _TEXTS[lang]
    who = t["vehicle_on"].format(vehicle, charger) if vehicle else charger
    level = t["level"].format(_pct(soc)) if soc is not None else None
    return t["started"], _join(who, level)


def summary_text(
    lang: str, charger: str, vehicle: str | None, session: Session, currency: str
) -> tuple[str, str]:
    t = _TEXTS[lang]
    if session.unplugged_at is None:
        title = t["finished"]
    else:
        title = t["unplugged"].format(vehicle) if vehicle else t["unplugged_anon"]
    s = session
    cost = None
    if s.cost is not None:
        cost = f"{_num(lang, s.cost, 2)} {'€' if currency == 'EUR' else currency}"
    lines = [
        _join(f"{_num(lang, s.energy_kwh, 1)} kWh", cost) + (t["estimated"] if s.estimated else "")
    ]
    if s.has_off_peak_source and s.energy_kwh > 0:
        lines.append(t["off_peak"].format(_pct(s.off_peak.kwh / s.energy_kwh * 100)))
    if s.soc_start is not None and s.soc_end is not None:
        lines.append(t["battery"].format(_pct(s.soc_start), _pct(s.soc_end)))
    plugged_for = None
    if s.plugged_at is not None and s.unplugged_at is not None:
        plugged_for = t["plugged_for"].format(_duration(s.unplugged_at - s.plugged_at))
    lines.append(_join(t["charged"].format(_duration(s.charging_s)), plugged_for))
    return title, "\n".join(lines)
