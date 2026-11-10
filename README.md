# Movecity — Borne interactive (Châtelet - Les Halles)

Borne anonyme, sans compte, installée en station de métro. Elle aide les **touristes**, les **seniors** et les **personnes à mobilité réduite (PMR)** à se repérer et à savoir si les ascenseurs fonctionnent (dernier état connu).

## Parcours utilisateur

1. Accueil : **« Bienvenue sur Movecity, vous êtes ? »** → *Touriste*, *Senior*, *PMR*.
2. L'écran s'adapte au profil. Seul le profil **PMR** affiche l'état des ascenseurs (panneau + marqueurs ✓ ✕ ?).
3. « Vous êtes ici » = position réelle et fixe de la borne (lue en base).
4. 60 s sans interaction + 10 s d'avertissement → retour à l'accueil, session effacée.

## Espace opérateur (`/operateur`)

Interface séparée de la borne, **protégée par connexion** (JWT en mémoire : un rechargement de page déconnecte). Accès prévu via VPN.

- **Tableau de bord** (3e visualisation du projet) : recherches par heure, par langue, stations les plus recherchées, pannes d'ascenseurs par ligne. Périodes 7 / 30 / 90 jours.
- **Ascenseurs** : liste filtrable, déclarer en panne (avec cause) / remettre en service / statut inconnu, ajouter, supprimer.
- **Stations** : créer, modifier (nom, position, lignes), supprimer (la station de la borne est protégée).

Compte : `npm run db:seed` (ADMIN_EMAIL / ADMIN_PASSWORD du `.env`). En dev : http://localhost:5173/operateur — en production : http://localhost:3000/operateur.

## Stack

