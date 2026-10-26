from custom_components.charge_board.model import CurvePoint, Session, TariffSlice


def test_round_trip():
    s = Session(
        id="s1",
        charger_id="tuya",
        vehicle_id="twingo",
        plugged_at=1.0,
        charge_start=2.0,
        charge_end=3.0,
        unplugged_at=4.0,
        charging_s=1.0,
        energy_kwh=15.6,
        cost=2.1,
        off_peak=TariffSlice(15.2, 2.06),
        peak=TariffSlice(0.4, 0.07),
        by_price={"0.1356": TariffSlice(15.2, 2.06), "none": TariffSlice(0.1)},
        has_off_peak_source=True,
        soc_start=40,
        soc_end=100,
        curve=[CurvePoint(2.0, 2200.0)],
        estimated=True,
        edited=True,
        open=False,
    )
    assert Session.from_dict(s.to_dict()) == s

    d = Session.from_dict({"id": "x", "charger_id": "c"})
    assert d == Session(id="x", charger_id="c")
    assert d.vehicle_id is None and d.cost is None and d.soc_start is None
    assert d.energy_kwh == 0.0 and d.off_peak == TariffSlice() and d.by_price == {}
    assert d.curve == [] and not d.estimated and not d.edited and not d.open


def test_unknown_nested_keys_are_ignored():
    d = Session(
        id="s", charger_id="c", by_price={"0.1": TariffSlice(1.0)}, curve=[CurvePoint(1.0, 2.0)]
    ).to_dict()
    d["future"] = 1
    d["off_peak"]["future"] = 1
    d["by_price"]["0.1"]["future"] = 1
    d["curve"][0]["future"] = 1
    s = Session.from_dict(d)
    assert s.by_price == {"0.1": TariffSlice(1.0)} and s.curve == [CurvePoint(1.0, 2.0)]


def test_old_session_reads_without_new_fields():
    s = Session.from_dict({"id": "x", "charger_id": "c", "energy_kwh": 3.0})
    assert (s.odometer_start, s.odometer_end, s.fuel_price, s.fuel_l100) == (None,) * 4
