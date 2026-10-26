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
    # Each curve point carries the off-peak flag of its window (panel background bands).
    assert s.curve[0].off_peak is True and s.curve[-1].off_peak is False


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


def test_reset_soc_forgets_the_previous_vehicle_level():
    tracker = make_tracker()
    tracker.feed(Sample(at(1), 0, None, True, 0.2, False, 40), "twingo")
    tracker.reset_soc()  # another vehicle selected, which has no level
    tracker.feed(Sample(at(1, 1), 2200, None, True, 0.2, False, None), "zoe")
    tracker.feed(Sample(at(1, 1) + 30, 2200, None, True, 0.2, False, None), "zoe")
    assert tracker.current.soc_start is None
    assert tracker.current.soc_end is None


def test_reset_soc_keeps_an_open_session():
    tracker = make_tracker()
    tracker.feed(Sample(at(1), 2200, None, True, 0.2, False, 40), "twingo")
    tracker.feed(Sample(at(1) + 30, 2200, None, True, 0.2, False, 40), "twingo")
    tracker.reset_soc()
    assert tracker.current.soc_start == 40
    assert tracker.current.vehicle_id == "twingo"


def _de_night(both_written):
    """Replay the dé's real cadence: 4 h at 2.15 kW (8.6 kWh) from 22:00, unplugged at 02:30.

    The charger publishes power and its session counter once a minute at the same instant;
    Home Assistant sees the power event first (still with the OLD counter unless both states
    are already written), then the counter event 0.4 ms later. The hub also ticks every 30 s.
    """
    start, end = at(22), at(2, 0, 1)

    def published(t):
        steps = min(max((t - start) // 60, 0), 240)  # full minutes charged before t
        return (2150 if start <= t < end else 0), round(steps * 2.15 / 60, 3)

    events = []  # (t, power, counter) as each state-change event sees them
    old_e = 0.0
    for t in range(int(at(21, 45)), int(at(2, 45, 1)), 60):
        p, e = published(t)
        events.append((t, p, e if both_written else old_e))
        events.append((t + 0.0004, p, e))
        old_e = e
    ticks = [(t, None, None) for t in range(int(at(21, 45)) + 15, int(at(3, 0, 1)), 30)]
    tracker, done, cur = make_tracker(), [], (0, 0.0)
    for t, p, e in sorted(events + ticks):
        if p is not None:
            cur = (p, e)
        s = tracker.feed(Sample(t, cur[0], cur[1], t < at(2, 30, 1), 0.1356, True, None), "twingo")
        if s is not None:
            done.append(s)
    return done


@pytest.mark.parametrize("both_written", [False, True])
def test_real_cadence_counter_is_credited(both_written):
    done = _de_night(both_written)
    assert len(done) == 1
    s = done[0]
    assert s.energy_kwh == pytest.approx(8.6, abs=0.05)
    assert s.off_peak.kwh == pytest.approx(s.energy_kwh)
    assert s.cost == pytest.approx(s.energy_kwh * 0.1356)
    assert s.charging_s == pytest.approx(4 * 3600, abs=60)
    assert not s.estimated


def test_counter_increase_without_known_power_is_kept():
    def make(t):
        e = min(max(t - at(1), 0), 7200) / 3600 * 2.0
        p = None if at(2) <= t < at(2, 30) else 2000 if at(1) <= t < at(3) else 0
        return Sample(t, p, e, t < at(4), 0.2, False, None)

    done = run(make_tracker(), at(0), at(5), make)
    assert len(done) == 1
    assert done[0].energy_kwh == pytest.approx(4.0, abs=0.01)


def test_restart_with_entities_unavailable_recovers_counter():
    t = _restore(_open_session())  # 3.0 kWh at 02:30, counter 3.0
    for x in (at(4, 30), at(4, 30) + 30):  # integration back, charger entities not yet loaded
        t.feed(Sample(x), "twingo")
    t.feed(Sample(at(4, 31), 2000, 7.0, True, 0.3, False, None), "twingo")
    s = t.current
    assert s.energy_kwh == pytest.approx(7.0)
    assert s.estimated is True
    assert s.cost == pytest.approx(3.0 * 0.2 + 4.0 * 0.3)  # gap energy at the return price
    assert s.has_off_peak_source is True and s.peak.kwh == pytest.approx(7.0)
    # Recovered energy is not drawn as a power spike on the curve.
    assert max(p.w for p in s.curve) == pytest.approx(2000, rel=0.01)


def test_plug_entity_blip_does_not_split_a_long_pause():
    def make(t):
        charging = at(22) <= t < at(2, 39, 1) or at(8, 4, 1) <= t < at(8, 15, 1)
        plugged = None if t == at(6, 0, 1) else at(21, 58) <= t < at(8, 20, 1)
        return Sample(t, 2200 if charging else 0, None, plugged, 0.2, True, None)

    done = run(make_tracker(), at(21, 55), at(9, 0, 1), make)
    assert len(done) == 1
    assert done[0].charge_end == at(8, 15, 1) and done[0].unplugged_at == at(8, 20, 1)


def test_soc_start_is_first_reading_when_charge_starts_before_it():
    def make(t):
        soc = None if t < at(22, 8) else 40 + (t - at(22, 8)) / 600
        return Sample(
            t, 2200 if at(22) <= t < at(1, 0, 1) else 0, None, t >= at(21, 59), 0.2, True, soc
        )

    tracker = make_tracker()
    run(tracker, at(21, 58), at(23), make)
    assert tracker.current.soc_start == 40
    assert tracker.current.soc_end == pytest.approx(40 + 52 * 60 / 600)


@pytest.mark.parametrize("minutes", [15, 30])
def test_long_counter_dropout_to_zero_is_not_counted_twice(minutes):
    def make(t):
        e = min(max(t - at(1), 0), 4 * 3600) / 3600 * 2.15
        if at(3) <= t < at(3) + minutes * 60:
            e = 0.0
        return Sample(t, 2150 if at(1) <= t < at(5) else 0, e, t < at(5, 30), 0.2, False, None)

    done = run(make_tracker(), at(0), at(6), make)
    assert len(done) == 1
    assert done[0].energy_kwh == pytest.approx(8.6, abs=0.1)


# --- Transitions (notifications) ------------------------------------------------------------


def events(tracker, start, end, make, vehicle="twingo"):
    """Like run, but collect (kind, t) of the events emitted after each feed."""
    out = []
    t = start
    while t <= end:
        tracker.feed(make(t), vehicle)
        out += [(e.kind, e.t) for e in tracker.pop_events()]
        t += 30
    return out


def test_night_announces_plug_start_and_unplug_once():
    ev = events(make_tracker(), at(21, 50), at(8, 10, 1), night)
    assert [k for k, _ in ev] == ["plugged", "started", "unplugged"]
    assert ev[0][1] == at(21, 58)
    assert ev[1][1] == at(22, 5)  # 5 min of continuous charging; the 07:43 top-up adds nothing
    assert ev[2][1] == at(7, 58, 1)


def test_unplugged_event_carries_the_finished_session():
    tracker = make_tracker()
    t = at(21, 50)
    while t <= at(8, 10, 1):
        finished = tracker.feed(night(t), "twingo")
        last = tracker.pop_events()
        t += 30
        if last and last[-1].kind == "unplugged":
            assert last[-1].session is finished
            return
    pytest.fail("no unplugged event")


def test_short_burst_at_plug_in_is_not_a_start():
    def make(t):
        burst = at(19, 51) <= t < at(19, 52)  # 1 min of charging at plug-in
        charging = burst or at(22) <= t < at(23)
        return Sample(t=t, power_w=2200 if charging else 0, plugged=t >= at(19, 50))

    ev = events(make_tracker(), at(19, 45), at(23, 30), make)
    assert ("started", at(22, 5)) in ev
    assert [k for k, _ in ev].count("started") == 1


def test_plug_entity_blip_is_not_a_new_plug():
    def make(t):
        return Sample(t=t, power_w=0, plugged=None if t == at(20, 0) else t >= at(19))

    ev = events(make_tracker(), at(18, 50), at(20, 30), make)
    assert ev == [("plugged", at(19))]


def test_restored_open_session_is_not_announced_again():
    tracker = make_tracker()
    events(tracker, at(21, 50), at(23), night)  # plugged + started already emitted
    d = json.loads(json.dumps(tracker.to_dict()))
    restored = SessionTracker.from_dict(d, tracker.settings, lambda: "x")
    assert events(restored, at(23) + 30, at(4), night) == []


def test_v1_state_with_open_session_counts_as_announced():
    tracker = make_tracker()
    events(tracker, at(21, 50), at(23), night)
    d = json.loads(json.dumps(tracker.to_dict()))
    del d["start_announced"], d["run_start"]
    restored = SessionTracker.from_dict(d, tracker.settings, lambda: "x")
    assert [k for k, _ in events(restored, at(23) + 30, at(8, 10, 1), night)] == ["unplugged"]


def test_dropped_empty_session_emits_no_unplugged():
    def make(t):
        return Sample(
            t=t,
            power_w=200 if at(19) <= t < at(19, 6) else 0,
            energy_kwh=0.0,
            plugged=at(18, 59) <= t < at(19, 30),
        )

    # Counter stuck at 0: the session is dropped (< 0.01 kWh), but 6 min of charging => started.
    ev = events(make_tracker(), at(18, 50), at(19, 40), make)
    assert [k for k, _ in ev] == ["plugged", "started"]


def test_unplug_while_charging_with_stale_power_is_not_a_new_start():
    # The plug status turns off before the power sensor refreshes (about once a minute).
    def make(t):
        unplug = at(20)
        return Sample(
            t=t, power_w=2200 if at(19) <= t < unplug + 60 else 0, plugged=at(18, 59) <= t < unplug
        )

    ev = events(make_tracker(), at(18, 50), at(20, 30), make)
    assert [k for k, _ in ev] == ["plugged", "started", "unplugged"]


def test_stale_power_after_unplug_opens_no_phantom_session():
    # Power still reads 2200 W for a minute after the unplug; a quick top-up 1 h later
    # must be its own session, with its own plug-in time.
    def make(t):
        first = at(19) <= t < at(20, 1)
        second = at(21, 1) <= t < at(21, 30)
        plugged = at(18, 59) <= t < at(20) or at(21) <= t < at(21, 31)
        return Sample(t=t, power_w=2200 if first or second else 0, plugged=plugged)

    tracker = make_tracker()
    done = run(tracker, at(18, 50), at(21, 40), make)
    assert len(done) == 2
    assert done[1].plugged_at == at(21)
    assert done[1].charge_start == at(21, 1)


def test_odometer_start_and_end_follow_the_session():
    def make(t):
        return Sample(
            t=t,
            power_w=2200 if at(22) <= t < at(23) else 0,
            plugged=at(21) <= t < at(23, 30),
            odometer=1000.0 if t < at(22, 30) else 1012.0,
        )

    (done,) = run(make_tracker(), at(20, 50), at(23, 40), make)
    assert done.odometer_start == 1000.0
    assert done.odometer_end == 1012.0