| Couche | Technologie |
|---|---|
| Front | React 19 + TypeScript (Vite), Leaflet, lucide-react, Kantumruy Pro |
| Back | Node.js + Express 4, architecture en couches `routes → middleware → controllers → models` |
| Base | **PostgreSQL 16**, SQL écrit à la main (`pg`, requêtes paramétrées, pas d'ORM) |
| Auth | Citoyen : aucune. Opérateur : JWT HS256 (2 h) + bcrypt |
| Validation | zod |
| Tests | `node:test` (API, base `*_test` dédiée) + Vitest (front) |

## Installation

Prérequis : Node.js ≥ 20, PostgreSQL ≥ 14.

### 1. Créer la base et l'utilisateur

```sql
-- psql -U postgres
CREATE USER movecity WITH PASSWORD 'votre_mot_de_passe';
CREATE DATABASE movecity OWNER movecity;
CREATE DATABASE movecity_test OWNER movecity;  -- pour les tests
```

### 2. Configurer `.env`

```bash
copy .env.example .env      # Windows   (Linux/macOS : cp)
```

Renseigner `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, puis un `JWT_SECRET` long et aléatoire :

### 3. Installer, migrer, lancer

```bash
npm install            # installe aussi le client
npm run db:migrate     # crée les tables et la vue v_etat_station
npm run db:seed        # kiosque, lignes, stations, ascenseurs (démo) de Châtelet
npm run db:demo        # (optionnel) 600 recherches fictives pour le dashboard
# (db:seed crée déjà l'opérateur depuis ADMIN_EMAIL / ADMIN_PASSWORD)
# autre compte : npm run operateur:creer -- email@exemple.fr "MotDePasse12+"
npm run sync:ascenseurs -- --dry-run  # simule la synchro IDFM (rapprochement des stations)
npm run sync:ascenseurs               # synchronise les ascenseurs depuis IDFM
npm run dev            # API :3000 + front :5173  →  http://localhost:5173
```

`npm run db:reset` supprime puis recrée tout le schéma.

Production : `npm run build` puis `npm start` (un seul serveur, port 3000).

## Structure du back

```
server/
├── db/            schema.sql, seed.sql, seed_demo_journal.sql
├── scripts/       db.js (migrate|seed|reset|demo), creer-operateur.js
├── src/
│   ├── config/        env.js, database.js
│   ├── routes/        index.js (table des endpoints)
│   ├── middleware/    securite, validate (zod), auth (JWT), erreurs
│   ├── controllers/   health, kiosque, lignes, stations, ascenseurs, geocode, auth, stats
│   ├── models/        lignes, kiosque, stations, ascenseurs, journal, operateurs
│   ├── schemas/       schémas zod
│   ├── jobs/          purgeJournal.js
│   ├── app.js
│   └── server.js
└── tests/api.test.js
```

## Endpoints (préfixe `/api`)

| Méthode | Route | Accès |
|---|---|---|
| GET | `/health` | public |
| GET | `/kiosk/config` | public |
| GET | `/lignes` | public |
| GET | `/stations` · `/stations/nearest?lat&lon&limit` · `/stations/:id` | public |
| GET | `/ascenseurs` (`?statut&id_station`) · `/ascenseurs/stats` · `/ascenseurs/:id` | public |
| GET | `/geocode?q&lang` | public (30/min) |
| POST | `/auth/login` | public (10/15 min) |
| GET | `/auth/me` | opérateur |
| POST · PUT · DELETE | `/stations` · `/stations/:id` | opérateur |
| POST · PATCH · DELETE | `/ascenseurs` · `/ascenseurs/:id` | opérateur |
| GET | `/stats/usage?jours` | opérateur |

## Tester avec Postman

1. Importer `docs/postman/Movecity.postman_collection.json` et `docs/postman/Movecity-local.postman_environment.json`.
2. Choisir l'environnement **Movecity local** (`baseUrl = http://localhost:3000/api`).
3. Lancer **Auth → Login** : le jeton est enregistré automatiquement dans la variable `token`.
4. Les requêtes l'utilisent seules. La collection contient des tests (Runner ▸ Run collection).

## Tests automatiques

```bash
npm run test:api   # tests d'intégration, sur la base <DB_NAME>_test
npm test           # tests front (Vitest)
npm run typecheck
```

## Documentation

- [Architecture technique](docs/ARCHITECTURE.md)
- [Choix de données et sources](docs/DONNEES.md)
- [MCD / MLD / diagrammes de classes](docs/MCD_MLD.md)
- [Référence API](docs/API.md)

## Synchronisation des ascenseurs (IDFM)

Le script lit le jeu « État des ascenseurs » d'Île-de-France Mobilités (publié ~3 fois par jour), rattache chaque zone de correspondance à nos stations et met à jour la base (idempotent, transactionnel).

1. `npm run db:migrate` (ajoute `station.ref_zdc` et `ascenseur.libelle`).
2. `npm run sync:ascenseurs -- --dry-run` : liste les stations rapprochées et les zones IDFM « proches » non rapprochées → à ajouter dans `server/src/sync/alias-stations.json` si besoin.
3. `npm run sync:ascenseurs` : applique. Les ascenseurs de démonstration (`DEMO-n`) des stations couvertes sont supprimés.
4. Automatique : `IDFM_SYNC_ACTIVE=true` dans `.env` (au démarrage puis toutes les 3 h).
5. Sans accès au flux : télécharger le CSV du jeu sur data.iledefrance-mobilites.fr et lancer `npm run sync:ascenseurs -- --file chemin/vers/fichier.csv`.

Règles de prudence : un ascenseur absent du flux passe en « inconnu » ; un flux vide annule tout ; la date affichée est celle du relevé IDFM.

## Points valider avec l'équipe

- Licence et fréquence des données IDFM (ascenseurs : ~3 mises à jour par jour) ; quota et conditions PRIM.
- Durée de conservation du journal (90 jours par défaut) → validation Cyber.
- Hébergement, VPN opérateur, mode kiosque du navigateur.
- Les états d'ascenseurs du seed (`DEMO-001…005`) sont **fictifs**.
