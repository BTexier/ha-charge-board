# Statistiques, Véhicules et objectif maison : plan de développement

> **Pour les agents :** sous-compétence requise : superpowers:subagent-driven-development ou superpowers:executing-plans, tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** onglets « Statistiques » et « Véhicules », capteur de consommation par véhicule, coupure de charge à l'objectif maison.

**Architecture :**
- **Calculs purs** dans deux modules sans dépendance à HA : `stats.py` (agrégats mensuels, essence, consommation) et `target.py` (décision de coupure).
- **Hub** : il lit HA (états, statistiques long terme du recorder, interrupteur) et fige le kilométrage, le prix de l'essence et la conso de référence dans chaque session.
- **Websocket** : deux commandes, `charge_board/stats` et `charge_board/vehicle`.
- **Panneau** : deux onglets Lit. La courbe de batterie est lue par le panneau dans les statistiques du recorder.

**Stack :** Python 3.13 / HA 2026.10, pytest-homeassistant-custom-component ; Lit 3 + esbuild + vitest (sans nouvelle dépendance).

**Spec :** `docs/superpowers/specs/2026-10-26-charge-board-stats-vehicles-target-design.md` (maquettes `docs/superpowers/mockups/statistiques-v1.html`, `vehicules-v1.html`).

## Contraintes globales

- **Tests existants :** les 85 tests Python et les 14 tests du panneau restent verts. Une modification de test existant n'est permise que si elle est ledgerisée avec sa raison.
- **Lecture des anciens stores :** `Session.from_dict` reste tolérant. Une session v1/v2 sans les nouveaux champs se lit avec `None`.
- **Statistiques long terme :** jamais à l'appel websocket dans la boucle d'événements. Elles passent par `recorder.get_instance(hass).async_add_executor_job(statistics_during_period, ...)`.
- **Données insuffisantes :** affichage « — », jamais un chiffre sans base. Ça couvre les km incomplets, l'absence de prix de l'essence et l'absence de consommation.
- **Identifiants d'objet en français**, comme en v1 : `sensor.<véhicule>_consommation_recharge`.
- **Pas de nouvelle dépendance**, ni en Python ni dans le frontend. Le bundle `custom_components/charge_board/frontend/charge-board-panel.js` est reconstruit (`npm run build`) et commité.
- **Commandes :**
  - `.venv/bin/pytest -q` ;
  - `.venv/bin/ruff check . && .venv/bin/ruff format --check .` ;
  - `cd frontend && npm test && npm run build`.

## Points de vigilance (relecture)

1. **Coupure, puis débranchement après un redémarrage de HA :** l'interrupteur est quand même rallumé. → test tâche 4.
2. **Interrupteur rallumé à la main après une coupure :** pas de nouvelle coupure tant que la voiture n'est pas débranchée. → test tâche 4.
3. **Mois en cours :** le mois de début des statistiques du compteur kilométrique est « incomplet ». → test tâche 2.
4. **Anciennes sessions sans kilométrage ni prix de l'essence :** les statistiques s'affichent, avec « — » pour la comparaison essence. → test tâche 2.
5. **Capteur de consommation juste après une recharge (moins de 5 km) :** indisponible, pas de division par ~0. → test tâche 3.

---

### Tâche 1 : réglages et données figées dans les sessions

