# Charge Board — intégration Home Assistant de suivi des recharges

Date : 2026-10-22 · Auteur : Baptiste Texier (avec Claude) · Statut : validé par Baptiste le 2026-10-22, version 1
Nom du projet : **Charge Board** (dépôt `ha-charge-board`, domaine `charge_board`).

## 1. Intention

Baptiste veut voir, dans Home Assistant, les sessions de recharge de ses voitures électriques, comme
[WashData](https://github.com/3dg1luk43/ha_washdata) le fait pour les cycles de lave-linge : une page
dédiée, claire, avec ce qui se passe maintenant et l'historique de chaque recharge (énergie, coût,
batterie, durées).

Le projet doit être **léger** et **natif Home Assistant** : une intégration installée par HACS, ajoutée
par « Ajouter une intégration », configurée entièrement dans l'interface de Home Assistant. Elle
**s'appuie sur ce qui existe déjà** dans Home Assistant (entités du chargeur, de la voiture, du tarif),
quel que soit le chargeur ou la voiture : chargeur dé via l'intégration tuya_ev_charger, Wallbox,
OpenEVSE, simple prise connectée…

Pourquoi pas evcc : evcc couvre une grande partie du besoin mais c'est un service séparé avec sa propre
interface, qui pilote la charge (puissance, solaire, planification) et entrerait en concurrence avec
l'intégration du chargeur. Ici on veut lire et afficher, sans service à côté ni configuration hors
Home Assistant.

Ce projet est **indépendant** de l'intégration tuya_ev_charger de lachand (aucune modification de
celle-ci n'est attendue ; elle n'est qu'une source d'entités parmi d'autres).

## 2. Objectifs de la version 1

1. **Configurer** dans Home Assistant : des chargeurs, des véhicules, un tarif.
2. **Enregistrer les sessions de recharge**, avec pour chacune l'énergie, le coût au tarif en vigueur
   au moment où l'énergie a été consommée, la batterie de départ et d'arrivée si connue, et les heures.
3. **Afficher un panneau « Recharge »** dans la barre latérale, avec deux onglets : **Aperçu** et
   **Sessions** (détail §6).
4. **Corriger les sessions** depuis le panneau (décidé avec Baptiste) : changer le véhicule, supprimer
   une session parasite, fusionner deux sessions, couper une session en deux (détail §6).

### Non-objectifs de la version 1 (prévus ensuite, dans cet ordre indicatif)
- Événements et notifications : branché, charge démarrée, niveau visé atteint, débranché (avec résumé).
- Arrêt de la charge au niveau visé (couper l'interrupteur du chargeur), utile surtout aux voitures sans
  service connecté.
- Onglets Véhicules et Statistiques (totaux par véhicule, chargeur, mois ; graphes).
- Répartition réseau / solaire / batterie maison.
- Détection automatique du véhicule branché.
- Import des recharges passées depuis l'historique de Home Assistant (exclu de la v1 : ce serait une
  reconstruction après coup ; le panneau démarre vide à l'installation). Décision de Claude.
- Modèle d'automatisation (blueprint) de notifications pour les autres utilisateurs.

### Anti-objectifs (ce qui ferait échouer le projet même s'il « marche »)
- **Piloter la puissance de charge**, faire du pilotage solaire ou de la planification : c'est le rôle
  de l'intégration du chargeur ou d'evcc. La v1 ne commande rien.
- Exiger un service externe, du YAML, ou une configuration hors de l'interface Home Assistant.
- **Inventer des données** : sans niveau de batterie, on n'estime pas un pourcentage (pas d'estimation
  par les kilomètres, pas de saisie manuelle demandée au branchement). On affiche ce qui est mesuré.
- Dépendre d'un modèle de chargeur ou de voiture particulier.

## 3. Concepts

### Chargeur
Configuré par l'utilisateur à partir d'entités existantes :
- **Puissance** (obligatoire) : capteur de puissance de charge (W ou kW).
- **Énergie** (facultatif) : capteur d'énergie du chargeur (kWh), compteur de session ou cumulé. Quand il
  existe, l'énergie d'une session en vient (plus juste) ; sinon elle est intégrée à partir de la
  puissance.
- **Branchement** (facultatif) : une entité qui dit si une voiture est branchée (capteur binaire, ou
  capteur à états avec la liste des états qui signifient « branchée »). Sur le dé :
  `sensor.tuya_ev_charger_statut` ; on peut aussi utiliser celle de la voiture
  (`sensor.twingo_etat_du_branchement`).
