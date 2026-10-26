# Charge Board : Statistiques, Véhicules, objectif maison

Date : 2026-10-26. Ce document complète la v1 (`2026-10-22-charge-board-design.md`) et les notifications (`2026-10-26-charge-board-notifications-design.md`). Maquettes : `docs/superpowers/mockups/statistiques-v1.html` et `vehicules-v1.html`.

## Intention

Baptiste veut répondre à deux questions sans calcul :
- combien la Twingo lui coûte par mois ;
- s'il charge vraiment en heures creuses.

Ce coût doit avoir trois repères : l'évolution d'un mois sur l'autre, le coût aux 100 km et l'économie par rapport à une voiture essence.

Il veut aussi une fiche par véhicule, avec l'historique de la batterie, la consommation et l'état des capteurs utilisés pour les calculs. Cette fiche remplace son capteur modèle « Twingo Consommation depuis recharge » (avec ses deux aides `input_number` et son automatisation de remise à zéro).

Enfin, l'objectif de charge d'un véhicule vient soit **du véhicule** (la voiture s'arrête d'elle-même), soit **de la maison** (Charge Board coupe la charge).

Succès :
- ouvrir « Statistiques » et lire le coût du mois, la part HC, les € / 100 km et l'économie vs essence ;
- ouvrir « Véhicules » et lire la consommation de la Twingo ;
- supprimer l'ancien capteur modèle sans rien perdre.

## Ce qui est décidé (par Baptiste)

### Onglet Statistiques (maquette `statistiques-v1.html`, validée)

- Filtres : véhicule (ou tous) et année.
- En haut, le mois en cours :
  - coût, avec l'écart en % par rapport au mois précédent ;
  - kWh et nombre de sessions ;
  - part en heures creuses ;
  - coût aux 100 km et km parcourus ;
  - économie vs essence, avec la référence utilisée (L/100 km et €/L).
- Au milieu : coût par mois en barres empilées heures creuses / heures pleines, sur l'année choisie.
- En bas : tableau par mois (sessions, kWh, coût, % HC, km, € / 100 km, vs essence) et ligne de total de l'année.
- Un mois dont les km sont incomplets n'affiche ni € / 100 km ni comparaison, avec un astérisque et une note.

### Prix de l'essence

- Le prix du litre est celui **d'une station** : une entité `sensor` fournie par l'intégration HACS « Prix Carburant », dans les options de Charge Board. Un prix fixe est possible en secours.
- Baptiste installera cette intégration et choisira sa station. Claude peut l'aider, avec son accord : les installations HA sont manuelles.
- Le prix de l'essence en vigueur est **enregistré dans chaque session**, comme le prix de l'électricité. Changer de station ou de prix ne réécrit pas les mois passés.
- La consommation essence de référence (L/100 km) est un réglage **par véhicule**.

### Onglet Véhicules (maquette `vehicules-v1.html`, validée)

- Un onglet par véhicule configuré.
- En haut :
  - batterie actuelle et objectif ;
  - consommation en kWh / 100 km sur les 30 derniers jours ;
  - compteur kilométrique ;
  - autonomie estimée = capacité × batterie ÷ consommation 30 jours.
- Courbe de la batterie sur 30 jours, tirée de l'historique de HA (recorder), avec les recharges en bandes.
- Consommation par mois : énergie rechargée ÷ km parcourus, en kWh / 100 km et € / 100 km.
- Configuration en lecture seule : chaque capteur avec son état en direct (point vert s'il répond, rouge sinon) et un lien « Modifier » qui ouvre la reconfiguration du véhicule dans HA. **Pas d'édition dans le panneau.**

### Capteur de consommation (remplace le capteur modèle)

- Un capteur par véhicule : « {véhicule} consommation depuis la recharge », en kWh/100 km.
- Même formule que le capteur actuel : (batterie au débranchement de la dernière session − batterie actuelle) × capacité ÷ (km actuel − km au débranchement) × 100.
- Indisponible tant que moins de 5 km ont été parcourus depuis ce débranchement, ou si une des valeurs manque.
- Les deux consommations restent distinctes, chacune avec son libellé :
  - celle du capteur se mesure côté batterie ;
  - celle de la fiche Véhicules se mesure côté chargeur, pertes de charge comprises.
- Le nettoyage (capteur modèle, deux aides, automatisation) se fera par Baptiste, après validation.

### Kilométrage

- Nouveau réglage optionnel par véhicule : capteur de kilométrage (pour la Twingo, `sensor.twingo_kilometrage`).
- Chaque session enregistre le kilométrage au début et à la fin (dernière valeur connue avant le débranchement).
- Les km d'une période viennent des statistiques long terme du compteur (voir « Points tranchés »). Un mois dont la période n'est couverte qu'en partie par ces statistiques a des km incomplets.
- Pas d'import d'historique au-delà de ce que HA a déjà en statistiques.

### Objectif : du véhicule ou de la maison

Chaque fiche véhicule a un champ « Source de l'objectif ».

- **Véhicule** : l'objectif est lu dans une entité du véhicule (ex. `number.twingo_niveau_de_charge_cible`). C'est la voiture qui s'arrête. Charge Board ne coupe rien : il affiche l'objectif et l'utilise dans les notifications.
- **Maison** : l'objectif est une aide HA (`input_number`) ou un nombre fixe de la fiche. Quand la batterie du véhicule branché atteint l'objectif, **Charge Board coupe la charge** avec l'interrupteur de charge du chargeur (champ « Interrupteur de charge » de la v1).
  - Sans interrupteur configuré sur le chargeur, rien n'est coupé.
  - Une coupure est journalisée et émise en événement `charge_board_target_reached`, sans notification : le résumé du débranchement suffit.
- Les fiches v1 existantes deviennent « Véhicule » si une entité d'objectif est renseignée, « Maison » sinon (objectif fixe), sans perte de réglage.

## Choix de Claude (à vérifier)

- **Remise en marche après coupure :**
  - Charge Board ne réactive l'interrupteur qu'au débranchement, et seulement s'il l'a lui-même coupé.
  - Sinon, la prochaine voiture branchée ne chargerait pas.
  - Si Baptiste rallume l'interrupteur à la main avant de débrancher, Charge Board ne le recoupe pas pour cette session.
- **Dépassement de l'objectif :** la batterie remonte par l'API du constructeur, avec plusieurs minutes de retard pour Renault. L'arrêt peut donc dépasser l'objectif de quelques %. On ne cherche pas à anticiper.
- **Où sont faits les calculs :**
  - les statistiques sont calculées côté intégration, à partir des sessions enregistrées, et servies au panneau par une commande websocket ;
  - la courbe de batterie est lue par le panneau directement dans l'historique HA.
- **Une session sans prix de l'essence** (pas d'entité, pas de prix fixe) n'entre pas dans la comparaison. Sa ligne affiche « — ».
- **Statistiques « tous véhicules » :** pas de km ni de comparaison, car les compteurs ne s'additionnent pas.