**Fichiers :** modifier `model.py`, `config_flow.py`, `hub.py`, `const.py`, `translations/{fr,en}.json`, `strings.json` (copie d'`en.json`) ; tests `tests/test_model.py`, `tests/test_config_flow.py`, `tests/test_hub.py`.

**Interfaces produites :**
- `Session` gagne `odometer_start: float | None = None`, `odometer_end: float | None = None`, `fuel_price: float | None = None`, `fuel_l100: float | None = None`.
- Fiche véhicule (`VEHICLE_SCHEMA`) :
  - `odometer_entity` (sensor, optionnel) ;
  - `fuel_l100` (nombre, L/100 km, optionnel) ;
  - `target_source` (select `["vehicle", "home"]`, optionnel).
- `target_entity` accepte toujours `number`, `input_number` et `sensor`.
- Options : `fuel_price_entity` (sensor / input_number, optionnel), `fuel_price` (nombre, €/L, optionnel). `const.TARGET_SOURCES = ["vehicle", "home"]`.
- `Hub.target_source(vehicle_id) -> str` : la valeur de la fiche ; à défaut `"vehicle"` si `target_entity` est renseigné, sinon `"home"`.
- `Hub.fuel_price() -> float | None` : l'entité si elle est numérique, sinon le prix fixe, sinon `None`.

**Règles :**
- Kilométrage :
  - à l'ouverture de la session, `odometer_start` = kilométrage courant du véhicule de la session ;
  - à chaque relevé tant que la session est ouverte et le kilométrage connu, `odometer_end` = cette valeur.
  - Le tracker reste pur : `Sample` gagne `odometer: float | None = None`, rempli par `Hub.sample_for` depuis `odometer_entity`. Le tracker traite le kilométrage comme `soc` : `start` au premier relevé connu de la session, `end` mis à jour.
- À la clôture (dans `_feed_all`, avant `store.async_add`), le hub fixe `finished.fuel_price = self.fuel_price()` et `finished.fuel_l100` = la valeur `fuel_l100` de la fiche du véhicule de la session.

- [ ] **Tests qui échouent :**
  - `test_model.py::test_old_session_reads_without_new_fields`
  - `test_tracker.py::test_odometer_start_and_end_follow_the_session` : 1 000 km au début, 1 000 km à la fin ; puis 1 012 km après une reprise → `odometer_end == 1012`.
  - `test_hub.py::test_closed_session_freezes_fuel_price_and_reference` : options `fuel_price: 1.86`, véhicule `fuel_l100: 6` → `fuel_price == 1.86`, `fuel_l100 == 6`.
  - `test_hub.py::test_target_source_defaults` : avec `target_entity` → `"vehicle"` ; sans → `"home"` ; une valeur explicite l'emporte.
  - `test_config_flow.py::test_vehicle_flow_accepts_odometer_fuel_and_source`
- [ ] Lancer les tests : ils doivent échouer. Implémenter, puis `.venv/bin/pytest -q` doit passer au vert, ruff OK.
- [ ] Traductions FR/EN :
  - « Compteur kilométrique » ;
  - « Consommation essence de référence (L/100 km) » ;
  - « Source de l'objectif » : « Le véhicule (il s'arrête seul) » / « La maison (Charge Board coupe la charge) » ;
  - « Prix de l'essence (entité) » / « Prix de l'essence fixe (par litre) » ;
  - pour le champ `switch_entity` du chargeur, remplacer « Pas encore utilisé. » par « Coupé par Charge Board quand un objectif maison est atteint. ».
- [ ] Commit `feat: odometer, fuel price and target source`.

---

### Tâche 2 : statistiques mensuelles

**Fichiers :** créer `custom_components/charge_board/stats.py` ; modifier `hub.py`, `websocket_api.py` ; tests `tests/test_stats.py`, `tests/test_websocket.py`.

**Interfaces produites :**
- `stats.month_rows(sessions: list[Session], months: list[str], km: dict[str, float | None], tz) -> list[dict]` (pure). Une ligne par mois `"YYYY-MM"`, avec ces clés :
  - `month`, `sessions`, `energy_kwh`, `cost`, `unpriced` ;
  - `off_peak_share` (None sans source) ;
  - `km`, `cost_per_100km`, `fuel_cost`, `savings` ;
  - `fuel_price`, `fuel_l100` : moyennes pondérées par les kWh des sessions qui les ont, ou None.
- Formules :
  - une session appartient au mois local de son `charge_start` ;
  - `cost_per_100km = cost / km * 100` ;
  - `fuel_cost = km * fuel_l100 / 100 * fuel_price` ;
  - `savings = fuel_cost - cost` ;
  - chacune vaut `None` dès qu'un terme manque.