- **Interrupteur de charge** (facultatif, inutilisé en v1, prévu pour l'arrêt au niveau visé).
- Un nom.

### Véhicule
- Nom, **capacité utile** en kWh (27,5 pour la Twingo).
- **Niveau de batterie** (facultatif) : capteur en % (`sensor.twingo_batterie`).
- **Niveau visé** (facultatif) : une entité (`number.twingo_niveau_de_charge_cible`) ou une valeur fixe ;
  100 % par défaut. Affiché en v1, utilisé pour l'arrêt plus tard.
- **Mode dégradé** : sans niveau de batterie, la session n'a ni % de départ ni % d'arrivée (affichés
  « — ») ; tout le reste (énergie, coût, durées) est mesuré normalement.

### Véhicule branché sur un chargeur
En v1, l'utilisateur indique quel véhicule est sur quel chargeur : chaque chargeur expose une entité de
sélection « Véhicule » (avec un véhicule par défaut ; une installation à un seul véhicule n'a rien à
faire). La session prend le véhicule sélectionné à son début. Pas de détection automatique en v1.

### Tarif
- Le **prix** : soit un **capteur de prix** (€/kWh, ex. `sensor.tarif_actuel_tempo_6kva_ttc`), soit
  **deux prix fixes** heures creuses / heures pleines.
- Une source **« heures creuses maintenant »** (capteur binaire, ex. `binary_sensor.rte_tempo_heures_creuses`,
  ou plages horaires) : nécessaire avec les prix fixes, **facultative mais combinable** avec un capteur de
  prix ; c'est elle qui donne la répartition heures creuses / pleines affichée partout (décision de Claude).
  Sans elle, pas de répartition HC/HP (tout est compté au prix lu).
- Chaque session garde l'énergie et le coût **par tranche HC/HP** et **par prix distinct** rencontré
  (décision de Claude : permet plus tard un affichage par couleur Tempo sans réenregistrer).
- Sans prix configuré, le coût est « inconnu » (pas 0 €).
- Devise : celle de Home Assistant.

## 4. Définition d'une session (décidé avec Baptiste)

- Une session, c'est **quand de l'énergie est envoyée à la voiture** : elle va du **premier début de
  charge** à la **dernière fin de charge** d'une même période de branchement.
- **Les pauses ne coupent pas la session** tant qu'il n'y a pas de débranchement (exemple réel : charge
  22:00 → 04:56, voiture pleine, reprise 07:43 → 07:55 sans débrancher = **une seule session**).
- On enregistre aussi, quand l'information existe, l'heure de **branchement** et de **débranchement** :
  ce sont des repères affichés, pas les bornes de la session.
- **Chargeur sans entité de branchement** (décision de Claude, réglable) : une pause sans énergie de plus
  de **3 heures** (valeur par défaut) termine la session ; la reprise suivante en ouvre une nouvelle.
- « En charge » = puissance au-dessus d'un seuil (décision de Claude : 100 W par défaut, réglable par
  chargeur) pour ignorer le bruit de mesure.

## 5. Ce qu'on mesure pour chaque session

- Heures : branchement (si connu), début de charge, fin de charge, débranchement (si connu).
- Temps de charge effectif (somme des périodes en charge) et temps branché.
- Énergie totale ; énergie et coût **par tarif** (heures creuses / heures pleines, ou par prix si
  capteur de prix).
- **Coût calculé au fil de l'eau** : chaque incrément d'énergie est multiplié par le prix en vigueur à
  cet instant (pas de moyenne, pas de reconstruction après coup). Même principe que le correctif proposé
  sur tuya_ev_charger (#77).
- Puissance moyenne et **courbe de puissance** de la session, conservée sous forme compacte avec la
  session (l'historique Home Assistant ne garde le détail qu'une dizaine de jours).
- Batterie au début et à la fin (si niveau connu), véhicule, chargeur. **Début** = dernière valeur connue
  au début de charge (ou au branchement si plus récente). **Fin** = dernière valeur reçue **avant le
  débranchement** : les niveaux venant du cloud du constructeur arrivent souvent en retard, donc la session
  continue de mettre à jour ce niveau après la fin de charge jusqu'au débranchement (sans entité de
  branchement : jusqu'à la session suivante ou au délai de coupure du §4). Décision de Claude.
- Marque **« estimé »** quand une partie n'a pas été mesurée en direct (Home Assistant arrêté pendant la
  session : l'énergie manquante, connue grâce au capteur d'énergie, est comptée au tarif du retour).
- Les sessions doivent survivre aux redémarrages de Home Assistant, y compris une session en cours.

## 6. Le panneau « Recharge » (validé sur maquettes)

Panneau dans la barre latérale de Home Assistant, aspect natif (thème clair/sombre, utilisable sur
téléphone), en français et en anglais. Onglets v1 : **Aperçu**, **Sessions**.

### Onglet Aperçu
Une carte par chargeur, avec la voiture branchée dessus.
- **Carte détaillée (par défaut)** : nom et état du chargeur (en charge / branché / libre) ; véhicule et
  niveau actuel → niveau visé avec barre de progression ; puissance, énergie de la session, coût,
  heure de fin estimée si calculable ; depuis quand la voiture est branchée et en charge ; part en heures
  creuses. Un chargeur libre rappelle sa dernière session.
