# Notifications Charge Board — plan de développement

> **Pour les agents :** sous-compétence requise : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans, tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** trois notifications (branchement, démarrage, débranchement avec résumé) envoyées par Charge Board au téléphone choisi, et trois événements `charge_board_*` sur le bus.

**Architecture :** le tracker (pur, sans HA) détecte les trois transitions et les met en file (`pop_events`). Un module pur `notifications.py` construit les textes. Le hub, après chaque relevé, publie les événements, envoie les notifications (best-effort) et enregistre l'état des trackers immédiatement.

**Stack :** Python 3.13, Home Assistant 2026.10, pytest + pytest-homeassistant-custom-component.

**Spec :** `docs/superpowers/specs/2026-10-26-charge-board-notifications-design.md` (et la v1 `2026-10-22-charge-board-design.md`).

## Contraintes globales

- Ne pas changer le calcul des sessions de la v1 (énergie, coût, ouverture, clôture) : les 62 tests Python existants restent verts sans modification.
- Le module ne doit **pas** s'appeler `notify.py` (HA le prendrait pour une plateforme notify) : `notifications.py`.
- Démarrage = première période de charge **continue d'au moins 5 minutes** (`STARTED_MIN_S = 300`) de la session ; une seule fois par session.
- Débranchement = clôture d'une session **conservée** (≥ `MIN_SESSION_KWH`) ; titre « débranchée » si `unplugged_at` est renseigné, « Charge terminée » sinon.
- Envoi best-effort : un service de notification absent ou en erreur est journalisé (`LOGGER.warning`) et n'empêche ni l'enregistrement de la session ni les événements.
- Toucher la notification ouvre `/charge-board`.
- Français si `hass.config.language` commence par `fr`, anglais sinon.
- Commandes : `.venv/bin/pytest -q`, `.venv/bin/ruff check . && .venv/bin/ruff format --check .`

## Points de vigilance (relecture)

1. Indisponibilité d'une seconde de l'entité de branchement (à chaque démarrage de HA) : aucun nouveau « branché ». → test tâche 1.
2. Redémarrage de HA voiture branchée, session ouverte et déjà annoncée : aucun « branché » ni « démarré » renvoyé. → tests tâches 1 et 3.
3. Sursaut de charge de quelques secondes au branchement puis pause jusqu'à 22:00 : « démarré » à 22:05, pas à 19:51. → test tâche 1.
4. Reprise après pause (complément du matin) : pas de second « démarré ». → test tâche 1.
5. Service de notification supprimé de HA : la session est quand même enregistrée et l'événement publié. → test tâche 3.

---

### Tâche 1 : transitions dans le tracker

**Fichiers :**
- Modifier : `custom_components/charge_board/tracker.py`, `custom_components/charge_board/const.py`
- Tests : `tests/test_tracker.py`

**Interfaces :**
- Produit :
  - `const.STARTED_MIN_S = 300`
  - `tracker.TrackerEvent` (dataclass) : `kind: str` (`"plugged"`, `"started"`, `"unplugged"`), `t: float`, `session: Session | None = None` (la session close pour `unplugged`, `None` sinon).
  - `SessionTracker.pop_events() -> list[TrackerEvent]` : renvoie les événements accumulés depuis le dernier appel, dans l'ordre, et vide la file.
  - Nouvelles clés de `to_dict` / `from_dict` : `"run_start"` (float | None) et `"start_announced"` (bool).

Règles :
- `plugged` : quand `_absorb` renseigne `_plugged_at` (transition `False → True` existante), `t = sample.t`.
- `started` : dans `_interval`, suivre `_run_start` = début (`a.t`) de la suite d'intervalles de charge consécutifs ; remis à `None` par un intervalle non chargeant ou par un intervalle de reprise (`dt > 2 * TICK_SECONDS`). Quand une session est ouverte, `not _start_announced` et `b.t - _run_start >= STARTED_MIN_S` : émettre `started` (`t = b.t`) et `_start_announced = True`. `_start_announced` repasse à `False` à la clôture de session.
- `unplugged` : quand `feed` renvoie une session conservée (même valeur que le retour), `t = sample.t`. Une session écartée (< `MIN_SESSION_KWH`) n'émet rien.
- `from_dict` : `start_announced` absent → `True` si une session ouverte est restaurée, `False` sinon (mise à jour depuis la v1 : ne pas annoncer une session déjà en cours). La file d'événements n'est pas persistée.

- [ ] **Étape 1 : écrire les tests qui échouent** dans `tests/test_tracker.py` (réutiliser `at`, `make_tracker`, `night`) ; un helper `events(tracker, start, end, make)` qui fait comme `run` mais collecte `[(e.kind, e.t) for e in tracker.pop_events()]` après chaque `feed`.

