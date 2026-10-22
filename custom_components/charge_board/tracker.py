"""Turns periodic charger samples into charging sessions (pure, no Home Assistant imports)."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import asdict, dataclass

from .const import MIN_SESSION_KWH, TICK_SECONDS
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
    curve_step_s: int = 300


def _interval_kwh(a: Sample, b: Sample) -> float:
    """Energy of the interval: counter delta if plausible, else power trapezoid, else 0.

    Counter decrease: a reset (delta = e1) only if e1 <= 0.5 x e0, otherwise jitter (0).
    Counter increase above max(known power) x dt x 1.5 + 0.01 kWh is a glitch: fall back
    to the power trapezoid.
    """
    dt = b.t - a.t
    known = [p for p in (a.power_w, b.power_w) if p is not None]
    trapezoid = sum(known) / 2 * dt / 3_600_000 if len(known) == 2 else 0.0
    if a.energy_kwh is None or b.energy_kwh is None:
        return trapezoid
    e0, e1 = a.energy_kwh, b.energy_kwh
    delta = _counter_delta(e0, e1)
    plausible = max(known, default=0.0) * dt * 1.5 / 3_600_000 + 0.01
    return delta if delta <= plausible else trapezoid


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

    @property
    def current(self) -> Session | None:
        return self._session

    def feed(self, sample: Sample, vehicle_id: str | None) -> Session | None:
        """Process one sample; return the session it finishes (if kept), else None."""
        prev = self._last
        if prev is not None and sample.t <= prev.t:
            return None  # duplicate or out of order
        self._last = sample
        if prev is not None:
            self._interval(prev, sample, vehicle_id)
        finished = self._close_if_done(sample)
        self._absorb(sample)
        return finished

    def _interval(self, a: Sample, b: Sample, vehicle_id: str | None) -> None:
        s = self.settings
        charging = a.power_w is not None and a.power_w > s.power_threshold_w
        if charging and self._session is None:
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
            if a.energy_kwh is not None and b.energy_kwh is not None:
                price = b.price if b.price is not None else self._price
                self._credit(sess, _counter_delta(a.energy_kwh, b.energy_kwh), price, b.off_peak)
            return
        kwh = _interval_kwh(a, b)
        if charging:
            sess.charging_s += dt
            sess.charge_end = b.t

        # Curve: a point per window of >= curve_step_s, starting at a sample time. Intervals
        # of an open session are contiguous, so the window's elapsed time is a.t - p.t.
        if not sess.curve or a.t >= sess.curve[-1].t + s.curve_step_s:
            sess.curve.append(CurvePoint(a.t, 0.0))
        p = sess.curve[-1]
        p.w = (p.w * (a.t - p.t) + kwh * 3_600_000) / (b.t - p.t)

        self._credit(sess, kwh, self._price, a.off_peak)  # _price already includes a.price

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
        elif not (
            sample.plugged is not True
            and sample.t - sess.charge_end > self.settings.gap_hours * 3600
        ):
            return None
        self._session = None
        self._soc = None  # never carry a level over to the next session (or vehicle)
        sess.open = False
        sess.curve = [p for p in sess.curve if p.t < sess.charge_end]
        return sess if sess.energy_kwh >= MIN_SESSION_KWH else None

    def _absorb(self, sample: Sample) -> None:
        if sample.plugged is not None:
            if sample.plugged and self._plugged is False:
                self._plugged_at = sample.t
            elif not sample.plugged:
                self._plugged_at = None
            self._plugged = sample.plugged
        if sample.price is not None:
            self._price = sample.price
        if self._plugged is False:
            self._soc = None  # unplugged: the next car's level is unknown until it reports
        elif sample.soc is not None:
            self._soc = sample.soc
            if self._session is not None:
                self._session.soc_end = sample.soc

    def to_dict(self) -> dict:
        return {
            "charger_id": self.charger_id,
            "session": self._session.to_dict() if self._session else None,
            "last": asdict(self._last) if self._last else None,
            "plugged": self._plugged,
            "plugged_at": self._plugged_at,
            "price": self._price,
            "soc": self._soc,
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
        return tracker
