# Charge Board v1 — plan de développement

> **Pour les agents :** sous-compétence REQUISE : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases (`- [ ]`) pour le suivi.

**Objectif :** une intégration Home Assistant qui enregistre les sessions de recharge à partir d'entités existantes (chargeur, véhicule, tarif) et les affiche dans un panneau « Recharge » (onglets Aperçu et Sessions), avec corrections.

**Architecture :** le cœur est **pur** (sans Home Assistant) et testé seul : `model.py` (session et sérialisation), `tracker.py` (machine à états d'une session, alimentée par des échantillons), `corrections.py` (véhicule, fusion, coupe). Une couche Home Assistant mince (`hub.py`) lit les entités, fabrique les échantillons, persiste via `Store`, expose une API websocket (`websocket_api.py`) et quelques entités. Le panneau est un module Lit compilé par esbuild en un seul fichier servi par l'intégration.

**Pile technique :** Python 3.13, Home Assistant ≥ 2025.6 (sous-entrées de configuration), pytest + pytest-homeassistant-custom-component, ruff ; TypeScript + Lit 3 + esbuild, vitest pour les utilitaires du panneau.

**Spécification :** `docs/superpowers/specs/2026-10-22-charge-board-design.md` (à lire avec ce plan).

## Contraintes globales

- Domaine `charge_board`, nom affiché « Charge Board », panneau « Recharge » (icône `mdi:ev-station`), URL `charge-board`.
- Configuration 100 % interface (config flow + sous-entrées) ; aucun YAML.
- L'intégration **ne commande rien** en v1 (aucun appel de service vers le chargeur).
- Sans niveau de batterie : `soc_start` / `soc_end` à `None`, affichés « — » ; jamais d'estimation.
- Sans prix configuré : coût `None` (« inconnu »), jamais 0.
- Session = du premier début de charge à la dernière fin de charge d'une période de branchement ; pauses non coupantes ; sans entité de branchement, coupure après `gap_hours` = **3 h** par défaut ; « en charge » si puissance > `power_threshold_w` = **100 W** par défaut (réglables par chargeur).
- Une session sans énergie (< 0,01 kWh) n'est pas enregistrée.
- Coût au fil de l'eau : chaque incrément d'énergie × prix en vigueur à cet instant.
- Batterie : début = dernière valeur connue au début de charge (ou au branchement si plus récente) ; fin = dernière valeur reçue avant débranchement (sans branchement : avant clôture).
- Devise : `hass.config.currency` ; fuseau et formats de Home Assistant.
- Langues : français et anglais (intégration et panneau).
- Corrections : seulement sur une session terminée ; marque `edited` ; pas d'historique ni d'annulation.

## Revue : points d'attention

1. **Capteur indisponible / `unknown`** pendant une charge : aucun incrément inventé ; la période est ignorée, pas comptée à 0 W ni à la dernière valeur. → test dans la tâche 2.
2. **Compteur d'énergie qui retombe à 0 en cours de session** (le dé `qccdz` remet son compteur à zéro à chaque nouvelle session ; d'autres chargeurs à chaque reprise) : la baisse est traitée comme une remise à zéro, l'énergie n'est ni perdue ni négative. → test dans la tâche 2.
3. **Puissance en kW ou en W** selon le capteur (`unit_of_measurement`) : le dé publie des kW. → test dans la tâche 5.
4. **Redémarrage de Home Assistant en pleine charge** : la session ouverte est restaurée, l'énergie manquante (via le compteur) est ajoutée au tarif du retour et la session marquée `estimated`. → test dans la tâche 3.
5. **Puissance stable pendant des heures** (aucun changement d'état, donc aucun événement) : un tick périodique de 30 s alimente le suivi pour que l'énergie intégrée et les tranches tarifaires restent justes. → test dans la tâche 5.

---

## Structure des fichiers

```
hacs.json · pyproject.toml · requirements_test.txt · README.md · .github/workflows/validate.yml
custom_components/charge_board/
  __init__.py          setup/unload de l'entrée, création du Hub, panneau, websocket
  manifest.json · const.py · strings.json · translations/{en,fr}.json
  config_flow.py       entrée principale (tarif, style d'aperçu) + sous-entrées chargeur / véhicule
  model.py             Session, TariffSlice, CurvePoint, (dé)sérialisation          [pur]
  tracker.py           Sample, SessionTracker (bornes, énergie, coût, courbe, batterie) [pur]
  corrections.py       change_vehicle, merge_sessions, split_session                 [pur]
  estimate.py          estimate_end(...)                                             [pur]
  store.py             SessionStore (Store HA : sessions terminées + sessions ouvertes)
  hub.py               Hub : lecture des entités → Sample, tick 30 s, persistance
  select.py            sélection « Véhicule » par chargeur
  sensor.py            énergie et coût de la session en cours par chargeur
  websocket_api.py     commandes charge_board/*
  panel.py             enregistrement du panneau et du fichier JS
  frontend/charge-board-panel.js   (compilé, commité)
frontend/  package.json · tsconfig.json · build.mjs · src/{panel,overview,sessions,session-detail,format,api,i18n}.ts · test/*.test.ts
tests/  conftest.py · test_model.py · test_tracker.py · test_corrections.py · test_estimate.py · test_config_flow.py · test_hub.py · test_websocket.py
```

---

### Tâche 1 : Squelette installable

**Fichiers :**
- Créer : `hacs.json`, `pyproject.toml`, `requirements_test.txt`, `.github/workflows/validate.yml`, `custom_components/charge_board/{__init__.py,manifest.json,const.py}`, `tests/conftest.py`, `tests/test_init.py`

**Interfaces :**
- Produit : `const.DOMAIN = "charge_board"`, `DEFAULT_GAP_HOURS = 3`, `DEFAULT_POWER_THRESHOLD_W = 100`, `MIN_SESSION_KWH = 0.01`, `TICK_SECONDS = 30` ; `async_setup_entry(hass, entry) -> bool`, `async_unload_entry(hass, entry) -> bool` (vides pour l'instant).

- [ ] **Étape 1 : test qui échoue** — `tests/test_init.py::test_entry_sets_up_and_unloads` : crée un `MockConfigEntry(domain="charge_board")`, `await hass.config_entries.async_setup(entry.entry_id)` → `entry.state is ConfigEntryState.LOADED`, puis unload → `NOT_LOADED`.
- [ ] **Étape 2 :** `pytest tests/test_init.py -v` → échec (module introuvable).
- [ ] **Étape 3 :** écrire le squelette. `manifest.json` : `domain`, `name: "Charge Board"`, `version: "0.1.0"`, `config_flow: true`, `integration_type: "service"`, `iot_class: "calculated"`, `dependencies: ["http", "frontend", "panel_custom", "websocket_api"]`, `codeowners: ["@BTexier"]`, `documentation`/`issue_tracker` vers `github.com/BTexier/ha-charge-board`. `hacs.json` : `{"name": "Charge Board", "homeassistant": "2025.6.0", "render_readme": true}`. `pyproject.toml` : ruff (ligne 100) et pytest (`asyncio_mode = "auto"`). `requirements_test.txt` : `pytest-homeassistant-custom-component`. Workflow : hassfest, validation HACS, ruff, pytest, `npm ci && npm test && npm run build` puis échec si `git diff --exit-code custom_components/charge_board/frontend` n'est pas vide.
- [ ] **Étape 4 :** `pytest -v` → PASS ; `ruff check .` → propre.
- [ ] **Étape 5 :** commit `chore: installable skeleton`.

### Tâche 2 : Modèle et suivi d'une session (pur)

**Fichiers :** Créer `model.py`, `tracker.py`, `tests/test_model.py`, `tests/test_tracker.py`

**Interfaces :**
- Produit (`model.py`) :
  - `TariffSlice(kwh: float = 0.0, cost: float | None = None)`.
  - `CurvePoint(t: float, w: float)` — `t` en secondes Unix, `w` puissance moyenne de l'intervalle.
  - `Session` (dataclass) : `id: str`, `charger_id: str`, `vehicle_id: str | None`, `plugged_at`, `charge_start`, `charge_end`, `unplugged_at: float | None` (secondes Unix), `charging_s: float`, `energy_kwh: float`, `cost: float | None`, `off_peak: TariffSlice`, `peak: TariffSlice`, `by_price: dict[str, TariffSlice]` (clé = prix formaté `"0.1356"`, `"none"` si pas de prix), `has_off_peak_source: bool`, `soc_start`, `soc_end: float | None`, `curve: list[CurvePoint]`, `estimated: bool`, `edited: bool`, `open: bool`.
  - `Session.to_dict() -> dict`, `Session.from_dict(d: dict) -> Session` (clés absentes → valeurs par défaut).
- Produit (`tracker.py`) :
  - `Sample(t: float, power_w: float | None, energy_kwh: float | None, plugged: bool | None, price: float | None, off_peak: bool | None, soc: float | None)` — `None` = inconnu / indisponible.
  - `TrackerSettings(power_threshold_w: float, gap_hours: float, priced: bool, curve_step_s: int = 300)`.
  - `SessionTracker(charger_id: str, settings: TrackerSettings, new_id: Callable[[], str])` avec `feed(sample: Sample, vehicle_id: str | None) -> Session | None` (renvoie la session **terminée** quand elle se clôt, sinon `None`), propriété `current: Session | None`, `to_dict()` / `from_dict(...)` pour restaurer l'état (session ouverte + dernier échantillon).

Règles à implémenter dans `feed` (décisions de la spécification) :
- Énergie de l'intervalle : avec `energy_kwh` connu aux deux bornes, `delta = e1 - e0`, et si `delta < 0` alors `delta = e1` (remise à zéro) ; sinon intégration trapèze de la puissance si les deux puissances sont connues ; sinon 0 (inconnu → rien d'inventé).
- Coût de l'intervalle : `delta × prix` avec le prix de l'échantillon **de début** d'intervalle ; prix `None` → dernier prix connu ; jamais de prix et `priced` → session marquée `estimated` ; `priced=False` → `cost=None` partout.
- Tranche : `off_peak` de l'échantillon de début (`None` → tranche `peak`, `has_off_peak_source=False`).
- Bornes : ouverture au premier intervalle où la puissance > seuil ; `plugged_at` = dernier passage `plugged` False→True avant l'ouverture ; clôture au passage `plugged` True→False (`unplugged_at`), ou, sans information de branchement (`plugged is None`), quand aucune charge depuis `gap_hours` ; `charge_end` = fin du dernier intervalle en charge.
- Courbe : points moyennés par pas de `curve_step_s` (300 s).
- Batterie : règles de la spécification §5.

- [ ] **Étape 1 : tests qui échouent** (`tests/test_tracker.py`, horloge simulée, échantillons toutes les 30 s) :
  - `test_night_with_top_up_is_one_session` : 22:00→04:56 à 2 200 W en HC à 0,1356, pause, 07:43→07:55 à 2 200 W en HP à 0,1654, `plugged=True` jusqu'à 07:58 → une seule session ; `charge_start` 22:00, `charge_end` 07:55, `unplugged_at` 07:58 ; `off_peak.kwh` ≈ 15,2 (±0,1) ; `cost` ≈ `off_peak.kwh*0.1356 + peak.kwh*0.1654`.
  - `test_energy_counter_reset_is_not_lost` : compteur 0→5,0 kWh puis 0,0→2,0 → `energy_kwh == 7.0`.
  - `test_unavailable_power_adds_nothing` : puissance `None` pendant 1 h au milieu → énergie égale à celle des seules périodes connues.
  - `test_no_plug_info_splits_after_gap` : sans `plugged`, deux charges séparées de 3 h 05 → deux sessions ; séparées de 2 h → une.
  - `test_below_threshold_is_not_charging` : 60 W pendant 2 h → aucune session.
  - `test_unpriced_cost_is_none` : `priced=False` → `cost is None`, `off_peak.cost is None`.
  - `test_soc_end_is_last_before_unplug` : soc 40 au début, 95 à la fin de charge, 100 reçu 10 min après la fin de charge mais avant débranchement → `soc_start == 40`, `soc_end == 100`.
  - `test_no_soc_stays_none` : `soc=None` partout → `soc_start is None and soc_end is None`.
  - `test_empty_plug_session_is_dropped` : branché puis débranché sans charge → `feed` ne renvoie aucune session.
  - `tests/test_model.py::test_round_trip` : `Session.from_dict(s.to_dict()) == s` et `Session.from_dict({"id": "x", "charger_id": "c"})` donne les valeurs par défaut.
- [ ] **Étape 2 :** `pytest tests/test_tracker.py tests/test_model.py -v` → échecs.
- [ ] **Étape 3 :** implémenter `model.py` et `tracker.py` selon les interfaces et règles ci-dessus.
- [ ] **Étape 4 :** les tests passent.
- [ ] **Étape 5 :** commit `feat: pure session tracker`.

### Tâche 3 : Restauration après redémarrage et estimation de fin (pur)

**Fichiers :** Modifier `tracker.py` ; créer `estimate.py`, `tests/test_estimate.py` ; compléter `tests/test_tracker.py`

**Interfaces :**
- Consomme : `SessionTracker`, `Sample` (tâche 2).
- Produit : `SessionTracker.to_dict()/from_dict(d, settings, new_id)` ; règle : si l'écart entre le dernier échantillon restauré et le premier nouvel échantillon dépasse `2 × TICK_SECONDS`, l'énergie de l'intervalle (via compteur seulement) est ajoutée au prix et à la tranche du **nouvel** échantillon, et `estimated = True` ; sans compteur, rien n'est ajouté pour l'intervalle et `estimated = True`.
- Produit : `estimate_end(now: float, soc: float | None, target: float | None, capacity_kwh: float | None, power_w: float | None) -> float | None` — `None` si une donnée manque, si `power_w <= 0` ou si `soc >= target` ; sinon `now + (target - soc) / 100 * capacity_kwh / (power_w / 1000) * 3600`.

- [ ] **Étape 1 : tests qui échouent** :
  - `test_restart_mid_session_with_counter` : session ouverte à 3,0 kWh, restaurée par `from_dict`, nouvel échantillon 2 h plus tard avec compteur à 7,0 → `energy_kwh == 7.0`, `estimated is True`, coût ajouté au prix du nouvel échantillon.
  - `test_restart_without_counter_marks_estimated` : même scénario sans compteur → énergie inchangée sur l'intervalle, `estimated is True`.
  - `test_estimate_end` : `estimate_end(0, 40, 100, 27.5, 2200) == pytest.approx(16.5 / 2.2 * 3600)` ; `estimate_end(0, None, 100, 27.5, 2200) is None` ; `estimate_end(0, 100, 100, 27.5, 2200) is None`.
- [ ] **Étape 2 :** échecs vérifiés.
- [ ] **Étape 3 :** implémenter.
- [ ] **Étape 4 :** tests verts.
- [ ] **Étape 5 :** commit `feat: restore an open session and estimate the end`.

### Tâche 4 : Corrections (pur)

**Fichiers :** Créer `corrections.py`, `tests/test_corrections.py`

**Interfaces :**
- Consomme : `Session`, `TariffSlice`, `CurvePoint`.
- Produit : `change_vehicle(s: Session, vehicle_id: str) -> Session` ; `merge_sessions(a: Session, b: Session) -> Session` (lève `ValueError` si chargeurs différents ou si l'une est `open`) ; `split_session(s: Session, at: float, new_id: str) -> tuple[Session, Session]` (lève `ValueError` si `at` hors de `]charge_start, charge_end[` ou si `open`). Toutes renvoient des sessions `edited=True`.
- Règles : fusion — énergies, coûts, tranches, `by_price`, `charging_s` additionnés, courbes concaténées triées, `plugged_at`/`charge_start`/`soc_start` de la plus ancienne, `charge_end`/`unplugged_at`/`soc_end` de la plus récente, `estimated` = OU, `id` de la plus ancienne. Coupe — énergie de chaque côté = intégrale de la courbe de chaque côté ; tranches, `by_price` et coût répartis au prorata de cette énergie ; première partie : `charge_end = at`, `unplugged_at = None`, `soc_end = None` ; seconde : `charge_start = at`, `plugged_at = None`, `soc_start = None`. Changement de véhicule : seul `vehicle_id` change, les niveaux restent.

- [ ] **Étape 1 : tests qui échouent** : `test_merge_adds_up_and_keeps_bounds`, `test_merge_refuses_other_charger`, `test_merge_refuses_open_session`, `test_split_conserves_energy_and_cost` (somme des deux = original à 1e-6), `test_split_outside_bounds_raises`, `test_change_vehicle_keeps_soc`, chacun vérifiant `edited is True` sur le résultat.
- [ ] **Étape 2 :** échecs vérifiés.
- [ ] **Étape 3 :** implémenter.
- [ ] **Étape 4 :** tests verts.
- [ ] **Étape 5 :** commit `feat: session corrections`.

### Tâche 5 : Configuration et Hub (Home Assistant)

**Fichiers :** Créer `config_flow.py`, `strings.json`, `translations/{en,fr}.json`, `store.py`, `hub.py`, `select.py`, `sensor.py`, `tests/test_config_flow.py`, `tests/test_hub.py` ; modifier `__init__.py`, `const.py`

**Interfaces :**
- Entrée principale (une seule par instance, `single_config_entry`) — options : `price_entity` (facultatif), `off_peak_price`, `peak_price` (facultatifs, €/kWh), `off_peak_entity` (facultatif, binaire), `off_peak_windows` (texte `"22:00-06:00"`, facultatif), `overview_style` (`"detailed"` par défaut ou `"compact"`).
- Sous-entrée `charger` : `name`, `power_entity` (obligatoire), `energy_entity`, `plug_entity`, `plugged_states` (liste ; vide = capteur binaire `on`), `switch_entity`, `power_threshold_w` (100), `gap_hours` (3).
- Sous-entrée `vehicle` : `name`, `capacity_kwh`, `soc_entity`, `target_entity`, `target_fixed` (100).
- `store.SessionStore(hass, entry_id)` : `async_load()`, `sessions: list[Session]` (terminées, plus récentes en premier), `async_add(s)`, `async_replace(ids_removed: list[str], added: list[Session])`, `trackers_state: dict[str, dict]` + `async_save_trackers()` (sauvegarde différée 30 s). Concrètement : un fichier pour les sessions terminées (réécrit seulement à la clôture ou à une correction), un pour les sessions ouvertes. *ponytail : un seul fichier JSON pour toutes les sessions terminées ; découper par année si la taille dépasse quelques Mo.*
- `hub.Hub(hass, entry)` : `async_start()`, `async_stop()`, `sample_for(charger_id) -> Sample` (lit les entités du chargeur et le `soc_entity` du véhicule sélectionné ; puissance convertie en W selon `unit_of_measurement` `kW`/`W` ; `plugged` = état `on` d'un binaire ou état présent dans `plugged_states`, `None` sans `plug_entity` ; états `unavailable`/`unknown` → `None`), `vehicle_for(charger_id) -> str | None` (valeur de la sélection), `live(charger_id) -> dict` (état pour l'aperçu), écoute `async_track_state_change_event` sur toutes les entités configurées + `async_track_time_interval` de `TICK_SECONDS` ; à chaque clôture : `store.async_add`, puis `async_dispatcher_send(hass, f"{DOMAIN}_updated")`.
- Prix : `price_entity` si configuré, sinon `off_peak_price`/`peak_price` selon la source heures creuses ; `priced = price_entity or off_peak_price or peak_price`.
- Entités : `select.<chargeur>_vehicule` (options = noms des véhicules, défaut = premier véhicule, restaurée) ; `sensor.<chargeur>_energie_session` (kWh) et `sensor.<chargeur>_cout_session` (device_class `monetary`, unité `hass.config.currency`, sans `state_class`).

- [ ] **Étape 1 : tests qui échouent** :
  - `test_config_flow.py::test_main_entry_then_charger_and_vehicle` : création de l'entrée, ajout d'une sous-entrée chargeur avec `power_entity` et d'une sous-entrée véhicule → les données sont stockées comme ci-dessus.
  - `test_hub.py::test_power_in_kw_is_converted` : capteur `2.2` avec unité `kW` → `sample_for(...).power_w == 2200`.
  - `test_hub.py::test_unavailable_is_none` : état `unavailable` → `power_w is None`.
  - `test_hub.py::test_steady_power_still_accumulates` : puissance fixe 2 200 W sans changement d'état, avancer l'horloge de 1 h (`async_fire_time_changed`) → `live(...)["energy_kwh"] ≈ 2.2`.
  - `test_hub.py::test_session_persists_and_is_announced` : charge puis débranchement → une session dans `store.sessions` et le signal `charge_board_updated` reçu.
  - `test_hub.py::test_open_session_survives_reload` : session ouverte, reload de l'entrée → la session ouverte est restaurée (énergie conservée).
- [ ] **Étape 2 :** échecs vérifiés.
- [ ] **Étape 3 :** implémenter (config flow avec `ConfigSubentryFlow` pour `charger` et `vehicle`, sélecteurs d'entités ; libellés FR/EN).
- [ ] **Étape 4 :** `pytest -v` → tout vert.
- [ ] **Étape 5 :** commit `feat: configuration, hub, entities`.

### Tâche 6 : API websocket

**Fichiers :** Créer `websocket_api.py`, `tests/test_websocket.py` ; modifier `__init__.py`

**Interfaces :**
- Consomme : `Hub`, `SessionStore`, `corrections.*`, `estimate_end`.
- Produit (commandes, toutes admin non requises, réponses JSON) :
  - `charge_board/overview` → `{"style": "detailed"|"compact", "currency": str, "chargers": [{"id", "name", "state": "charging"|"plugged"|"free", "vehicle": {"id","name","soc","target","capacity_kwh"}|None, "power_w", "session": Session.to_dict()|None, "estimated_end": float|None, "last_session": Session.to_dict()|None}]}`.
  - `charge_board/sessions` `{vehicle_id?, charger_id?, month?: "YYYY-MM"}` → `{"sessions": [...], "summary": {"count", "energy_kwh", "cost", "off_peak_share"}}` ; le mois est évalué dans le fuseau de Home Assistant sur `charge_start`. `off_peak_share` = `None` si aucune session n'a de source heures creuses.
  - `charge_board/session` `{session_id}` → `Session.to_dict()` + `vehicle_name`, `charger_name`.
  - `charge_board/set_vehicle` `{session_id, vehicle_id}`, `charge_board/delete` `{session_id}`, `charge_board/merge` `{session_id, other_id}`, `charge_board/split` `{session_id, at}` → `{"sessions": [ids résultants]}` ; erreur `invalid` avec le message de `ValueError` ; erreur `not_found` ; refus `in_progress` si la session est ouverte.
  - `charge_board/subscribe` → événement à chaque signal `charge_board_updated` et à chaque tick (aperçu à jour).

- [ ] **Étape 1 : tests qui échouent** (`hass_ws_client`) : `test_sessions_month_filter_uses_local_time` (session commencée le 31/10 à 23:30 heure de Paris → mois `2026-10`) ; `test_summary_without_off_peak_source_is_none` ; `test_merge_then_list` ; `test_split_open_session_is_refused` (`in_progress`) ; `test_delete_unknown_is_not_found` ; `test_overview_estimated_end_only_when_known`.
- [ ] **Étape 2 :** échecs vérifiés.
- [ ] **Étape 3 :** implémenter (`websocket_api.async_register_command`, schémas voluptuous).
- [ ] **Étape 4 :** tests verts.
- [ ] **Étape 5 :** commit `feat: websocket api`.

### Tâche 7 : Panneau — socle et onglet Aperçu

**Fichiers :** Créer `frontend/{package.json,tsconfig.json,build.mjs}`, `frontend/src/{panel.ts,overview.ts,api.ts,format.ts,i18n.ts}`, `frontend/test/format.test.ts`, `custom_components/charge_board/panel.py`, `custom_components/charge_board/frontend/charge-board-panel.js` (compilé) ; modifier `__init__.py`

**Interfaces :**
- Consomme : commandes `charge_board/overview` et `charge_board/subscribe`.
- Produit : élément `charge-board-panel` (propriétés `hass`, `narrow`, `route`, `panel` fournies par HA) avec onglets « Aperçu » / « Sessions » (`ha-tab-group` ou onglets maison au thème HA) ; `api.ts` : fonctions typées pour chaque commande ; `format.ts` : `formatEnergy(kwh, locale)`, `formatCost(value, currency, locale)` (renvoie « — » pour `null`), `formatDuration(seconds, lang)` (`"6 h 55"`), `formatSoc(start, end)` (`"40 → 100 %"` ou `"—"`) ; `i18n.ts` : textes FR/EN choisis selon `hass.language`.
- `panel.py` : `async_register_panel(hass)` — sert `frontend/charge-board-panel.js` via `hass.http.async_register_static_paths` (cache désactivé en dev, URL suffixée par la version du manifest) et `panel_custom.async_register_panel(frontend_url_path="charge-board", webcomponent_name="charge-board-panel", sidebar_title="Recharge", sidebar_icon="mdi:ev-station", require_admin=False)` ; retiré à l'unload.
- Aperçu : cartes conformes à `docs/superpowers/mockups/apercu-v1.html` (détaillée par défaut, compacte si `style == "compact"`, la tuile compacte ouvre le détail au toucher) ; couleurs et typographie via les variables CSS de HA (`--primary-color`, `--card-background-color`, etc.) pour le thème clair/sombre ; mise en page une colonne sous 600 px.

- [ ] **Étape 1 : tests qui échouent** (`vitest`) : `formatDuration(24900, "fr") === "6 h 55"`, `formatCost(null, "EUR", "fr") === "—"`, `formatCost(2.1323, "EUR", "fr") === "2,13 €"`, `formatSoc(null, null) === "—"`, `formatSoc(40, 100) === "40 → 100 %"`.
- [ ] **Étape 2 :** `npm test` → échecs.
- [ ] **Étape 3 :** implémenter les utilitaires, le panneau, l'onglet Aperçu, `panel.py` ; `npm run build` produit `custom_components/charge_board/frontend/charge-board-panel.js`.
- [ ] **Étape 4 :** `npm test` vert ; `pytest` vert ; vérification visuelle sur une instance de test (`hass` de développement ou instance de Baptiste) : le panneau « Recharge » apparaît dans la barre latérale et affiche une carte par chargeur, en clair et en sombre, sur mobile.
- [ ] **Étape 5 :** commit `feat: panel shell and overview tab`.

### Tâche 8 : Onglet Sessions — liste, détail, corrections

**Fichiers :** Créer `frontend/src/{sessions.ts,session-detail.ts,chart.ts}`, `frontend/test/chart.test.ts` ; recompiler `charge-board-panel.js`

**Interfaces :**
- Consomme : `charge_board/sessions`, `charge_board/session`, `set_vehicle`, `delete`, `merge`, `split` ; utilitaires `format.ts`.
- Produit : liste conforme à `docs/superpowers/mockups/sessions-v2.html` — filtres véhicule / chargeur / mois (mois courant par défaut), bandeau (nombre, kWh, coût, part HC ou « — »), colonnes Début (début de charge), Fin (fin de charge), Véhicule, Batterie, kWh, Durée de charge, Coût (« * » si `estimated`, badge « modifiée » si `edited`) ; détail : chiffres clés, graphique SVG maison (courbe de puissance, fond HC/HP déduit des points de courbe et des tranches ; pas de bibliothèque de graphiques), les quatre heures, énergie et coût par tranche, temps de charge / temps branché ; actions : changer le véhicule (liste), supprimer (confirmation), fusionner avec la précédente / la suivante du même chargeur, couper (clic sur le graphique → confirmation avec l'heure choisie). Actions masquées pour une session ouverte.
- `chart.ts` : `timeAt(x: number, width: number, start: number, end: number) -> number` et `pathFor(curve, width, height) -> string`.

- [ ] **Étape 1 : tests qui échouent** : `timeAt(50, 100, 0, 3600) === 1800` ; `pathFor([], 100, 50) === ""` ; `pathFor` de deux points renvoie un chemin `M… L…`.
- [ ] **Étape 2 :** échecs vérifiés.
- [ ] **Étape 3 :** implémenter liste, détail, graphique et actions.
- [ ] **Étape 4 :** `npm test` et `pytest` verts ; vérification visuelle : filtrer, ouvrir un détail, couper puis fusionner une session de test et constater la marque « modifiée ».
- [ ] **Étape 5 :** commit `feat: sessions tab with detail and corrections`.

### Tâche 9 : Installation chez Baptiste et validation réelle

**Fichiers :** Créer `README.md` (FR/EN : installation HACS, configuration chargeur/véhicule/tarif, mode dégradé, limites) ; dépôt GitHub `BTexier/ha-charge-board`

- [ ] **Étape 1 :** créer le dépôt GitHub, pousser, vérifier la CI verte.
- [ ] **Étape 2 :** installer par HACS (dépôt personnalisé) sur l'instance de Baptiste, redémarrer, configurer selon la spécification §8 : chargeur dé (`sensor.tuya_ev_charger_puissance_totale`, `sensor.tuya_ev_charger_energie_de_la_session`, branchement `sensor.tuya_ev_charger_statut` avec états branchés `plugged_in, charging, waiting, paused, charged`) ; véhicule Twingo 27,5 kWh (`sensor.twingo_batterie`, `number.twingo_niveau_de_charge_cible`) ; tarif `sensor.tarif_actuel_tempo_6kva_ttc` + `binary_sensor.rte_tempo_heures_creuses`.
- [ ] **Étape 3 :** après une charge de nuit : la session apparaît avec début/fin de charge, branchement/débranchement, 40→100 % (ou les vraies valeurs), kWh égaux à `sensor.tuya_ev_charger_energie_de_la_session` (±0,05), coût égal à Σ kWh × prix Tempo par tranche (comparaison avec les statistiques horaires, comme pour les nuits du 18→19 et 20→21/10).
- [ ] **Étape 4 :** consigner le résultat dans la note de session du coffre et dans la fiche `Projets/Charge Board.md` ; commit `docs: readme`.
