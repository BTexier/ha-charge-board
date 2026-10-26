# Charge Board

[English](#english) · [Français](#français)

## English

Charge Board is a Home Assistant custom integration (domain `charge_board`) that records EV charging sessions and shows them in a sidebar panel called "Recharge". It is inspired by [WashData](https://github.com/3dg1luk43/ha_washdata), which does the same for washing machine cycles. It reads entities you already have (charger power and energy, plug state, battery level, tariff), records each session (energy, cost, battery start/end, times, power curve), and offers a panel with an **Overview** tab (one card per charger) and a **Sessions** tab (filters, monthly summary, list, detail). Sessions can be corrected from the panel.

It does **not** control anything: no charge control or power regulation, no solar surplus charging, no scheduling. Use your charger's integration or [evcc](https://evcc.io) for that.

### Installation

1. In HACS, add a custom repository: `https://github.com/BTexier/ha-charge-board`, category **Integration**.
2. Install Charge Board and restart Home Assistant (minimum version: 2025.6.0).
3. Go to Settings → Devices & services → Add integration → **Charge Board**.

### Configuration

Everything is done in the UI. The integration is a single entry; chargers and vehicles are added as sub-entries.

**Tariff** (integration Options → "Tariff"). Leave everything empty to record sessions without cost.
- *Price sensor (per kWh)*: takes precedence over the fixed prices.
- *Off-peak price* / *Peak price*: two fixed prices, used with an off-peak source.
- *Off-peak now (binary sensor)* or *Off-peak windows* (e.g. `22:00-06:00`, several separated by commas; ignored when the binary sensor is set). The off-peak source also gives the off-peak/peak split shown in the panel, even with a price sensor.
- *Overview style*: Detailed or Compact.

**Add charger**
- *Name* and *Charging power* (required, W or kW).
- *Energy (kWh)*: strongly recommended. A session or total counter from the charger; when set, session energy comes from it, which is the most accurate source. Otherwise energy is integrated from power.
- *Plugged in* (optional): a binary sensor, or a sensor with *States meaning plugged in* (leave empty for a binary sensor).
- *Charging switch*: not used yet.
- *Charging threshold*: default 100 W. The charger is "charging" above this power; it filters measurement noise.
- *Session gap without plug entity*: default 3 h. See below.

**Add vehicle**
- *Name* and *Usable capacity* (kWh).
- *Battery level* (optional): a sensor in %.
- *Target level entity* (optional) or *Fixed target level* (used when no entity is set; 100 % by default).

Chargers and vehicles can be reconfigured in place (Reconfigure on the sub-entry); the recorded history is kept. Each charger gets a **Vehicle** select entity: choose which vehicle is plugged in. A session takes the selected vehicle at its start. With a single vehicle there is nothing to do.

### How sessions work

- A session goes from the **first charge start** to the **last charge end** within one plugged-in period. Pauses do not split it (e.g. charge 22:00 to 04:56, car full, resume 07:43 to 07:55 without unplugging is one session).
- Plug and unplug times are recorded when known, as markers.
- Without a plug entity, a pause of more than the gap (3 h by default) ends the session; the next charge starts a new one.
- **Cost**: each kWh is priced at the price in force when it was drawn (no average, no after-the-fact rebuild). Energy and cost are kept per off-peak/peak tariff and per distinct price.
- An unknown cost (no price configured) shows as "—", never 0. A "*" means estimated (Home Assistant was stopped during the session; missing energy, known from the energy counter, is priced at the tariff on return). An "edited" mark flags a corrected session.

### Without battery level

Without a battery sensor, a session has no start/end percentage (shown "—"). Nothing is estimated or asked; everything else (energy, cost, durations) is measured normally.

### Corrections (Sessions tab, session detail)

Only finished sessions can be corrected. There is no undo.
- **Change vehicle**: battery levels are not recomputed.
- **Delete** (with confirmation).
- **Merge** with the previous or next session of the same charger: energy, cost, durations and curves add up; times and levels come from the ends.
- **Split** at a time picked on the power chart: energy and cost are shared according to the curve and the tariff slices on each side.

### Notifications

In the integration options, pick the **phone to notify** (any `notify.mobile_app_*` service) and which **notifications** to send:

- **Plugged in**: vehicle, charger, battery level and target when known.
- **Charging started**: once per session, after 5 minutes of continuous charging (a few seconds at plug-in do not count).
- **Unplugged**: the session summary (energy, cost, off-peak share, battery, charging and plugged-in time).

Tapping a notification opens the Recharge panel. The texts follow Home Assistant's language (French, otherwise English).

The same moments are fired as events whatever the notification settings, for your own automations: `charge_board_plugged` (`soc`, `target`), `charge_board_started` (`charge_start`, `soc`) and `charge_board_unplugged` (`session`, the full recorded session). All carry `charger_id`, `charger_name`, `vehicle_id` and `vehicle_name`.

### Statistics

The **Statistics** tab answers what charging costs, month by month, for one vehicle (or all):

- the current month: cost and change vs the previous month, energy and sessions, off-peak share, cost per 100 km, savings vs a petrol car;
- the cost of each month, off-peak and peak stacked;
- a table of the year's months and its total.

Distances come from Home Assistant's long-term statistics of the vehicle's **odometer** (vehicle setting; the sensor needs a `state_class`). A month the statistics do not fully cover shows "—" for the per-100-km figures.

The petrol comparison uses the vehicle's **reference petrol consumption** (L/100 km) and the **petrol price** of the Charge Board options: a sensor (for example a station of the Prix Carburant integration) or a fixed price. Both are recorded in each session, so changing them later does not rewrite past months.

### Vehicles

The **Vehicles** tab shows one card per vehicle: battery and target, consumption over 30 days (energy charged ÷ km), odometer, estimated range, the battery over 30 days with the charges, consumption per month, and the state of each configured sensor ("Edit" opens the vehicle settings).

Each vehicle also gets a sensor **Consumption since charge** (`sensor.<vehicle>_consommation_recharge`, kWh/100 km): the battery used since the last unplug divided by the distance driven, from 5 km on.

### Home target

The **target source** of a vehicle is either:

- **the vehicle**: the target entity is the car's own setting; the car stops by itself, Charge Board only shows it;
- **home**: a helper (`input_number`) or the fixed target. When the plugged-in vehicle reaches it, Charge Board turns the charger's **charging switch** off and fires `charge_board_target_reached` (`charger_id`, `vehicle_id`, `soc`, `target`). It turns the switch back on at unplug. A switch turned back on by hand stays on until the unplug.

The cut needs both a **plug entity** and a **charging switch** on the charger; without them the Vehicles card says the home target has no effect.

### Limits

- Finished sessions are stored in a single JSON file.
- A Home Assistant restart during a session marks it as estimated.
- No import of past sessions: the panel starts empty at installation.
- Not in v1: events/notifications, stop at target level, statistics tabs, automatic vehicle detection.

### Example: the author's setup

| Role | Entity |
|---|---|
| Charger power | `sensor.tuya_ev_charger_puissance_totale` (kW) |
| Charger energy | `sensor.tuya_ev_charger_energie_de_la_session` |
| Plug | `sensor.tuya_ev_charger_statut`, plugged states `plugged_in, charging, waiting, paused, charged` |
| Vehicle battery | `sensor.twingo_batterie` (Renault Twingo, 27.5 kWh) |
| Vehicle target | `number.twingo_niveau_de_charge_cible` |
| Price | `sensor.tarif_actuel_tempo_6kva_ttc` (EDF Tempo) |
| Off-peak | `binary_sensor.rte_tempo_heures_creuses` |

The charger is a dé charger driven by the `tuya_ev_charger` integration.

---

## Français

Charge Board est une intégration personnalisée Home Assistant (domaine `charge_board`) qui enregistre les sessions de recharge de véhicules électriques et les affiche dans un panneau de la barre latérale nommé « Recharge ». Elle s'inspire de [WashData](https://github.com/3dg1luk43/ha_washdata), qui fait la même chose pour les cycles de lave-linge. Elle lit des entités que vous avez déjà (puissance et énergie du chargeur, branchement, niveau de batterie, tarif), enregistre chaque session (énergie, coût, batterie départ/arrivée, heures, courbe de puissance) et propose un panneau avec un onglet **Aperçu** (une carte par chargeur) et un onglet **Sessions** (filtres, bandeau du mois, liste, détail). Les sessions se corrigent depuis le panneau.

Elle ne **pilote rien** : pas de commande ni de régulation de la charge, pas de charge au surplus solaire, pas de planification. Utilisez l'intégration de votre chargeur ou [evcc](https://evcc.io) pour cela.

### Installation

1. Dans HACS, ajouter un dépôt personnalisé : `https://github.com/BTexier/ha-charge-board`, catégorie **Intégration**.
2. Installer Charge Board et redémarrer Home Assistant (version minimale : 2025.6.0).
3. Paramètres → Appareils et services → Ajouter une intégration → **Charge Board**.

### Configuration

Tout se fait dans l'interface. L'intégration est une entrée unique ; chargeurs et véhicules s'ajoutent comme sous-entrées.

**Tarif** (Options de l'intégration → « Tariff »). Tout laisser vide pour enregistrer les sessions sans coût.
- *Price sensor (per kWh)* (capteur de prix) : prioritaire sur les prix fixes.
- *Off-peak price* / *Peak price* : deux prix fixes (heures creuses / pleines), à utiliser avec une source d'heures creuses.
- *Off-peak now (binary sensor)* ou *Off-peak windows* (plages, p. ex. `22:00-06:00`, plusieurs séparées par des virgules ; ignorées si le capteur binaire est renseigné). Cette source donne aussi la répartition HC/HP affichée, même avec un capteur de prix.
- *Overview style* : Detailed (détaillée) ou Compact (compacte).

**Ajouter un chargeur**
- *Name* (nom) et *Charging power* (puissance, obligatoire, W ou kW).
- *Energy (kWh)* : fortement recommandé. Compteur de session ou cumulé du chargeur ; s'il est renseigné, l'énergie de la session en vient, ce qui est la source la plus juste. Sinon l'énergie est intégrée à partir de la puissance.
- *Plugged in* (branchement, facultatif) : capteur binaire, ou capteur à états avec *States meaning plugged in* (états « branché » ; vide pour un capteur binaire).
- *Charging switch* : pas encore utilisé.
- *Charging threshold* (seuil) : 100 W par défaut. Le chargeur est « en charge » au-dessus de cette puissance ; cela filtre le bruit de mesure.
- *Session gap without plug entity* (délai) : 3 h par défaut. Voir ci-dessous.

**Ajouter un véhicule**
- *Name* et *Usable capacity* (capacité utile, kWh).
- *Battery level* (facultatif) : capteur en %.
- *Target level entity* (facultatif) ou *Fixed target level* (utilisé sans entité ; 100 % par défaut).

Chargeurs et véhicules se reconfigurent sur place (Reconfigurer sur la sous-entrée) ; l'historique enregistré est conservé. Chaque chargeur a une entité de sélection **Véhicule** : choisissez quel véhicule est branché. La session prend le véhicule sélectionné à son début. Avec un seul véhicule, rien à faire.

### Fonctionnement des sessions

- Une session va du **premier début de charge** à la **dernière fin de charge** d'une même période de branchement. Les pauses ne la coupent pas (p. ex. charge 22:00 → 04:56, voiture pleine, reprise 07:43 → 07:55 sans débrancher = une seule session).
- Les heures de branchement et de débranchement sont enregistrées si elles sont connues, comme repères.
- Sans entité de branchement, une pause de plus que le délai (3 h par défaut) termine la session ; la charge suivante en ouvre une nouvelle.
- **Coût** : chaque kWh est compté au prix en vigueur quand il a été consommé (pas de moyenne, pas de reconstruction après coup). Énergie et coût sont conservés par tranche HC/HP et par prix distinct.
- Un coût inconnu (aucun prix configuré) s'affiche « — », jamais 0. Un « * » signifie estimé (Home Assistant arrêté pendant la session ; l'énergie manquante, connue par le compteur d'énergie, est comptée au tarif du retour). La marque « modifiée » signale une session corrigée.

### Sans niveau de batterie

Sans capteur de batterie, la session n'a ni % de départ ni % d'arrivée (« — »). Rien n'est estimé ni demandé ; tout le reste (énergie, coût, durées) est mesuré normalement.

### Corrections (onglet Sessions, détail d'une session)

Seules les sessions terminées se corrigent. Pas d'annulation.
- **Changer le véhicule** : les niveaux de batterie ne sont pas recalculés.
- **Supprimer** (avec confirmation).
- **Fusionner** avec la session précédente ou suivante du même chargeur : énergies, coûts, durées et courbes s'additionnent ; heures et niveaux pris aux bornes.
- **Couper** à un instant choisi sur le graphique de puissance : énergie et coût répartis selon la courbe et les tranches tarifaires de chaque côté.

### Notifications

Dans les options de l'intégration, choisir le **téléphone à notifier** (un service `notify.mobile_app_*`) et les **notifications actives** :

- **Branchement** : véhicule, chargeur, niveau de batterie et niveau visé s'ils sont connus.
- **Démarrage de la charge** : une fois par session, après 5 minutes de charge continue (quelques secondes au branchement ne comptent pas).
- **Débranchement** : le résumé de la session (énergie, coût, part en heures creuses, batterie, durées de charge et de branchement).

Toucher une notification ouvre le panneau Recharge. Les textes suivent la langue de Home Assistant (français, sinon anglais).

Les mêmes moments sont émis en événements, quels que soient les réglages de notification, pour vos propres automatisations : `charge_board_plugged` (`soc`, `target`), `charge_board_started` (`charge_start`, `soc`) et `charge_board_unplugged` (`session`, la session enregistrée complète). Tous portent `charger_id`, `charger_name`, `vehicle_id` et `vehicle_name`.

### Statistiques

L'onglet **Statistiques** dit ce que coûte la recharge, mois par mois, pour un véhicule (ou tous) :

- le mois en cours : coût et écart avec le mois précédent, énergie et sessions, part en heures creuses, coût aux 100 km, économie par rapport à une voiture essence ;
- le coût de chaque mois, heures creuses et pleines empilées ;
- le tableau des mois de l'année et son total.

Les distances viennent des statistiques long terme de Home Assistant pour le **compteur kilométrique** du véhicule (réglage du véhicule ; le capteur doit avoir un `state_class`). Un mois que ces statistiques ne couvrent pas entièrement affiche « — » pour les chiffres aux 100 km.

La comparaison essence utilise la **consommation essence de référence** du véhicule (L/100 km) et le **prix de l'essence** des options de Charge Board : un capteur (par exemple une station de l'intégration Prix Carburant) ou un prix fixe. Les deux sont enregistrés dans chaque session : les changer ensuite ne réécrit pas les mois passés.

### Véhicules

L'onglet **Véhicules** montre une fiche par véhicule : batterie et objectif, consommation sur 30 jours (énergie rechargée ÷ km), compteur, autonomie estimée, la batterie sur 30 jours avec les recharges, la consommation par mois et l'état de chaque capteur configuré (« Modifier » ouvre les réglages du véhicule).

Chaque véhicule a aussi un capteur **Consommation depuis la recharge** (`sensor.<véhicule>_consommation_recharge`, kWh/100 km) : batterie consommée depuis le dernier débranchement divisée par la distance parcourue, à partir de 5 km.

### Objectif maison

La **source de l'objectif** d'un véhicule est :

- **le véhicule** : l'entité d'objectif est le réglage de la voiture ; elle s'arrête seule, Charge Board se contente de l'afficher ;
- **la maison** : une aide (`input_number`) ou l'objectif fixe. Quand le véhicule branché l'atteint, Charge Board coupe l'**interrupteur de charge** du chargeur et émet `charge_board_target_reached` (`charger_id`, `vehicle_id`, `soc`, `target`). Il le rallume au débranchement. Un interrupteur rallumé à la main reste allumé jusqu'au débranchement.

La coupure demande une **entité de branchement** et un **interrupteur de charge** sur le chargeur ; sans eux, la fiche Véhicules signale que l'objectif maison est sans effet.

### Limites

- Les sessions terminées sont stockées dans un seul fichier JSON.
- Un redémarrage de Home Assistant pendant une session la marque comme estimée.
- Pas d'import des sessions passées : le panneau démarre vide à l'installation.
- Hors v1 : événements/notifications, arrêt au niveau visé, onglets statistiques, détection automatique du véhicule.

### Exemple : l'installation de l'auteur

| Rôle | Entité |
|---|---|
| Puissance du chargeur | `sensor.tuya_ev_charger_puissance_totale` (kW) |
| Énergie du chargeur | `sensor.tuya_ev_charger_energie_de_la_session` |
| Branchement | `sensor.tuya_ev_charger_statut`, états branchés `plugged_in, charging, waiting, paused, charged` |
| Batterie du véhicule | `sensor.twingo_batterie` (Renault Twingo, 27,5 kWh) |
| Niveau visé | `number.twingo_niveau_de_charge_cible` |
| Prix | `sensor.tarif_actuel_tempo_6kva_ttc` (EDF Tempo) |
| Heures creuses | `binary_sensor.rte_tempo_heures_creuses` |

Le chargeur est un chargeur dé piloté par l'intégration `tuya_ev_charger`.