```python
def test_night_announces_plug_start_and_unplug_once():
    ev = events(make_tracker(), at(21, 50), at(8, 10, 1), night)
    assert [k for k, _ in ev] == ["plugged", "started", "unplugged"]
    assert ev[0][1] == at(21, 58)
    assert ev[1][1] == at(22, 5)  # 5 min de charge continue ; le complément de 07:43 ne réannonce rien
    assert ev[2][1] == at(7, 58, 1)

def test_unplugged_event_carries_the_finished_session():
    tracker = make_tracker()
    t = at(21, 50)
    finished = None
    while t <= at(8, 10, 1):
        finished = tracker.feed(night(t), "twingo") or finished
        last = tracker.pop_events()
        t += 30
        if last and last[-1].kind == "unplugged":
            assert last[-1].session is finished
            return
    pytest.fail("no unplugged event")

def test_short_burst_at_plug_in_is_not_a_start():
    def make(t):
        burst = at(19, 51) <= t < at(19, 52)  # 1 min de charge au branchement
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
    events(tracker, at(21, 50), at(23), night)  # branché + démarré déjà émis
    d = json.loads(json.dumps(tracker.to_dict()))
    restored = SessionTracker.from_dict(d, tracker.settings, lambda: "x")
    assert events(restored, at(23, 0, 0) + 30, at(4), night) == []

def test_v1_state_with_open_session_counts_as_announced():
    tracker = make_tracker()
    events(tracker, at(21, 50), at(23), night)
    d = json.loads(json.dumps(tracker.to_dict()))
    del d["start_announced"], d["run_start"]
    restored = SessionTracker.from_dict(d, tracker.settings, lambda: "x")
    assert [k for k, _ in events(restored, at(23) + 30, at(8, 10, 1), night)] == ["unplugged"]

def test_dropped_empty_session_emits_no_unplugged():
    def make(t):
        return Sample(t=t, power_w=200 if at(19) <= t < at(19, 6) else 0,
                      energy_kwh=0.0, plugged=at(18, 59) <= t < at(19, 30))
    # compteur à 0 : session écartée (< 0,01 kWh), mais 6 min de charge continue => started
    ev = events(make_tracker(), at(18, 50), at(19, 40), make)
    assert [k for k, _ in ev] == ["plugged", "started"]
```

- [ ] **Étape 2 :** `.venv/bin/pytest -q tests/test_tracker.py` → les nouveaux tests échouent (`AttributeError: pop_events`).
- [ ] **Étape 3 : implémenter** `STARTED_MIN_S`, `TrackerEvent`, `pop_events`, les règles ci-dessus et les deux clés de persistance.
- [ ] **Étape 4 :** `.venv/bin/pytest -q` → tout vert (anciens tests inchangés) ; ruff OK.
- [ ] **Étape 5 : commit** `feat: report plug, start and unplug transitions from the tracker`.

---

### Tâche 2 : textes des notifications

**Fichiers :**
- Créer : `custom_components/charge_board/notifications.py`
- Tests : `tests/test_notifications.py`

**Interfaces :**
- Consomme : `model.Session`.
- Produit (fonctions pures, renvoient `(titre, message)`) :
  - `plugged_text(lang: str, charger: str, vehicle: str | None, soc: float | None, target: float | None) -> tuple[str, str]`
  - `started_text(lang: str, charger: str, vehicle: str | None, soc: float | None) -> tuple[str, str]`
  - `summary_text(lang: str, charger: str, vehicle: str | None, session: Session, currency: str) -> tuple[str, str]`
  - `lang` : `"fr"` si la langue HA commence par `fr`, sinon `"en"` (la fonction appelante normalise).

Textes exacts (FR / EN). `·` sépare les éléments d'une ligne ; une ligne ou un élément dont la donnée manque est omis. Nombres FR avec virgule décimale (`15,5`), EN avec point. kWh à 1 décimale, montant à 2 décimales suivi de `€` si `currency == "EUR"`, sinon du code (`2.11 USD`), pourcentages entiers. Durée : `6 h 55` en FR et en EN, minutes sur 2 chiffres ; sous 1 h : `45 min`.

