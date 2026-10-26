from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

from custom_components.charge_board.model import Session, TariffSlice
from custom_components.charge_board.stats import month_rows, total_row

PARIS = ZoneInfo("Europe/Paris")


def ts(*args) -> float:
    return datetime(*args, tzinfo=PARIS).timestamp()


def s(start, kwh=10.0, cost=1.4, off_share=0.9, **kw):
    off = TariffSlice(kwh * off_share, None if cost is None else cost * off_share)
    peak = TariffSlice(kwh - off.kwh, None if cost is None else cost - off.cost)
    return Session(
        id=str(start),
        charger_id="c",
        vehicle_id="v",
        charge_start=start,
        charge_end=start + 3600,
        energy_kwh=kwh,
        cost=cost,
        off_peak=off,
        peak=peak,
        has_off_peak_source=True,
        **kw,
    )


OCT_10, OCT_20 = ts(2026, 10, 10, 22), ts(2026, 10, 20, 22)


def test_month_row_with_km_and_fuel():
    rows = month_rows(
        [s(OCT_10, fuel_price=1.80, fuel_l100=6), s(OCT_20, fuel_price=1.90, fuel_l100=6)],
        ["2026-10"],
        {"2026-10": 200.0},
        PARIS,
    )
    r = rows[0]
    assert r["sessions"] == 2
    assert r["cost"] == pytest.approx(2.8)
    assert r["off_peak_share"] == pytest.approx(0.9)
    assert r["off_peak_cost"] == pytest.approx(2.52)
    assert r["peak_cost"] == pytest.approx(0.28)
    assert r["fuel_price"] == pytest.approx(1.85)
    assert r["cost_per_100km"] == pytest.approx(1.4)
    assert r["savings"] == pytest.approx(200 * 6 / 100 * 1.85 - 2.8)


def test_old_sessions_without_fuel_show_no_comparison():
    r = month_rows([s(OCT_10)], ["2026-10"], {"2026-10": 200.0}, PARIS)[0]
    assert r["savings"] is None
    assert r["cost_per_100km"] == pytest.approx(0.7)


def test_incomplete_km_gives_no_ratio():
    r = month_rows([s(OCT_10, fuel_price=1.8, fuel_l100=6)], ["2026-10"], {"2026-10": None}, PARIS)[
        0
    ]
    assert r["cost_per_100km"] is None
    assert r["savings"] is None


def test_session_month_is_local_time():
    # 1 Nov 00:30 in Paris is still 31 Oct in UTC.
    rows = month_rows([s(ts(2026, 11, 1, 0, 30))], ["2026-10", "2026-11"], {}, PARIS)
    assert [r["sessions"] for r in rows] == [0, 1]


def test_empty_month_and_unpriced_session():
    rows = month_rows([s(OCT_10, cost=None)], ["2026-09", "2026-10"], {}, PARIS)
    assert rows[0]["sessions"] == 0
    assert rows[0]["cost"] is None
    assert rows[0]["off_peak_share"] is None
    assert rows[1]["unpriced"] == 1


def test_total_row_sums_and_drops_km_when_one_month_is_incomplete():
    rows = month_rows(
        [s(ts(2026, 9, 10, 22)), s(OCT_10)],
        ["2026-09", "2026-10"],
        {"2026-09": None, "2026-10": 200.0},
        PARIS,
    )
    total = total_row(rows)
    assert total["sessions"] == 2
    assert total["cost"] == pytest.approx(2.8)
    assert total["km"] is None
    assert total["cost_per_100km"] is None


def test_total_savings_only_when_every_month_has_them():
    rows = month_rows(
        [s(ts(2026, 9, 10, 22)), s(OCT_10, fuel_price=1.8, fuel_l100=6)],
        ["2026-09", "2026-10"],
        {"2026-09": 100.0, "2026-10": 200.0},
        PARIS,
    )
    assert rows[1]["savings"] is not None
    assert total_row(rows)["savings"] is None
    assert total_row(rows)["cost_per_100km"] == pytest.approx(2.8 / 300 * 100)


def test_consumption_since_formula():
    from custom_components.charge_board.stats import consumption_since

    assert consumption_since(80, 60, 100, 140, 27.5) == pytest.approx(13.75)


def test_consumption_since_needs_5_km_and_known_values():
    from custom_components.charge_board.stats import consumption_since

    assert consumption_since(80, 60, 100, 103, 27.5) is None
    assert consumption_since(None, 60, 100, 140, 27.5) is None
    assert consumption_since(60, 80, 100, 140, 27.5) is None  # charged meanwhile


def test_total_of_the_current_year_ignores_future_months_and_months_without_charge():
    rows = month_rows(
        [s(OCT_10, fuel_price=1.8, fuel_l100=6)],
        ["2026-09", "2026-10", "2026-11"],
        {"2026-09": 50.0, "2026-10": 200.0, "2026-11": None},
        PARIS,
    )
    total = total_row(rows, until="2026-10")
    assert total["km"] == pytest.approx(250.0)
    assert total["savings"] == pytest.approx(rows[1]["savings"])


def test_total_km_ignores_months_before_any_charge_or_odometer():
    rows = month_rows(
        [s(OCT_10, fuel_price=1.8, fuel_l100=6)],
        ["2026-08", "2026-09", "2026-10"],
        {"2026-10": 200.0},
        PARIS,
    )
    assert total_row(rows, until="2026-10")["km"] == pytest.approx(200.0)