### Points tranchés après relecture (choix de Claude)

- **Source des km : les statistiques long terme de HA, pas des relevés de session.**
  - `sensor.twingo_kilometrage` a `state_class: total_increasing`. Le recorder en garde donc des statistiques horaires **permanentes** : il ne purge que l'historique brut, à 10 jours par défaut.
  - Les km d'un mois ou des 30 derniers jours se calculent par la variation du compteur sur la période (`recorder` statistics, type `change`).
  - Avantage : un mois sans recharge a quand même ses km, et rien n'est à stocker.
  - Un capteur de kilométrage sans `state_class` ne donne pas de km : affichage « — » et note.
  - La session enregistre seulement le kilométrage à son début et à sa fin, pour le capteur « consommation depuis la recharge ».
- **Courbe de batterie sur 30 jours :** statistiques long terme horaires (moyenne) de l'entité batterie (`sensor.twingo_batterie` a `state_class: measurement`), car l'historique brut ne couvre que 10 jours. Sans `state_class`, la courbe se limite à l'historique brut disponible.
- **Formule « vs essence » d'un mois :** km du mois × L/100 km ÷ 100 × prix du litre − coût électrique du mois.
  - Le prix du litre et la consommation de référence (L/100 km) sont **tous deux figés dans chaque session**.
  - Pour le mois, on prend leur moyenne pondérée par les kWh des sessions qui les ont.
  - Si aucune session du mois n'a de prix de l'essence, la comparaison affiche « — ».
- **Prix de l'essence : réglage global** (options de Charge Board), comme décrit plus haut. Les maquettes le montrent dans la fiche véhicule : c'est la spec qui fait foi. La fiche Véhicules affiche la consommation de référence et rappelle le prix global.
- **Coupure à l'objectif maison seulement avec une entité de branchement sur le chargeur.**
  - Sans elle, la session ne se clôt qu'après la règle des 3 h, ce qui provoquerait une boucle coupure / remise en marche.
  - Le formulaire n'interdit rien, mais la coupure est ignorée et la fiche Véhicules le signale.
  - Le chargeur de Baptiste a cette entité (`sensor.tuya_ev_charger_statut`).
- **Champ de l'objectif :** on garde le champ `target_entity` de la v1. En mode Maison, il accepte une entité `input_number` ou `number` de la maison, sinon l'objectif fixe s'applique.
- **Migration des fiches v1 :**
  - une fiche avec une entité d'objectif passe en mode « Véhicule » (c'est le cas de la Twingo) ;
  - les autres passent en mode « Maison » avec leur objectif fixe (100 % par défaut) ;
  - couper à 100 % ne change rien en pratique, puisque la voiture s'arrête pleine.
- **État « Charge Board a coupé » :** conservé au redémarrage de HA, pour rallumer l'interrupteur au débranchement même après un redémarrage.
- **Batterie déjà au-dessus de l'objectif maison au branchement :** coupure immédiate.

## Non-objectifs

- Pas d'édition de la configuration dans le panneau.
- Pas d'import d'historique (kilométrage, sessions antérieures).
- Pas d'arrêt anticipé, pas de pilotage de puissance.
- Pas de notification « objectif atteint ».

## Anti-objectifs

- **Une coupure qui empêche la prochaine charge :** un interrupteur laissé coupé après le débranchement.
- **Des mois passés qui changent tout seuls**, parce qu'un prix ou un réglage a changé.
- **Un chiffre affiché sans base suffisante**, au lieu de « — » : € / 100 km sans km complets, autonomie sans consommation.

## Laissé au développeur

- Format exact de la commande websocket des statistiques, et découpage du panneau en composants.
- Rendu des graphiques, dans l'esprit des maquettes et du graphique SVG existant (pas de nouvelle dépendance).
- Libellés exacts, en français et en anglais.
