"""Turns periodic charger samples into charging sessions (pure, no Home Assistant imports)."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import asdict, dataclass

from .const import CURVE_STEP_S, MAX_CHARGER_W, MIN_SESSION_KWH, STARTED_MIN_S, TICK_SECONDS
from .model import CurvePoint, Session, TariffSlice


@dataclass
class Sample:
    """One reading of the charger's entities; None = unknown / unavailable."""

    t: float
    power_w: float | None = None
    energy_kwh: float | None = None
    plugged: bool | None = None
    price: float | None = None
    off_peak: bool | None = None
    soc: float | None = None


@dataclass
class TrackerSettings:
    power_threshold_w: float
    gap_hours: float
    priced: bool
    curve_step_s: int = CURVE_STEP_S


@dataclass
class TrackerEvent:
    """A transition worth announcing: "plugged", "started" or "unplugged" (with its session)."""

    kind: str
    t: float
    session: Session | None = None


def _trapezoid(a: Sample, b: Sample) -> float:
    """Power trapezoid of the interval (kWh); 0 unless both powers are known."""
    if a.power_w is None or b.power_w is None:
        return 0.0
    return (a.power_w + b.power_w) / 2 * (b.t - a.t) / 3_600_000


def _counter_delta(e0: float, e1: float) -> float:
    """Counter increase; a decrease is a reset (delta = e1) only if e1 <= 0.5 x e0, else jitter."""
    if e1 < e0:
        return e1 if e1 <= 0.5 * e0 else 0.0
    return e1 - e0


def _add(slice_: TariffSlice, kwh: float, cost: float | None) -> None:
    slice_.kwh += kwh
    if cost is not None:
        slice_.cost = (slice_.cost or 0.0) + cost


