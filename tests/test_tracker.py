import itertools
import json
from datetime import UTC, datetime

import pytest

from custom_components.charge_board.tracker import Sample, SessionTracker, TrackerSettings

BASE = datetime(2026, 10, 21, tzinfo=UTC).timestamp()


def at(h, m=0, day=0):
    return BASE + day * 86400 + h * 3600 + m * 60


def make_tracker(priced=True):
    ids = itertools.count()
    settings = TrackerSettings(power_threshold_w=100, gap_hours=3, priced=priced)
    return SessionTracker("tuya", settings, lambda: f"s{next(ids)}")


def run(tracker, start, end, make, vehicle="twingo"):
    """Feed one sample every 30 s from start to end (inclusive); return finished sessions."""
    done = []
    t = start
    while t <= end:
        s = tracker.feed(make(t), vehicle)
        if s is not None:
            done.append(s)
        t += 30
    return done


def night(t):
    charging = at(22) <= t < at(4, 56, 1) or at(7, 43, 1) <= t < at(7, 55, 1)
    off = at(22) <= t < at(6, 0, 1)
    return Sample(
        t=t,
        power_w=2200 if charging else 0,
        energy_kwh=None,
        plugged=at(21, 58) <= t < at(7, 58, 1),
        price=0.1356 if off else 0.1654,
        off_peak=off,
        soc=None,
    )


def test_night_with_top_up_is_one_session():
    done = run(make_tracker(), at(21, 55), at(8, 0, 1), night)
    assert len(done) == 1
    s = done[0]
    assert s.id == "s0" and s.charger_id == "tuya" and s.vehicle_id == "twingo"
    assert s.plugged_at == at(21, 58)
    assert s.charge_start == at(22)
    assert s.charge_end == at(7, 55, 1)
    assert s.unplugged_at == at(7, 58, 1)
    assert s.off_peak.kwh == pytest.approx(15.2, abs=0.1)
    assert s.peak.kwh == pytest.approx(0.44, abs=0.02)
    assert s.cost == pytest.approx(s.off_peak.kwh * 0.1356 + s.peak.kwh * 0.1654)
    assert set(s.by_price) == {"0.1356", "0.1654"}
    assert s.has_off_peak_source and not s.estimated and not s.open
    assert s.charging_s == pytest.approx((416 + 12) * 60)
    assert s.curve and all(at(22) <= p.t < s.charge_end for p in s.curve)
    assert s.curve[0].w == pytest.approx(2200)


def test_energy_counter_reset_is_not_lost():
    def make(t):
        if t < at(3, 30):
            e = min(max(t - at(1), 0) / 3600 * 2.5, 5.0)
        else:
            e = min(max(t - at(4), 0) / 3600 * 2.0, 2.0)
        p = 2500 if at(1) <= t < at(3) else 2000 if at(4) <= t < at(5) else 0
        return Sample(t, p, e, t < at(5, 30), 0.2, False, None)

    done = run(make_tracker(), at(0), at(6), make)
    assert len(done) == 1
    assert done[0].energy_kwh == pytest.approx(7.0)


def test_counter_dropout_to_zero_is_not_phantom_energy():
    def make(t):
        e = 0.0 if t == at(2) else 2.8 + max(t - at(1), 0) / 3600 * 2.2
        return Sample(
            t, 2200 if at(1) <= t < at(3) else 0, min(e, 7.2), t < at(4), 0.2, False, None
        )

    done = run(make_tracker(), at(0), at(5), make)
    assert len(done) == 1
    assert done[0].energy_kwh == pytest.approx(4.4, abs=0.05)


def test_counter_jitter_down_adds_nothing():
    def make(t):
        e = 4.999 if t >= at(2, 30) else 2.8 + min(max(t - at(1), 0), 3600) / 3600 * 2.2
        return Sample(t, 2200 if at(1) <= t < at(2) else 0, e, t < at(3), 0.2, False, None)

    done = run(make_tracker(), at(0), at(4), make)
    assert len(done) == 1
    assert done[0].energy_kwh == pytest.approx(2.2, abs=0.01)


def test_unavailable_power_adds_nothing():
    def make(t):
        if at(2) <= t < at(3):
            p = None
        else:
            p = 2200 if at(1) <= t < at(4) else 0
        return Sample(t, p, None, t < at(4, 30), 0.2, False, None)

    done = run(make_tracker(), at(0), at(5), make)
    assert len(done) == 1
    # Known intervals only: 2 x 3570 s at 2.2 kW + the 4:00 ramp-down (half an interval).
    assert done[0].energy_kwh == pytest.approx((3570 * 2 + 15) / 3600 * 2.2)


@pytest.mark.parametrize(("pause_min", "sessions"), [(185, 2), (120, 1)])
def test_no_plug_info_splits_after_gap(pause_min, sessions):
    second = at(2) + pause_min * 60

    def make(t):
        charging = at(1) <= t < at(2) or second <= t < second + 3600
        return Sample(t, 2200 if charging else 0, None, None, 0.2, None, None)

    done = run(make_tracker(), at(0), second + 3600 + 190 * 60, make)
    assert len(done) == sessions
    assert all(s.unplugged_at is None and not s.has_off_peak_source for s in done)