- `stats.total_row(rows) -> dict` : sommes ; `off_peak_share` pondérée ; `km` = somme seulement si aucun mois n'est `None` ; ratios recalculés sur les sommes.
- `Hub.async_km_by_month(vehicle_id, months) -> dict[str, float | None]` :
  - recorder `statistics_during_period(..., period="month", types={"change"})` sur `odometer_entity` ;
  - un mois **antérieur ou égal** au mois de la première statistique horaire du compteur vaut `None`, sauf si cette première statistique tombe dans la première heure du mois ;
  - un véhicule sans `odometer_entity` ou sans statistiques donne tous les mois à `None`.
- Commande `charge_board/stats` `{vehicle_id?: str, year: int}` → `{currency, rows: [12 mois de l'année], total}`. Sans `vehicle_id` : tous véhicules, `km` à `None` partout.

- [ ] **Tests qui échouent** (`tests/test_stats.py`, sessions construites comme `sess()` de `test_websocket.py`) :

```python
def test_month_row_with_km_and_fuel():
    rows = month_rows([s(oct_10, kwh=10, cost=1.4, fuel_price=1.80, fuel_l100=6),
                       s(oct_20, kwh=10, cost=1.4, fuel_price=1.90, fuel_l100=6)],
                      ["2026-10"], {"2026-10": 200.0}, PARIS)
    r = rows[0]
    assert r["sessions"] == 2 and r["cost"] == pytest.approx(2.8)
    assert r["fuel_price"] == pytest.approx(1.85)
    assert r["cost_per_100km"] == pytest.approx(1.4)
    assert r["savings"] == pytest.approx(200 * 6 / 100 * 1.85 - 2.8)

def test_old_sessions_without_fuel_show_no_comparison():
    r = month_rows([s(oct_10)], ["2026-10"], {"2026-10": 200.0}, PARIS)[0]
    assert r["savings"] is None and r["cost_per_100km"] is not None

def test_incomplete_km_gives_no_ratio():
    r = month_rows([s(oct_10, fuel_price=1.8, fuel_l100=6)], ["2026-10"], {"2026-10": None}, PARIS)[0]
    assert r["cost_per_100km"] is None and r["savings"] is None

def test_session_month_is_local_time():  # 31/10 23:30 à Paris = octobre, même si UTC = novembre ? (choisir une date où les deux diffèrent)
    ...

def test_total_row_sums_and_drops_km_when_one_month_is_incomplete():
    ...
```

  - `tests/test_websocket.py::test_stats_command_returns_twelve_months` : `Hub.async_km_by_month` remplacé par un monkeypatch qui renvoie `{"2026-10": 300.0}`.
  - `tests/test_hub.py::test_km_by_month_marks_the_first_month_incomplete` : fixture `recorder_mock`, statistiques importées avec `async_import_statistics` à partir du 13/10 00:00 → octobre `None`, novembre = variation.
- [ ] Les tests doivent échouer ; implémenter ; ils doivent passer au vert.
- [ ] Commit `feat: monthly statistics`.

---

### Tâche 3 : fiche véhicule et capteur de consommation

**Fichiers :** modifier `stats.py`, `hub.py`, `sensor.py`, `websocket_api.py`, traductions ; tests `tests/test_stats.py`, `tests/test_hub.py`, `tests/test_websocket.py`.

**Interfaces produites :**
- `stats.consumption_since(soc_then, soc_now, km_then, km_now, capacity_kwh) -> float | None` : `(soc_then - soc_now) / 100 * capacity / (km_now - km_then) * 100`. Vaut `None` si une valeur manque, si `km_now - km_then < 5` ou si le résultat est négatif.
- `Hub.last_session_of(vehicle_id) -> Session | None` : la plus récente des sessions **closes** du véhicule.
- Capteur `VehicleConsumptionSensor` (un par véhicule) :
  - device du véhicule (`identifiers={(DOMAIN, vehicle_id)}`), `entity_id = sensor.<slug nom>_consommation_recharge` ;
  - unité `kWh/100km`, `state_class: measurement`, précision 1 ;
  - valeur `consumption_since(last.soc_end, soc, last.odometer_end, km, capacity)` ;
  - rafraîchi sur `SIGNAL_UPDATED` et sur les changements d'état de `soc_entity` / `odometer_entity`.