- **Tuile compacte (option)** : jauge de batterie, nom du chargeur, véhicule et état, puissance · coût ·
  fin estimée ; le détail s'ouvre au toucher.
- Le choix détaillée / compacte est **configurable**.
- Heure de fin estimée : seulement si niveau actuel, niveau visé, capacité et puissance sont connus ;
  sinon non affichée.

### Onglet Sessions
- **Filtres** : véhicule, chargeur, mois.
- **Bandeau** du mois filtré : nombre de sessions, kWh, coût, part en heures creuses.
- **Liste** : une ligne par session avec **Début** (début de charge), **Fin** (fin de charge), véhicule,
  batterie départ → arrivée (« — » si inconnue), kWh, durée de charge, coût (« * » si estimé).
- **Corrections** (depuis le détail d'une session) :
  - **changer le véhicule** (le niveau de batterie et le niveau visé ne sont pas recalculés : ils restent
    ceux mesurés, ou « — » si le nouveau véhicule n'a pas de capteur — décision de Claude) ;
  - **supprimer** une session (avec confirmation) ;
  - **fusionner** une session avec la précédente ou la suivante **du même chargeur** : énergies, coûts,
    durées et courbes s'additionnent ; heures et niveaux pris aux bornes ;
  - **couper** une session en deux à un instant choisi sur le graphique de puissance ; énergie et coût
    répartis selon la courbe et les tranches tarifaires de chaque côté.
  - Une session corrigée porte une marque « **modifiée** » (décision de Claude) ; pas d'historique des
    modifications ni d'annulation en v1 (décision de Claude).
  - Seule une session **terminée** se corrige ; la session en cours n'est pas modifiable.
- **Détail d'une session** : chiffres clés (énergie, coût, batterie, puissance moyenne) ; graphique de
  la puissance dans le temps avec les périodes heures creuses / pleines en fond ; les quatre heures
  (branchée, début de charge, fin de charge, débranchée) ; énergie et coût par tarif ; temps de charge
  par rapport au temps branché.

Maquettes de référence (fragments HTML, ouvrables dans un navigateur) : `docs/superpowers/mockups/`
(`vision-integration.html`, `apercu-v1.html`, `sessions-v2.html`).

## 7. Contraintes et choix techniques

- **Intégration Home Assistant en Python**, installable par HACS (dépôt GitHub de Baptiste, compte
  BTexier), configuration par l'interface (config flow ; pas de YAML).
- **Panneau en web components (Lit)**, comme le frontend de Home Assistant et WashData, pour l'aspect
  natif (décision de Claude ; Baptiste peut la revoir).
- Données des sessions stockées par l'intégration (stockage Home Assistant), pas dans la base de
  l'historique.
- Aucune dépendance au modèle de chargeur ou de voiture ; tout passe par des entités choisies par
  l'utilisateur.
- Fuseau et formats de Home Assistant (Europe/Paris chez Baptiste).

## 8. Installation de référence pour les tests (chez Baptiste)

- Chargeur : dé 3,7 kW via tuya_ev_charger — `sensor.tuya_ev_charger_puissance_totale` (kW),
  `sensor.tuya_ev_charger_energie_de_la_session` (kWh, compteur de session), `sensor.tuya_ev_charger_statut`
  (états `idle`, `plugged_in`, `charging`, `waiting`, `paused`, `charged`…),
  `switch.tuya_ev_charger_session_de_charge`.
- Véhicule : Twingo E-Tech 2026, 27,5 kWh — `sensor.twingo_batterie`, `number.twingo_niveau_de_charge_cible`,
  `sensor.twingo_etat_du_branchement`.
- Tarif : Tempo — `sensor.tarif_actuel_tempo_6kva_ttc` (prix), `binary_sensor.rte_tempo_heures_creuses`
  (heures creuses). Ne pas utiliser `binary_sensor.chargeur_ve_creneau_de_charge` : c'est un créneau de
  charge autorisé, pas le signal heures creuses.
- Cas réels connus : nuits du 18→19/10 (12,07 kWh, 10,18 HC + 1,89 HP ≈ 1,69 €) et 20→21/10 (15,63 kWh,
  15,20 HC + 0,43 HP ≈ 2,13 €), chacune avec une reprise après 06:00 dans la même session.

## 9. Laissé au constructeur

- Structure de la configuration (entrée unique avec sous-entrées chargeurs / véhicules, ou autre).
- Format de stockage et durée de conservation des sessions et des courbes (prévoir au moins plusieurs
  années de recharges quotidiennes sans alourdir Home Assistant).
- Entités créées en v1 en plus du panneau (au minimum la sélection « Véhicule » par chargeur ; capteurs
  de session en cours bienvenus).
- Communication entre le panneau et l'intégration (API websocket Home Assistant conseillée).
- Où se règle le choix détaillée / compacte (option d'intégration ou réglage du panneau).
