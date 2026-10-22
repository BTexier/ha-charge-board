import pytest

from custom_components.charge_board.corrections import change_vehicle, merge_sessions, split_session
from custom_components.charge_board.model import CurvePoint, Session, TariffSlice


def mk(id, t0, t1, kwh, cost, **kw):
    return Session(
        id=id,
        charger_id="c1",
        vehicle_id="v1",
        plugged_at=t0 - 10,
        charge_start=t0,
        charge_end=t1,
        unplugged_at=t1 + 10,
        charging_s=t1 - t0,
        energy_kwh=kwh,
        cost=cost,
        off_peak=TariffSlice(kwh * 0.75, cost * 0.5),
        peak=TariffSlice(kwh * 0.25, cost * 0.5),
        by_price={"0.1": TariffSlice(kwh, cost)},
        soc_start=kw.pop("soc_start", 20),
        soc_end=kw.pop("soc_end", 50),
        curve=kw.pop("curve", [CurvePoint(t0, 3600 * kwh * 1000 / (t1 - t0))]),
        **kw,
    )


def test_merge_adds_up_and_keeps_bounds():
    a = mk("a", 1000, 2000, 2.0, 0.4, soc_start=10, soc_end=30)
    a.has_off_peak_source = True
    b = mk("b", 3000, 4000, 3.0, 0.6, soc_start=31, soc_end=60, estimated=True)
    m = merge_sessions(b, a)
    assert m.edited is True
    assert m.id == "a"
    assert m.energy_kwh == pytest.approx(5.0)
    assert m.cost == pytest.approx(1.0)
    assert m.charging_s == 2000
    assert m.off_peak.kwh == pytest.approx(3.75)
    assert m.peak.cost == pytest.approx(0.5)
    assert m.by_price["0.1"].kwh == pytest.approx(5.0)
    assert (m.plugged_at, m.charge_start, m.soc_start) == (990, 1000, 10)
    assert (m.charge_end, m.unplugged_at, m.soc_end) == (4000, 4010, 60)
    assert m.estimated is True
    assert m.has_off_peak_source is False
    assert [p.t for p in m.curve] == [1000, 3000]


def test_merge_refuses_other_charger():
    a = mk("a", 1000, 2000, 1, 1)
    b = mk("b", 3000, 4000, 1, 1)
    b.charger_id = "c2"
    with pytest.raises(ValueError):
        merge_sessions(a, b)


def test_merge_refuses_open_session():
    a = mk("a", 1000, 2000, 1, 1)
    b = mk("b", 3000, 4000, 1, 1, open=True)
    with pytest.raises(ValueError):
        merge_sessions(a, b)


def test_split_conserves_energy_and_cost():
    s = mk(
        "a",
        0,
        4000,
        4.0,
        1.0,
        curve=[
            CurvePoint(0, 3000),
            CurvePoint(1000, 3000, True),
            CurvePoint(2000, 6000),
            CurvePoint(3000, 3000),
        ],
    )
    s.energy_kwh = sum(p.w for p in s.curve) * 1000 / 3600 / 1000
    a, b = split_session(s, 1500, "new")
    assert a.edited and b.edited
    assert b.id == "new" and a.id == "a"
    assert a.energy_kwh + b.energy_kwh == pytest.approx(s.energy_kwh, abs=1e-6)
    assert a.cost + b.cost == pytest.approx(1.0, abs=1e-6)
    assert a.energy_kwh == pytest.approx((1000 * 3000 + 500 * 3000) / 3.6e6)
    assert a.off_peak.kwh + b.off_peak.kwh == pytest.approx(s.off_peak.kwh)
    assert a.peak.cost + b.peak.cost == pytest.approx(s.peak.cost)
    assert a.by_price["0.1"].kwh + b.by_price["0.1"].kwh == pytest.approx(s.by_price["0.1"].kwh)
    assert a.charging_s + b.charging_s == pytest.approx(s.charging_s)
    assert (a.charge_end, a.unplugged_at, a.soc_end) == (1500, None, None)
    assert (b.charge_start, b.plugged_at, b.soc_start) == (1500, None, None)
    assert a.soc_start == 20 and b.soc_end == 50
    assert [p.t for p in a.curve] == [0, 1000]
    assert [p.t for p in b.curve] == [1500, 2000, 3000]
    assert b.curve[0].off_peak is True  # the cut window keeps its tariff


def test_split_outside_bounds_raises():
    s = mk("a", 1000, 2000, 1, 1)
    for at in (1000, 2000, 500, 2500):
        with pytest.raises(ValueError):
            split_session(s, at, "n")
    with pytest.raises(ValueError):
        split_session(mk("a", 1000, 2000, 1, 1, open=True), 1500, "n")


def test_change_vehicle_keeps_soc():
    s = mk("a", 1000, 2000, 1, 1)
    r = change_vehicle(s, "v2")
    assert r.edited is True and r.vehicle_id == "v2"
    assert (r.soc_start, r.soc_end) == (20, 50)
    assert s.vehicle_id == "v1" and s.edited is False
