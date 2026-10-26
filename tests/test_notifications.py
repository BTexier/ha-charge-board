from custom_components.charge_board.model import Session, TariffSlice
from custom_components.charge_board.notifications import plugged_text, started_text, summary_text


def night_session(**kw):
    base = {
        "id": "s",
        "charger_id": "c",
        "plugged_at": 0,
        "charge_start": 100,
        "unplugged_at": 13 * 3600 + 33 * 60,
        "charging_s": 6 * 3600 + 55 * 60,
        "energy_kwh": 15.4758,
        "cost": 2.1113,
        "off_peak": TariffSlice(15.0458, 2.04),
        "peak": TariffSlice(0.43, 0.07),
        "has_off_peak_source": True,
        "soc_start": 37,
        "soc_end": 93,
    }
    base.update(kw)
    return Session(**base)


def test_plugged_fr():
    assert plugged_text("fr", "Chargeur garage", "Twingo", 37, 80) == (
        "Twingo branchée",
        "Sur Chargeur garage · batterie 37 % → objectif 80 %",
    )


def test_plugged_without_level_or_vehicle():
    assert plugged_text("fr", "Chargeur garage", None, None, None) == (
        "Véhicule branché",
        "Sur Chargeur garage",
    )


def test_started_en():
    assert started_text("en", "Garage", "Twingo", 37.4) == (
        "Charging started",
        "Twingo on Garage · battery 37%",
    )


def test_summary_fr():
    assert summary_text("fr", "Chargeur garage", "Twingo", night_session(), "EUR") == (
        "Twingo débranchée",
        (
            "15,5 kWh · 2,11 €\n97 % en heures creuses\nBatterie 37 % → 93 %\n"
            "Charge 6 h 55 · branchée 13 h 33"
        ),
    )


def test_summary_degraded_and_gap_closed():
    s = night_session(
        unplugged_at=None,
        cost=None,
        estimated=True,
        has_off_peak_source=False,
        soc_start=None,
        soc_end=None,
        charging_s=45 * 60,
    )
    assert summary_text("en", "Garage", None, s, "EUR") == (
        "Charging finished",
        "15.5 kWh (estimated)\nCharged 45 min",
    )
