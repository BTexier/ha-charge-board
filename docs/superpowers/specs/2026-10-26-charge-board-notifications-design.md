# Charge Board — notifications (v2, lot 1)

Date : 2026-10-26. S'appuie sur la v1 : `2026-10-22-charge-board-design.md`.

## Intention

Baptiste veut savoir, sur son iPhone, ce qui se passe avec la voiture sans ouvrir HA : qu'elle est bien branchée, que la charge est partie, et ce qu'a donné la session. Aujourd'hui, cette information vient d'une automatisation qui dépend de l'intégration du chargeur (fork lachand) ; Charge Board doit la fournir seul, quel que soit le chargeur.

Succès : trois notifications fiables par nuit de charge, ni plus ni moins, y compris quand la voiture fait des pauses, quand HA redémarre ou quand le chargeur devient indisponible quelques secondes.

## Ce qui est décidé (par Baptiste)

- **Trois notifications**, pas plus :
  1. **Branchement** : nom du véhicule et du chargeur, niveau de batterie et niveau visé s'ils sont connus. Exemple : « Twingo branchée sur Chargeur garage · 37 % → objectif 80 % ».
  2. **Démarrage de la charge** : une seule fois par session.
  3. **Débranchement** : le résumé de la session (énergie, coût, part heures creuses / pleines, batterie départ → arrivée, durée de charge, durée de branchement).
- **Pas** de notification « niveau visé atteint » ni à chaque arrêt de charge : le résumé du débranchement suffit. La Twingo reprend souvent quelques minutes après un arrêt (21/10 07:43, 23/10 07:10) ; une notification par arrêt ferait doublon.
- **Destinataire** : son iPhone seulement, pour l'instant.
- **L'intégration envoie elle-même** les notifications (pas de blueprint) : on choisit le téléphone dans les options de Charge Board, les textes sont fixes.
- **Trois événements** sur le bus HA, émis dans tous les cas (notifications activées ou non), pour les automatisations personnelles : `charge_board_plugged`, `charge_board_started`, `charge_board_unplugged`.

## Comportement

### Quand chaque notification part

- **Branchement** : à la transition « débranché → branché » vue par le chargeur (entité de branchement). Une indisponibilité suivie d'un retour à « branché » n'est **pas** un nouveau branchement, ni un redémarrage de HA voiture branchée : la v1 persiste déjà l'heure de branchement du tracker (`plugged_at`), on ne notifie que quand elle passe d'absente à présente.
- **Démarrage** : à l'ouverture de la session (premier passage au-dessus du seuil de puissance, définition v1). Les reprises après pause (22:00 après un branchement à 19:00, reprise du matin) ne déclenchent rien.
- **Débranchement** : à la clôture de la session. Avec une entité de branchement, c'est le débranchement. Sans entité de branchement, c'est la clôture après la durée sans charge de la v1 ; le titre devient alors « Charge terminée » au lieu de « débranchée ».
- Un branchement sans charge (voiture déjà pleine, débranchée sans session) : notification de branchement seulement, rien au débranchement — il n'y a pas de session à résumer.
- Une session déjà ouverte au redémarrage de HA ne renvoie ni « branché » ni « démarré ».

### Contenu

- Véhicule : celui du sélecteur du chargeur au moment de l'envoi. Sans véhicule choisi : nom du chargeur seul.
- Batterie / niveau visé : valeur courante des entités du véhicule si elles existent et sont numériques ; sinon on les omet (mode dégradé v1, aucune estimation).
- Résumé : chiffres de la session enregistrée, arrondis comme dans le panneau (kWh à 1 décimale, € à 2, %). Coût omis si la session n'a pas de prix ; part HC omise sans source heures creuses ; mention « estimée » si la session l'est.
- Langue : français si la langue de HA est le français, anglais sinon.
- Toucher la notification ouvre le panneau « Recharge ».

### Réglages (options de l'intégration)

- **Téléphone à notifier** : liste des services de notification `notify.mobile_app_*` présents dans HA ; vide = aucune notification (les événements partent quand même).
- **Notifications actives** : choix multiple parmi les trois, toutes cochées par défaut.

### Événements

Données : identifiant et nom du chargeur, identifiant et nom du véhicule (ou vide), et selon l'événement la batterie / le niveau visé (`plugged`), l'heure de début (`started`), ou la session complète telle que stockée (`unplugged`).

### Points tranchés après relecture (choix de Claude, à vérifier par Baptiste)

- **Faux débranchement : pas de filtre.** Sur 10 jours d'historique (16 → 26/10), chaque passage du dé à `idle` correspond à un vrai débranchement confirmé par la Renault (`sensor.twingo_etat_du_branchement`, quelques minutes plus tard). On garde la règle v1 : un échantillon « débranché » clôt la session. À revoir seulement si un doublon est observé.
- **« Démarrage » = vraie charge, pas un sursaut au branchement.** Le dé passe parfois en `charging` quelques secondes au branchement avant de se mettre en pause jusqu'à 22:00 (18/10 19:45, 22/10 19:02, 25/10 19:51). La notification de démarrage part donc à la première période de charge **continue d'au moins 5 minutes** de la session, pas à son ouverture ; elle reste unique par session. L'événement `charge_board_started` suit la même règle.
- **`charge_board_unplugged` suit la clôture de session**, comme la notification : même nom avec ou sans entité de branchement, données = la session complète. Branchement sans charge : ni événement ni notification au débranchement.
- **Redémarrage de HA :** on ne renvoie rien si l'état est le même qu'avant l'arrêt (voiture toujours branchée, session toujours ouverte). Si la voiture a été branchée ou débranchée **pendant** l'arrêt, la notification correspondante part au premier relevé : c'est une vraie information, juste en retard. L'état du tracker est enregistré immédiatement à ces transitions (pas après le délai d'écriture de 30 s), pour ne pas renotifier après un plantage.
- Sans entité de branchement : pas de notification « branché ».

## Non-objectifs

- Pas de texte personnalisable, de son, de condition de présence, de multi-destinataire : ce sont les automatisations personnelles sur les événements qui servent à ça.
- Pas d'arrêt au niveau visé, pas de notification d'anomalie : lots suivants.
- Pas de changement du calcul des sessions de la v1.

## Anti-objectifs

- Une notification en double (reprise après pause, blip d'indisponibilité, redémarrage de HA) : c'est l'échec principal à éviter.
- Une notification qui bloque ou fait échouer l'enregistrement d'une session (service de notification absent ou en erreur) : l'envoi est best-effort, une erreur est journalisée et rien d'autre.

## Laissé au développeur

- Où brancher la détection (hub ou tracker) et la forme exacte des données d'événement.
- Le libellé exact des textes, dans l'esprit des exemples ci-dessus.
- Comment lister les services `notify.mobile_app_*` dans le formulaire d'options.
