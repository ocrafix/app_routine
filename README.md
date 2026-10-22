# Routine

Application web mobile-first pour consulter les programmes de la semaine.

## Organisation

- `index.html` : accueil et choix du jour.
- `jour_<jour>.html` : choix entre le soin et la musculation de ce jour.
- `soin_<jour>.html` : routine de soin.
- `muscu_<jour>.html` : programmes de musculation disponibles.
- `style.css` : styles partagés et adaptations aux tailles d'écran.
- `muscu.js` : chronomètres, réglages des séances et sauvegarde locale.
- `service-worker.js` et `manifest.json` : installation et fonctionnement hors ligne.

## Jours de musculation

| Jour affiché | Fichier | Contenu |
| --- | --- | --- |
| Mardi | `muscu_mardi.html` | Jambes et abdos |
| Mercredi | `muscu_mercredi.html` | Dos, épaules et bras |
| Vendredi | `muscu_vendredi.html` | Full body athlétique |
| Dimanche | `muscu_dimanche.html` | Haut du corps |

Les pages de choix et la liste du cache hors ligne doivent pointer vers ces mêmes noms.

## Identifiants et sauvegardes

Les clés de sauvegarde utilisent `data-page-key`. Lorsqu'un jour change de nom, `data-legacy-page-keys` permet de reprendre les réglages existants dans le stockage local. Les identifiants `data-exercise-id` restent stables afin de ne pas casser les réglages déjà enregistrés pour les exercices.