| | FR | EN |
|---|---|---|
| branché, titre | `{vehicle} branchée` ; sans véhicule `Véhicule branché` | `{vehicle} plugged in` ; `Vehicle plugged in` |
| branché, message | `Sur {charger} · batterie {soc} % → objectif {target} %` (sans soc : `· objectif {target} %` ; sans target : `· batterie {soc} %`) | `On {charger} · battery {soc}% → target {target}%` |
| démarré, titre | `Charge démarrée` | `Charging started` |
| démarré, message | `{vehicle} sur {charger} · batterie {soc} %` (sans véhicule : `{charger}`) | `{vehicle} on {charger} · battery {soc}%` |
| résumé, titre | `{vehicle} débranchée` si `unplugged_at`, sinon `Charge terminée` ; sans véhicule et débranché : `Véhicule débranché` | `{vehicle} unplugged` / `Charging finished` / `Vehicle unplugged` |
| résumé, ligne 1 | `{kWh} kWh · {coût}` + ` (estimé)` si `estimated` | `{kWh} kWh · {cost}` + ` (estimated)` |
| résumé, ligne 2 | `{pct} % en heures creuses` (si `has_off_peak_source` et énergie > 0 ; pct = off_peak.kwh / energy_kwh) | `{pct}% off-peak` |
| résumé, ligne 3 | `Batterie {soc_start} % → {soc_end} %` | `Battery {soc_start}% → {soc_end}%` |
| résumé, ligne 4 | `Charge {charging_s} · branchée {unplugged_at − plugged_at}` (2ᵉ partie si les deux heures existent) | `Charged {…} · plugged in {…}` |

Lignes du résumé séparées par `\n`.

- [ ] **Étape 1 : tests qui échouent** (`tests/test_notifications.py`) :

```python
from custom_components.charge_board.model import Session, TariffSlice
from custom_components.charge_board.notifications import plugged_text, started_text, summary_text

def night_session(**kw):
    base = dict(id="s", charger_id="c", plugged_at=0, charge_start=100, unplugged_at=13 * 3600 + 33 * 60,
                charging_s=6 * 3600 + 55 * 60, energy_kwh=15.4758, cost=2.1113,
                off_peak=TariffSlice(15.0458, 2.04), peak=TariffSlice(0.43, 0.07),
                has_off_peak_source=True, soc_start=37, soc_end=93)
    base.update(kw)
    return Session(**base)

def test_plugged_fr():
    assert plugged_text("fr", "Chargeur garage", "Twingo", 37, 80) == (
        "Twingo branchée", "Sur Chargeur garage · batterie 37 % → objectif 80 %")

def test_plugged_without_level_or_vehicle():
    assert plugged_text("fr", "Chargeur garage", None, None, None) == (
        "Véhicule branché", "Sur Chargeur garage")

def test_started_en():
    assert started_text("en", "Garage", "Twingo", 37.4) == (
        "Charging started", "Twingo on Garage · battery 37%")

def test_summary_fr():
    assert summary_text("fr", "Chargeur garage", "Twingo", night_session(), "EUR") == (
        "Twingo débranchée",
        "15,5 kWh · 2,11 €\n97 % en heures creuses\nBatterie 37 % → 93 %\nCharge 6 h 55 · branchée 13 h 33")

def test_summary_degraded_and_gap_closed():
    s = night_session(unplugged_at=None, cost=None, estimated=True, has_off_peak_source=False,
                      soc_start=None, soc_end=None, charging_s=45 * 60)
    assert summary_text("en", "Garage", None, s, "EUR") == (
        "Charging finished", "15.5 kWh (estimated)\nCharged 45 min")
```

- [ ] **Étape 2 :** `.venv/bin/pytest -q tests/test_notifications.py` → échec (module absent).
- [ ] **Étape 3 : implémenter** les trois fonctions (tables de textes FR/EN dans le module, pas de fichier de traduction).
- [ ] **Étape 4 :** tests verts, ruff OK.
- [ ] **Étape 5 : commit** `feat: notification texts`.

---

### Tâche 3 : envoi, événements et options

**Fichiers :**
- Modifier : `custom_components/charge_board/hub.py`, `config_flow.py`, `websocket_api.py`, `const.py`, `translations/fr.json`, `translations/en.json`, `README.md`
- Tests : `tests/test_hub.py`, `tests/test_config_flow.py`

**Interfaces :**
- Consomme : `SessionTracker.pop_events()`, `TrackerEvent` (tâche 1) ; `plugged_text`, `started_text`, `summary_text` (tâche 2) ; `SessionStore.async_flush_trackers()` (existant).
- Produit :
  - `const.NOTIFICATIONS = ["plugged", "started", "unplugged"]`, `const.EVENT_PREFIX = "charge_board_"`.
  - Options : `notify_service` (str, nom du service sans `notify.`, ex. `mobile_app_iphone` ; absent = pas de notification) et `notifications` (liste, défaut `NOTIFICATIONS`).
  - `Hub.target_for(vehicle_id: str | None) -> float | None` : entité `target_entity` si numérique, sinon `target_fixed` ; `websocket_api.overview` l'utilise à la place de son calcul en ligne.