- Commande `charge_board/vehicle` `{vehicle_id}` →
  - `name`, `capacity_kwh`, `soc`, `target`, `target_source`, `odometer` ;
  - `consumption_30d` (kWh rechargés / km × 100, sur 30 jours), `autonomy_km` (`capacity × soc / 100 / consumption_30d × 100`), `consumption_since` ;
  - `rows` : les 12 derniers mois, comme la tâche 2, avec en plus `kwh_100km` ;
  - `config` : liste `{key, entity_id, value, ok}` pour soc, objectif, kilométrage, prix de l'essence (global) ; plus `fuel_l100` en valeur ;
  - `cut_ignored` (bool) : objectif maison sans entité de branchement ou sans interrupteur sur le chargeur où il est sélectionné.
  - Km sur 30 jours : statistiques horaires (`change`) sur la période ; `None` si la première statistique est postérieure au début de la période.
  - Énergie sur 30 jours : sessions du véhicule dont le début est dans la période.

- [ ] **Tests qui échouent :**
  - `test_stats.py::test_consumption_since_formula` : 80 → 60 %, 27,5 kWh, 100 → 140 km → 13,75.
  - `test_stats.py::test_consumption_since_needs_5_km` : 100 → 103 km → `None`.
  - `test_hub.py::test_consumption_sensor_after_a_session` : session close avec `soc_end` et `odometer_end`, puis changements d'état soc et km → la valeur du capteur suit.
  - `test_websocket.py::test_vehicle_command_shapes_config_and_flags_ignored_cut` : objectif maison sur un chargeur sans interrupteur → `cut_ignored is True`.
- [ ] Les tests doivent échouer ; implémenter ; ils doivent passer au vert.
- [ ] Commit `feat: vehicle card data and consumption sensor`.

---

### Tâche 4 : coupure à l'objectif maison

**Fichiers :** créer `custom_components/charge_board/target.py` ; modifier `hub.py`, `const.py` ; tests `tests/test_target.py`, `tests/test_hub.py`.

**Interfaces produites :**
- `target.should_cut(*, source: str, has_plug: bool, has_switch: bool, plugged: bool | None, soc: float | None, target: float | None, already_cut: bool) -> bool` : vrai seulement si toutes ces conditions sont réunies :
  - `source == "home"`, `has_plug`, `has_switch`, `plugged is True` ;
  - `soc` et `target` connus, `soc >= target` ;
  - `not already_cut`.
- État par chargeur `cut: bool` dans `store.trackers_state[cid]["cut"]`, persisté avec les trackers. Écriture immédiate (`async_flush_trackers`) quand il change.
- Hub, dans `_feed_all`, après le traitement du tracker :
  - si `should_cut(...)`, alors appel à `switch.turn_off` sur `switch_entity` (tâche de fond, erreurs journalisées), `cut = True`, puis événement `charge_board_target_reached` avec `charger_id`, `vehicle_id`, `soc`, `target` ;
  - si `cut` et `sample.plugged is False`, alors appel à `switch.turn_on` et `cut = False`.
- Un interrupteur rallumé à la main ne change pas `cut` : la coupure n'est pas refaite avant le débranchement.