def test_below_threshold_is_not_charging():
    tracker = make_tracker()
    done = run(
        tracker,
        at(0),
        at(6),
        lambda t: Sample(t, 60 if at(1) <= t < at(3) else 0, None, None, 0.2, None, None),
    )
    assert done == [] and tracker.current is None


def test_unpriced_cost_is_none():
    def make(t):
        return Sample(t, 2200 if at(1) <= t < at(2) else 0, None, t < at(3), None, True, None)

    done = run(make_tracker(priced=False), at(0), at(4), make)
    assert len(done) == 1
    s = done[0]
    assert s.energy_kwh > 2
    assert s.cost is None and s.off_peak.cost is None and s.peak.cost is None


def test_soc_end_is_last_before_unplug():
    def make(t):
        if t < at(1):
            soc = 40
        elif t < at(3):
            soc = 40 + 55 * (t - at(1)) / 7200
        elif t < at(3, 10):
            soc = 95
        else:
            soc = 100
        charging = at(1) <= t < at(3)
        return Sample(t, 2200 if charging else 0, None, t < at(3, 20), 0.2, False, soc)

    done = run(make_tracker(), at(0), at(4), make)
    assert len(done) == 1
    assert done[0].soc_start == 40
    assert done[0].soc_end == 100


def test_no_soc_stays_none():
    def make(t):
        return Sample(t, 2200 if at(1) <= t < at(2) else 0, None, t < at(3), 0.2, False, None)

    done = run(make_tracker(), at(0), at(4), make)
    assert len(done) == 1
    assert done[0].soc_start is None and done[0].soc_end is None


def test_soc_does_not_leak_into_next_session():
    tracker = make_tracker()

    def car_a(t):
        return Sample(t, 2200 if at(1) <= t < at(2) else 0, None, t < at(3), 0.2, False, 80)

    def car_b(t):
        return Sample(
            t, 2200 if at(5) <= t < at(6) else 0, None, at(4) <= t < at(7), 0.2, False, None
        )

    a = run(tracker, at(0), at(3, 30), car_a, vehicle="twingo")
    b = run(tracker, at(3, 30) + 30, at(8), car_b, vehicle="zoe")
    assert a[0].soc_start == 80 and a[0].soc_end == 80
    assert b[0].vehicle_id == "zoe"
    assert b[0].soc_start is None and b[0].soc_end is None


def test_empty_plug_session_is_dropped():
    def make(t):
        return Sample(t, 0, None, at(1) <= t < at(2), 0.2, False, None)

    assert run(make_tracker(), at(0), at(3), make) == []


def test_state_round_trip_resumes_identically():
    reference = run(make_tracker(), at(21, 55), at(8, 0, 1), night)

    first = make_tracker()
    assert run(first, at(21, 55), at(2, 0, 1), night) == []
    state = json.loads(json.dumps(first.to_dict()))
    ids = itertools.count(1)
    second = SessionTracker.from_dict(state, first.settings, lambda: f"s{next(ids)}")
    assert second.current == first.current
    assert run(second, at(2, 0, 1) + 30, at(8, 0, 1), night) == reference


def _open_session(counter=True):
    """Open session with 3.0 kWh at 0.2 EUR/kWh (2 kW for 1.5 h); last sample at 02:30."""
    t = make_tracker()

    def make(x):
        e = (x - at(1)) / 3600 * 2.0 if counter else None
        return Sample(x, 2000, e, True, 0.2, False, None)

    run(t, at(1), at(2, 30), make)
    return t


def _restore(tracker):
    d = json.loads(json.dumps(tracker.to_dict()))
    return SessionTracker.from_dict(d, tracker.settings, lambda: "s9")


def test_restart_mid_session_with_counter():
    t = _restore(_open_session())
    assert t.current.energy_kwh == pytest.approx(3.0)
    t.feed(Sample(at(4, 30), 2000, 7.0, True, 0.3, False, None), "twingo")
    s = t.current
    assert s.energy_kwh == pytest.approx(7.0) and s.estimated is True
    assert s.cost == pytest.approx(3.0 * 0.2 + 4.0 * 0.3)
    assert s.peak.kwh == pytest.approx(7.0)


def test_restart_without_counter_marks_estimated():
    t = _restore(_open_session(counter=False))
    before = t.current.energy_kwh
    t.feed(Sample(at(4, 30), 2000, None, True, 0.3, False, None), "twingo")
    assert t.current.energy_kwh == before and t.current.estimated is True


def test_restart_gap_ignores_plausibility_check():
    t = _restore(_open_session())
    t.feed(Sample(at(4, 30), 0, 9.0, True, 0.2, False, None), "twingo")
    assert t.current.energy_kwh == pytest.approx(9.0)
