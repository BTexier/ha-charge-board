"""Persistence: finished sessions and open tracker states, one Store file each."""

from __future__ import annotations

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store

from .const import DOMAIN, SIGNAL_UPDATED
from .model import Session

TRACKERS_SAVE_DELAY = 30


class SessionStore:
    """`sessions`: finished, newest first; any change is saved and announced (SIGNAL_UPDATED).

    ponytail: one JSON file for all finished sessions; split by year if it grows past a few MB.
    """

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        self.hass = hass
        self._sessions = Store(hass, 1, f"{DOMAIN}.{entry_id}.sessions")
        self._trackers = Store(hass, 1, f"{DOMAIN}.{entry_id}.trackers")
        self.sessions: list[Session] = []
        self.trackers_state: dict[str, dict] = {}
        self._trackers_pending = False

    async def async_load(self) -> None:
        data = await self._sessions.async_load() or {}
        self.sessions = [Session.from_dict(d) for d in data.get("sessions", [])]
        self.trackers_state = await self._trackers.async_load() or {}

    async def async_add(self, session: Session) -> None:
        await self.async_replace([], [session])

    async def async_replace(self, ids_removed: list[str], added: list[Session]) -> None:
        removed = set(ids_removed)
        kept = [s for s in self.sessions if s.id not in removed]
        self.sessions = sorted(kept + added, key=_start, reverse=True)
        await self._sessions.async_save({"sessions": [s.to_dict() for s in self.sessions]})
        async_dispatcher_send(self.hass, SIGNAL_UPDATED)

    @callback
    def async_save_trackers(self) -> None:
        """Save within TRACKERS_SAVE_DELAY; Store also flushes it on Home Assistant's final write.

        async_delay_save is a debounce (each call pushes the write back), and this is called on
        every tick: only schedule when no write is pending, or nothing is written until stop.
        """
        if not self._trackers_pending:
            self._trackers_pending = True
            self._trackers.async_delay_save(self._trackers_data, TRACKERS_SAVE_DELAY)

    def _trackers_data(self) -> dict[str, dict]:
        self._trackers_pending = False
        return self.trackers_state

    async def async_flush_trackers(self) -> None:
        self._trackers_pending = False  # async_save cancels a pending delayed write
        await self._trackers.async_save(self.trackers_state)


def _start(s: Session) -> float:
    return s.charge_start or s.plugged_at or 0.0