- [ ] **Tests qui échouent :**
  - `test_target.py` : table de cas pour `should_cut` (source véhicule, pas d'entité de branchement, pas d'interrupteur, débranché, soc inconnu, soc < objectif, déjà coupé → False ; cas nominal → True).
  - `test_hub.py::test_home_target_cuts_then_restores_at_unplug` : `async_mock_service` sur `switch.turn_off` et `switch.turn_on` ; véhicule maison à 80 %, soc passe de 70 à 80 → 1 `turn_off` ; `switch.x` remis `on` à la main → aucun nouveau `turn_off` ; débranchement → 1 `turn_on`.
  - `test_hub.py::test_cut_survives_a_reload` : coupure, rechargement de l'entrée, débranchement → `turn_on` appelé.
  - `test_hub.py::test_vehicle_target_never_cuts` : source véhicule, soc ≥ objectif → aucun appel au service switch.
- [ ] Les tests doivent échouer ; implémenter ; ils doivent passer au vert.
- [ ] Commit `feat: stop charging at a home target`.

---

### Tâche 5 : onglets Statistiques et Véhicules

**Fichiers :** modifier `frontend/src/api.ts`, `panel.ts`, `i18n.ts`, `format.ts`, `chart.ts` ; créer `frontend/src/stats.ts`, `frontend/src/vehicles.ts` ; tests `frontend/test/chart.test.ts`, `frontend/test/format.test.ts` ; reconstruire `custom_components/charge_board/frontend/charge-board-panel.js`.

**Interfaces :**
- Consomme : `charge_board/stats` (tâche 2), `charge_board/vehicle` (tâche 3) et `recorder/statistics_during_period` de HA (`period: "hour"`, `types: ["mean"]`, 30 jours, `statistic_ids: [soc_entity]`).
- Produit (purs, testés) :
  - `chart.barsFor(rows: {off_peak_cost: number; peak_cost: number}[], height: number) -> {x, w, hOff, hPeak}[]` ;
  - `chart.linePath(points: {t: number; v: number}[], width, height, start, end, max = 100) -> string` ;
  - `format.formatDelta(pct: number, locale) -> string` (« ▼ 12 % » / « ▲ 5 % »).
- Les lignes de stats portent `off_peak_cost` et `peak_cost` : ajouter ces deux clés à `month_rows` (tâche 2, sommes des `cost` des tranches).

**Rendu (selon les maquettes) :**
- **Statistiques :**
  - filtres véhicule (dont « Tous ») et année ;
  - bloc du mois en cours, avec 5 chiffres et l'écart vs le mois précédent ;
  - barres empilées heures creuses / heures pleines ;
  - tableau des 12 mois et du total, une astérisque sur les km incomplets, et la note de bas de page.
- **Véhicules :**
  - un bouton par véhicule ;
  - 4 chiffres (batterie/objectif, conso 30 j, compteur, autonomie) ;
  - courbe batterie 30 jours avec les recharges en bandes (sessions du véhicule) ;
  - tableau conso par mois ;
  - bloc Configuration avec un point vert ou rouge, et un lien « Modifier » vers `/config/integrations/integration/charge_board` ;
  - une alerte si `cut_ignored`.
- Onglets du panneau : `overview`, `sessions`, `vehicles`, `stats`, dans cet ordre (comme les maquettes).

- [ ] **Tests qui échouent** (vitest) : `barsFor` (hauteurs proportionnelles au max, 0 pour un mois vide), `linePath` (vide sans point, commence par `M`), `formatDelta` FR/EN.
- [ ] `npm test` doit échouer ; implémenter ; `npm test` doit passer au vert ; `npm run build` ; vérifier que le bundle a changé.
- [ ] Commit `feat: statistics and vehicles tabs`.

---

### Tâche 6 : documentation et version

**Fichiers :** `README.md` (EN/FR), `custom_components/charge_board/manifest.json` (`0.3.0`).

- [ ] README :
  - sections Statistics / Statistiques, Vehicles / Véhicules et Home target / Objectif maison ;
  - les réglages (kilométrage, essence, source de l'objectif, interrupteur), le capteur de consommation, l'événement `charge_board_target_reached` ;
  - la condition de la coupure (entité de branchement + interrupteur).
- [ ] `.venv/bin/pytest -q`, ruff, `cd frontend && npm test` : tout vert.
- [ ] Commit `docs: statistics, vehicles and home target; 0.3.0`.
