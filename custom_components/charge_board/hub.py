"""Home Assistant side: reads the configured entities, feeds one tracker per charger."""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import datetime, time, timedelta
from uuid import uuid4

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_UNIT_OF_MEASUREMENT, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect, async_dispatcher_send
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.event import async_track_state_change_event, async_track_time_interval
from homeassistant.util import dt as dt_util
from homeassistant.util import slugify

from .const import (
    DEFAULT_GAP_HOURS,
    DEFAULT_POWER_THRESHOLD_W,
    DOMAIN,
    EVENT_PREFIX,
    NOTIFICATIONS,
    SIGNAL_LIVE,
    SUBENTRY_CHARGER,
    SUBENTRY_VEHICLE,
    TICK_SECONDS,
)
from .notifications import plugged_text, started_text, summary_text
from .panel import URL_PATH
from .store import SessionStore
from .tracker import Sample, SessionTracker, TrackerEvent, TrackerSettings

LOGGER = logging.getLogger(__name__)

POWER_UNITS = {"W": 1.0, "kW": 1000.0}
ENERGY_UNITS = {"Wh": 0.001, "kWh": 1.0}


def parse_windows(text: str) -> list[tuple[time, time]] | None:
    """`"22:00-06:00, 12:00-14:00"` -> [(start, end), ...]; "" -> []; invalid -> None."""
    windows = []
    for part in filter(None, (p.strip() for p in text.split(","))):
        try:
            start, end = part.split("-")
            windows.append((time.fromisoformat(start.strip()), time.fromisoformat(end.strip())))
        except ValueError:
            return None
    return windows


def in_windows(t: time, windows: list[tuple[time, time]]) -> bool:
    return any(a <= t < b if a <= b else (t >= a or t < b) for a, b in windows)


def _new_id() -> str:
    return uuid4().hex