class SessionTracker:
    """Session state machine for one charger.

    `feed` handles the interval between the previous sample and the new one. Everything about
    the interval (charging or not, price, off-peak slice) comes from its START sample. An
    interval is "charging" when the start sample's power is above the threshold; the first one
    opens the session (`charge_start` = its start), each one extends `charge_end` to its end and
    adds to `charging_s`. Energy of an interval is counted only while a session is open, so the
    ramp-up half-interval before the opening is ignored (a few Wh).
    """

    def __init__(
        self, charger_id: str, settings: TrackerSettings, new_id: Callable[[], str]
    ) -> None:
        self.charger_id = charger_id
        self.settings = settings
        self._new_id = new_id
        self._session: Session | None = None
        self._last: Sample | None = None
        self._plugged: bool | None = None  # last known plug state
        self._plugged_at: float | None = None  # last False -> True transition
        self._price: float | None = None  # last known price
        self._soc: float | None = None  # battery level since last plug-in / session close
        # Last counter reading (t of its first sighting, kWh): survives unavailable readings.
        self._counter_ref: tuple[float, float] | None = None
        self._ref_max_w: float | None = None  # highest known power since that reading
        self._ref_kwh = 0.0  # power trapezoid since that reading (restart gaps excluded)
        self._run_start: float | None = None  # start of the current continuous charging run
        self._start_announced = False  # "started" already emitted for the open session
        self._events: list[TrackerEvent] = []

    @property
    def current(self) -> Session | None:
        return self._session

    def reset_soc(self) -> None:
        """Another vehicle was selected: forget the remembered level (never use another car's).

        An open session keeps its soc_start and vehicle_id (fixed at its start).
        """
        self._soc = None

    def pop_events(self) -> list[TrackerEvent]:
        """Transitions since the last call, in order (not persisted)."""
        events, self._events = self._events, []
        return events

    def feed(self, sample: Sample, vehicle_id: str | None) -> Session | None:
        """Process one sample; return the session it finishes (if kept), else None."""
        prev = self._last
        if prev is not None and sample.t <= prev.t:
            return None  # duplicate or out of order
        self._last = sample
        if prev is not None:
            self._interval(prev, sample, vehicle_id)
            if sample.t - prev.t <= 2 * TICK_SECONDS:
                self._ref_kwh += _trapezoid(prev, sample)
        finished = self._close_if_done(sample)
        if finished is not None:
            self._events.append(TrackerEvent("unplugged", sample.t, finished))
        self._absorb(sample)
        return finished

    def _interval(self, a: Sample, b: Sample, vehicle_id: str | None) -> None:
        s = self.settings
        charging = a.power_w is not None and a.power_w > s.power_threshold_w
        if not charging or b.t - a.t > 2 * TICK_SECONDS:
            self._run_start = None
        elif self._run_start is None:
            self._run_start = a.t
        # A power reading still above the threshold just after an unplug is stale: no session.
        if charging and self._session is None and self._plugged is not False:
            self._session = Session(
                id=self._new_id(),
                charger_id=self.charger_id,
                vehicle_id=vehicle_id,
                plugged_at=self._plugged_at,
                charge_start=a.t,
                charge_end=b.t,
                has_off_peak_source=True,
                soc_start=self._soc,
                soc_end=self._soc,
                open=True,
            )
        sess = self._session
        if sess is None:
            return
        dt = b.t - a.t
        if dt > 2 * TICK_SECONDS:
            # Restart gap: the counter is the only truth, priced at the NEW sample.
            sess.estimated = True
            price = b.price if b.price is not None else self._price
            self._credit(sess, self._kwh(a, b, gap=True), price, b.off_peak)
            return
        kwh = self._kwh(a, b, gap=False)
        if charging:
            sess.charging_s += dt
            sess.charge_end = b.t
            if not self._start_announced and b.t - self._run_start >= STARTED_MIN_S:
                self._start_announced = True
                self._events.append(TrackerEvent("started", b.t))
        # Energy the counter recovers after an outage (restart with entities not yet loaded)
        # is not drawn: it would be a power spike in a 30 s interval.
        if a.energy_kwh is not None or self._counter_ref is None:
            # Curve: a point per window of >= curve_step_s, starting at a sample time.
            # Intervals of an open session are contiguous: the window's elapsed time is a.t - p.t.
            if not sess.curve or a.t >= sess.curve[-1].t + s.curve_step_s:
                sess.curve.append(CurvePoint(a.t, 0.0, a.off_peak))
            p = sess.curve[-1]
            p.w = (p.w * (a.t - p.t) + kwh * 3_600_000) / (b.t - p.t)
        # Price and slice of the start sample (_price already includes a.price); when it
        # knew nothing (entities not loaded yet), those of the end sample.
        price = self._price if a.price is not None or b.price is None else b.price
        off_peak = a.off_peak if a.off_peak is not None else b.off_peak
        self._credit(sess, kwh, price, off_peak)

    def _kwh(self, a: Sample, b: Sample, gap: bool) -> float:
        """Energy of the interval a -> b.

        The counter is the primary source: its increase since the last known reading
        (`_counter_ref`, kept across unavailable readings and outside sessions), so a jump
        published a fraction of a second after the power still counts in full. A jump above
        1.5 x the highest power known since that reading (MAX_CHARGER_W when none is known, or
        across a restart gap) is a glitch, e.g. the counter coming back after a dropout to 0:
        the power trapezoid since that reading instead (all its intervals credited 0, nothing
        is counted twice; nothing across a restart gap). Without any counter reading: power
        trapezoid.
        """
        ref = self._counter_ref
        if ref is None:
            return 0.0 if gap else _trapezoid(a, b)
        if b.energy_kwh is None:
            return 0.0  # its next reading credits the whole increase
        delta = _counter_delta(ref[1], b.energy_kwh)
        powers = [p for p in (self._ref_max_w, b.power_w) if p is not None]
        max_w = MAX_CHARGER_W if gap or not powers else max(powers) * 1.5
        if delta <= max_w * (b.t - ref[0]) / 3_600_000 + 0.01:
            return delta
        return 0.0 if gap else self._ref_kwh + _trapezoid(a, b)

    def _credit(
        self, sess: Session, kwh: float, price: float | None, off_peak: bool | None
    ) -> None:
        if kwh <= 0:
            return
        price = price if self.settings.priced else None
        cost = None if price is None else kwh * price
        if self.settings.priced and price is None:
            sess.estimated = True
        if off_peak is None:
            sess.has_off_peak_source = False
        sess.energy_kwh += kwh
        if cost is not None:
            sess.cost = (sess.cost or 0.0) + cost
        _add(sess.off_peak if off_peak else sess.peak, kwh, cost)
        key = "none" if price is None else f"{price:.4f}"
        _add(sess.by_price.setdefault(key, TariffSlice()), kwh, cost)

    def _close_if_done(self, sample: Sample) -> Session | None:
        sess = self._session
        if sess is None:
            return None
        if self._plugged and sample.plugged is False:
            sess.unplugged_at = sample.t
        # Gap rule also covers a plug entity stuck at False, so a session can never stay open.
        # Not on a None blip of a known plug entity (1 s unavailable at every HA start).
        elif not (
            (sample.plugged is False or (sample.plugged is None and self._plugged is None))
            and sample.t - sess.charge_end > self.settings.gap_hours * 3600
        ):
            return None
        self._session = None
        self._start_announced = False
        self._run_start = None  # a stale power reading after unplug starts a new run
        self._soc = None  # never carry a level over to the next session (or vehicle)
        sess.open = False
        sess.curve = [p for p in sess.curve if p.t < sess.charge_end]
        return sess if sess.energy_kwh >= MIN_SESSION_KWH else None

    def _absorb(self, sample: Sample) -> None:
        if sample.plugged is not None:
            if sample.plugged and self._plugged is False:
                self._plugged_at = sample.t
                self._events.append(TrackerEvent("plugged", sample.t))
            elif not sample.plugged:
                self._plugged_at = None
            self._plugged = sample.plugged
        if sample.price is not None:
            self._price = sample.price
        e = sample.energy_kwh
        if e is not None and (self._counter_ref is None or e != self._counter_ref[1]):
            self._counter_ref = (sample.t, e)
            self._ref_max_w, self._ref_kwh = None, 0.0
        if sample.power_w is not None:
            self._ref_max_w = max(self._ref_max_w or 0.0, sample.power_w)
        if self._plugged is False:
            self._soc = None  # unplugged: the next car's level is unknown until it reports
        elif sample.soc is not None:
            self._soc = sample.soc
            if self._session is not None:
                self._session.soc_end = sample.soc
                if self._session.soc_start is None:  # charge started before the first reading
                    self._session.soc_start = sample.soc

    def to_dict(self) -> dict:
        return {
            "charger_id": self.charger_id,
            "session": self._session.to_dict() if self._session else None,
            "last": asdict(self._last) if self._last else None,
            "plugged": self._plugged,
            "plugged_at": self._plugged_at,
            "price": self._price,
            "soc": self._soc,
            "counter_ref": self._counter_ref,
            "ref_max_w": self._ref_max_w,
            "ref_kwh": self._ref_kwh,
            "run_start": self._run_start,
            "start_announced": self._start_announced,
        }

    @classmethod
    def from_dict(
        cls, d: dict, settings: TrackerSettings, new_id: Callable[[], str]
    ) -> SessionTracker:
        tracker = cls(d["charger_id"], settings, new_id)
        if d.get("session"):
            tracker._session = Session.from_dict(d["session"])
        if d.get("last"):
            tracker._last = Sample(**d["last"])
        tracker._plugged = d.get("plugged")
        tracker._plugged_at = d.get("plugged_at")
        tracker._price = d.get("price")
        tracker._soc = d.get("soc")
        ref = d.get("counter_ref")
        tracker._counter_ref = tuple(ref) if ref else None
        tracker._ref_max_w = d.get("ref_max_w")
        tracker._ref_kwh = d.get("ref_kwh", 0.0)
        tracker._run_start = d.get("run_start")
        # Saved by v1: a session already open was charging before, do not announce it.
        tracker._start_announced = d.get("start_announced", tracker._session is not None)
        return tracker
