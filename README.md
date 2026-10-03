# Movecity — DataCity EFREI

Assistant de navigation accessible pour les personnes à mobilité réduite, les seniors et les touristes dans les transports en commun.

## Stack

- **Front** : HTML / CSS / JavaScript vanilla
- **Back** : Node.js + Express
- **Base de données** : SQLite via `node:sqlite` (intégré à Node.js, aucune compilation native requise), fichier local `movecity.db`
- **Carte** : Leaflet.js *(à intégrer)*
- **Graphiques** : Chart.js *(à intégrer)*

## Architecture

```
Front (vanilla JS, Leaflet, Chart.js)
        |  HTTPS
        v
API Node/Express (auth, favoris, proxy données)
    |                         |
    v                         v
Base de données          API IDFM (ascenseurs)
(comptes, favoris)        mise à jour 3x/jour
```

## Installation

> Nécessite Node.js v22.5 ou plus récent (pour `node:sqlite`). Tape `node --version` pour vérifier.

```bash
npm install
cp .env.example .env
npm run dev
```

Au démarrage, un avertissement `ExperimentalWarning: SQLite is an experimental feature` s'affiche dans la console : c'est normal, sans impact pour ce projet.

Le serveur démarre sur http://localhost:3000

## Structure du projet

```
movecity-app/
├── public/              # Front (servi tel quel par Express)
│   ├── css/style.css
│   ├── js/app.js
│   ├── pages/           # Futures pages (carte, favoris, dashboard...)
│   └── index.html
├── server/
│   ├── index.js         # Point d'entrée
│   ├── routes/
│   │   ├── auth.js       # Inscription / connexion / déconnexion
│   │   ├── favoris.js     # CRUD trajets favoris (protégé, auth requise)
│   │   └── ascenseurs.js  # Proxy + cache vers la donnée IDFM
│   ├── models/
│   │   └── db.js          # Schéma SQLite (users, trajets_favoris)
│   └── middleware/
│       └── auth.js        # requireAuth
├── .env.example
└── movecity.db           # créé automatiquement au premier lancement
```

## État d'avancement (J3 - architecture posée)

- [x] Structure du projet
- [x] Authentification (inscription/connexion/déconnexion, mot de passe hashé)
- [x] Modèle de données (users, trajets_favoris)
- [x] Route ascenseurs avec cache + fallback (données d'exemple en attendant l'accès IDFM réel)
- [ ] Intégration Leaflet (carte des stations)
- [ ] Intégration Chart.js (dashboard)
- [ ] Pages : détail station, favoris, dashboard, paramètres
- [ ] Confirmer l'URL réelle de l'API IDFM "État des ascenseurs"
- [ ] Revue avec la Cyber : threat model sur les trajets favoris (donnée sensible)

## Points de vigilance techniques

- La donnée IDFM n'est mise à jour que 3x/jour : ne jamais annoncer du "temps réel" à l'utilisateur.
- Un trajet favori peut révéler des informations sensibles (domicile, lieu de soin) : à traiter avec la politique de confidentialité de la filière Cybersécurité.
- Le mode simplifié (accessibilité) est géré en CSS pur via une classe sur `<body>`, pas de librairie tierce.