Comportement du hub (`_feed_all`) : après chaque `feed`, pour chaque événement de `pop_events()`, dans l'ordre :
1. `hass.bus.async_fire(f"charge_board_{kind}", data)` avec `data` = `charger_id`, `charger_name`, `vehicle_id`, `vehicle_name` (ou `None`), puis : `plugged` → `soc`, `target` ; `started` → `charge_start` (de la session courante), `soc` ; `unplugged` → `session` (`Session.to_dict()`).
2. Si `notify_service` est renseigné et `kind` dans `notifications` : construire le texte (langue `fr` si `hass.config.language` commence par `fr`), puis appeler `notify.<service>` avec `title`, `message`, `data={"url": "/charge-board", "clickAction": "/charge-board"}`, dans une tâche (`entry.async_create_background_task`) qui intercepte toute exception et journalise un avertissement.
3. S'il y a eu au moins un événement dans ce passage : `entry.async_create_task(hass, store.async_flush_trackers())` après la mise à jour de `trackers_state`, au lieu de la sauvegarde différée.

Le véhicule, la batterie et le niveau visé sont lus au moment de l'envoi (`vehicle_for`, `_number(soc_entity)`, `target_for`).

Formulaire d'options : ajouter `notify_service` (SelectSelector, options = services du domaine `notify` dont le nom commence par `mobile_app_`, triés ; `custom_value` non ; optionnel) et `notifications` (SelectSelector multiple, `translation_key="notifications"`, défaut les trois). Le schéma devient dynamique (construit dans `async_step_init`) ; le reste du formulaire ne change pas. Traductions FR/EN : libellés « Téléphone à notifier » / « Notifications actives » et les trois choix « Branchement » / « Démarrage de la charge » / « Débranchement (résumé) ».

README (EN/FR) : section courte « Notifications » : réglage, les trois messages, les trois événements et leurs données.

- [ ] **Étape 1 : tests qui échouent.** Dans `tests/test_hub.py`, une fixture `notify_setup` comme `setup` mais avec `options={..., "notify_service": "mobile_app_iphone"}`, la prise `binary_sensor.plug` à `off` au départ et `calls = async_mock_service(hass, "notify", "mobile_app_iphone")` enregistré avant la configuration ; `async_capture_events` pour les trois événements.

```python
async def test_plug_start_unplug_notify_once_each(hass, notify_setup, freezer):
    entry, cid, calls, ev = notify_setup
    hass.states.async_set("binary_sensor.plug", "on"); await hass.async_block_till_done()
    await _run(hass, freezer, 900)                      # 15 min de charge
    hass.states.async_set("sensor.p", "0", {"unit_of_measurement": "W"})
    hass.states.async_set("binary_sensor.plug", "off"); await hass.async_block_till_done()
    titles = [c.data["title"] for c in calls]
    assert titles == ["Twingo plugged in", "Charging started", "Twingo unplugged"]
    assert calls[0].data["data"]["url"] == "/charge-board"
    assert [e.event_type for e in ev] == ["charge_board_plugged", "charge_board_started", "charge_board_unplugged"]
    assert ev[2].data["session"]["energy_kwh"] > 0

async def test_reload_mid_session_sends_nothing_new(hass, notify_setup, freezer):
    entry, cid, calls, ev = notify_setup
    hass.states.async_set("binary_sensor.plug", "on"); await hass.async_block_till_done()
    await _run(hass, freezer, 600)
    n = len(calls)
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    await _run(hass, freezer, 300)
    assert len(calls) == n

async def test_disabled_notification_still_fires_event(hass, ...):   # options notifications=["unplugged"]
    ...  # branchement : événement charge_board_plugged présent, aucun appel notify

async def test_missing_notify_service_does_not_lose_the_session(hass, ...):  # notify_service="mobile_app_gone", non enregistré
    ...  # cycle complet : store.sessions a 1 session, charge_board_unplugged publié, pas d'exception
```

Dans `tests/test_config_flow.py` : `test_options_flow_lists_phones_and_stores_notifications` — enregistrer `notify.mobile_app_iphone` et `notify.persistent_notification` ; le sélecteur ne propose que `mobile_app_iphone` ; soumettre `{"notify_service": "mobile_app_iphone", "notifications": ["unplugged"]}` → options enregistrées telles quelles.

- [ ] **Étape 2 :** `.venv/bin/pytest -q tests/test_hub.py tests/test_config_flow.py` → échecs attendus.
- [ ] **Étape 3 : implémenter** (hub, `target_for` + usage dans `overview`, options, traductions, README).
- [ ] **Étape 4 :** `.venv/bin/pytest -q` tout vert ; ruff OK ; `cd frontend && npm test` inchangé et vert.
- [ ] **Étape 5 : commit** `feat: send plug, start and unplug notifications and events`.