class Hub:
    """One SessionTracker per charger subentry (charger_id = subentry_id).

    Feeds every tracker on any state change of a configured entity and every TICK_SECONDS.
    Finished sessions go to the store (which announces SIGNAL_UPDATED); after every feed,
    SIGNAL_LIVE.format(charger_id) is sent for that charger's entities.
    """

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self.options = dict(entry.options)
        self.store = SessionStore(hass, entry.entry_id)
        subs = entry.subentries.values()
        self.chargers = {
            s.subentry_id: dict(s.data) for s in subs if s.subentry_type == SUBENTRY_CHARGER
        }
        self.vehicles = {
            s.subentry_id: dict(s.data) for s in subs if s.subentry_type == SUBENTRY_VEHICLE
        }
        first = next(iter(self.vehicles), None)
        self.selected: dict[str, str | None] = dict.fromkeys(self.chargers, first)
        self.trackers: dict[str, SessionTracker] = {}
        o = self.options
        self.priced = bool(o.get("price_entity")) or any(
            o.get(k) is not None for k in ("off_peak_price", "peak_price")
        )
        self._windows = parse_windows(o.get("off_peak_windows") or "") or []
        self._unsubs: list = []

    async def async_start(self) -> None:
        """Load the store and restore the trackers (no listening yet)."""
        await self.store.async_load()
        for cid, c in self.chargers.items():
            settings = TrackerSettings(
                power_threshold_w=c.get("power_threshold_w", DEFAULT_POWER_THRESHOLD_W),
                gap_hours=c.get("gap_hours", DEFAULT_GAP_HOURS),
                priced=self.priced,
            )
            saved = self.store.trackers_state.get(cid)
            self.trackers[cid] = (
                SessionTracker.from_dict(saved, settings, _new_id)
                if saved
                else SessionTracker(cid, settings, _new_id)
            )
        # Also drops the states of removed chargers.
        self.store.trackers_state = {cid: t.to_dict() for cid, t in self.trackers.items()}

    @callback
    def async_start_feeding(self) -> None:
        """Subscribe and feed; called once the entities are set up, so the first feed already
        uses the restored vehicle selection (not the default one)."""
        keys = ("power_entity", "energy_entity", "plug_entity", "soc_entity")
        entities = {
            d[k]
            for d in (*self.chargers.values(), *self.vehicles.values())
            for k in keys
            if d.get(k)
        }
        entities |= {
            self.options[k] for k in ("price_entity", "off_peak_entity") if self.options.get(k)
        }
        self._unsubs = [
            async_track_state_change_event(self.hass, list(entities), self._on_change),
            async_track_time_interval(self.hass, self._on_tick, timedelta(seconds=TICK_SECONDS)),
        ]
        self._feed_all()

    async def async_stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs = []
        await self.store.async_flush_trackers()

    @callback
    def _on_change(self, event: Event) -> None:
        self._feed_all()

    @callback
    def _on_tick(self, now: datetime) -> None:
        self._feed_all()

    @callback
    def _feed_all(self) -> None:
        announced = False
        for cid, tracker in self.trackers.items():
            finished = tracker.feed(self.sample_for(cid), self.vehicle_for(cid))
            if finished is not None:
                self.entry.async_create_task(self.hass, self.store.async_add(finished))
            self.store.trackers_state[cid] = tracker.to_dict()
            for event in tracker.pop_events():
                announced = True
                self._announce(cid, event)
            async_dispatcher_send(self.hass, SIGNAL_LIVE.format(cid))
        if announced:
            # Written now, not within the save delay: a crash must not announce it twice.
            self.entry.async_create_task(self.hass, self.store.async_flush_trackers())
        else:
            self.store.async_save_trackers()

    @callback
    def _announce(self, charger_id: str, event: TrackerEvent) -> None:
        """Fire charge_board_<kind> and, if enabled, notify the chosen phone."""
        charger = self.chargers[charger_id]["name"]
        vehicle_id = self.vehicle_for(charger_id)
        vehicle = self.vehicles.get(vehicle_id) or {}
        name = vehicle.get("name")
        soc = self._number(vehicle.get("soc_entity"))
        data = {
            "charger_id": charger_id,
            "charger_name": charger,
            "vehicle_id": vehicle_id if vehicle else None,
            "vehicle_name": name,
        }
        lang = "fr" if (self.hass.config.language or "").startswith("fr") else "en"
        if event.kind == "plugged":
            target = self.target_for(vehicle_id)
            data |= {"soc": soc, "target": target}
            text = lambda: plugged_text(lang, charger, name, soc, target)
        elif event.kind == "started":
            sess = self.trackers[charger_id].current
            data |= {"charge_start": sess.charge_start if sess else None, "soc": soc}
            text = lambda: started_text(lang, charger, name, soc)
        else:
            data["session"] = event.session.to_dict()
            currency = self.hass.config.currency
            text = lambda: summary_text(lang, charger, name, event.session, currency)
        self.hass.bus.async_fire(f"{EVENT_PREFIX}{event.kind}", data)
        service = self.options.get("notify_service")
        if service and event.kind in self.options.get("notifications", NOTIFICATIONS):
            self.entry.async_create_background_task(
                self.hass, self._async_notify(service, text), f"{DOMAIN} notify"
            )

    async def _async_notify(self, service: str, text: Callable[[], tuple[str, str]]) -> None:
        """Build the text and send it; never raises (the event is already fired)."""
        url = f"/{URL_PATH}"
        try:
            title, message = text()
            await self.hass.services.async_call(
                "notify",
                service,
                {"title": title, "message": message, "data": {"url": url, "clickAction": url}},
                blocking=True,
            )
        except Exception as err:  # noqa: BLE001 - a notification must never break recording
            LOGGER.warning("Charge Board could not notify %s: %s", service, err)

    def target_for(self, vehicle_id: str | None) -> float | None:
        """Target level: the target entity when it reads a number, else the fixed target."""
        v = self.vehicles.get(vehicle_id) or {}
        target = self._number(v.get("target_entity"))
        return v.get("target_fixed") if target is None else target

    def vehicle_for(self, charger_id: str) -> str | None:
        return self.selected.get(charger_id)

    @callback
    def select_vehicle(self, charger_id: str, vehicle_id: str | None) -> None:
        """User choice: the remembered level belonged to the previous vehicle, forget it."""
        if vehicle_id != self.selected.get(charger_id):
            self.trackers[charger_id].reset_soc()
        self.selected[charger_id] = vehicle_id
        async_dispatcher_send(self.hass, SIGNAL_LIVE.format(charger_id))

    def sample_for(self, charger_id: str) -> Sample:
        c = self.chargers[charger_id]
        now = dt_util.utcnow()
        off_peak = self._off_peak(now)
        vehicle = self.vehicles.get(self.vehicle_for(charger_id)) or {}
        return Sample(
            t=now.timestamp(),
            power_w=self._number(c.get("power_entity"), POWER_UNITS),
            energy_kwh=self._number(c.get("energy_entity"), ENERGY_UNITS),
            plugged=self._plugged(c),
            price=self._price(off_peak),
            off_peak=off_peak,
            soc=self._number(vehicle.get("soc_entity")),
        )

    def live(self, charger_id: str) -> dict:
        tracker = self.trackers[charger_id]
        sess = tracker.current
        sample = self.sample_for(charger_id)
        if sample.power_w is not None and sample.power_w > tracker.settings.power_threshold_w:
            state = "charging"
        elif sample.plugged or (sample.plugged is None and sess is not None):
            state = "plugged"
        else:
            state = "free"
        return {
            "state": state,
            "power_w": sample.power_w,
            "vehicle_id": self.vehicle_for(charger_id),
            "energy_kwh": sess.energy_kwh if sess else 0.0,
            "cost": None if not self.priced else (sess.cost if sess else 0.0),
            "session": sess.to_dict() if sess else None,
        }

    def _state(self, entity_id: str | None):
        st = self.hass.states.get(entity_id) if entity_id else None
        return None if st is None or st.state in (STATE_UNAVAILABLE, STATE_UNKNOWN) else st

    def _number(self, entity_id: str | None, units: dict[str, float] | None = None) -> float | None:
        st = self._state(entity_id)
        if st is None:
            return None
        try:
            value = float(st.state)
        except ValueError:
            return None
        # Unknown or missing unit: assume the base unit (W, kWh).
        return value * (units or {}).get(st.attributes.get(ATTR_UNIT_OF_MEASUREMENT), 1.0)

    def _plugged(self, charger: dict) -> bool | None:
        st = self._state(charger.get("plug_entity"))
        if st is None:
            return None
        states = charger.get("plugged_states") or []
        return st.state in states if states else st.state == "on"

    def _off_peak(self, now: datetime) -> bool | None:
        if self.options.get("off_peak_entity"):
            st = self._state(self.options["off_peak_entity"])
            return None if st is None else st.state == "on"
        if self._windows:
            return in_windows(dt_util.as_local(now).time(), self._windows)
        return None

    def _price(self, off_peak: bool | None) -> float | None:
        o = self.options
        if o.get("price_entity"):
            return self._number(o["price_entity"])
        off, peak = o.get("off_peak_price"), o.get("peak_price")
        if off_peak is None or off is None or peak is None:
            # Without an off-peak source (or with one price only) a single price still applies.
            known = {p for p in (off, peak) if p is not None}
            return known.pop() if len(known) == 1 else None
        return off if off_peak else peak


class ChargerEntity(Entity):
    """Entity attached to a charger device; refreshed on SIGNAL_LIVE for its charger."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, hub: Hub, charger_id: str, key: str, object_suffix: str) -> None:
        self.hub = hub
        self.charger_id = charger_id
        name = hub.chargers[charger_id]["name"]
        self._attr_translation_key = key
        self._attr_unique_id = f"{charger_id}_{key}"
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, charger_id)}, name=name)
        # French object ids as specified (select.<charger>_vehicule, ...), whatever the language.
        self.entity_id = f"{self.platform_domain}.{slugify(name)}_{object_suffix}"

    platform_domain: str

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass, SIGNAL_LIVE.format(self.charger_id), self.async_write_ha_state
            )
        )
