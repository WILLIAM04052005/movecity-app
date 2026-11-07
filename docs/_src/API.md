# Movecity — API REST, diagramme de classes et tests Postman (v3)

Base : `http://localhost:3000/api` · Format : JSON · Erreurs : `{ "error": "message", "details": [...] }`. = jeton opérateur requis : en-tête `Authorization: Bearer <token>`.


## Endpoints

### Santé et borne (publics)

| Méthode | Route | Rôle | Réponses |
|---|---|---|---|
| GET | `/health` | État du service et de la base | 200, 503 |
| GET | `/kiosk/config` | Identité de la borne : position réelle, station, lignes affichées | 200, 404 |
| GET | `/lignes` | Toutes les lignes (Métro puis RER, ordre numérique) | 200 |

### Stations

| Méthode | Route | Paramètres | Rôle | Réponses |
|---|---|---|---|---|
| GET | `/stations` | — | Stations + codes de lignes + `statut_ascenseur` agrégé | 200 |
| GET | `/stations/nearest` | `lat`, `lon` (requis), `limit` (1–20, défaut 3) | Stations les plus proches, avec `distance_km` | 200, 400 |
| GET | `/stations/:id` | — | Détail d'une station | 200, 400, 404 |
| POST | `/stations` | `{ nom_station, latitude, longitude, lignes?: ["M1"] }` | Crée (transaction) | 201, 400, 401 |
| PUT | `/stations/:id` | au moins un champ ; `lignes` **remplace** les lignes | Modifie | 200, 400, 401, 404 |
| DELETE | `/stations/:id` | — | Supprime | 204, 401, 404, **409** si elle héberge une borne |

### Ascenseurs

| Méthode | Route | Paramètres | Rôle | Réponses |
|---|---|---|---|---|
| GET | `/ascenseurs` | `statut?`, `id_station?` | Liste filtrable | 200, 400 |
| GET | `/ascenseurs/stats` | `limite?` (1–20, défaut 5) | **Vue accessibilité de la borne** : taux de pannes, pannes par ligne, stations les moins accessibles | 200 |
| GET | `/ascenseurs/:id` | — | Détail | 200, 404 |
| POST | `/ascenseurs` | `{ id_station, statut?, cause_panne?, ref_externe? }` | Crée | 201, 400, 409 |
| PATCH | `/ascenseurs/:id` | `statut?`, `cause_panne?` (au moins un) | Met à jour et rafraîchit `date_maj` ; **efface la cause si le statut n'est plus `en_panne`** | 200, 400, 404 |
| DELETE | `/ascenseurs/:id` | — | Supprime | 204, 404 |

### Recherche d'adresse

| Méthode | Route | Paramètres | Rôle | Réponses |
|---|---|---|---|---|
| GET | `/geocode` | `q` (3–200 car.), `lang` (`fr`/`en`) | Adresse → `{ libelle, latitude, longitude }` via la Base Adresse Nationale. Journalise **seulement** station proche + langue + heure. **30 appels/min** | 200, 400, 404, 429, 503 |

### Authentification et statistiques opérateur

| Méthode | Route | Corps / paramètres | Rôle | Réponses |
|---|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | Renvoie `{ token, token_type, expires_in, operateur }`. **10 essais / 15 min** | 200, 400, 401, 429 |
| GET | `/auth/me` | — | Opérateur du jeton | 200, 401 |
| GET | `/stats/usage` | `jours` (1–365, défaut 30) | Recherches par station, langue, heure (0–23), jour | 200, 400, 401 |

### Exemple de réponse : `GET /ascenseurs/stats`

```json
{
  "total": 5, "disponibles": 3, "en_panne": 1, "inconnus": 1, "taux_panne_pct": 20,
  "derniere_maj": "2026-10-30T13:43:13.647Z",
  "pannes_par_ligne": [{ "code_ligne": "M1", "type_ligne": "Métro", "total": 3, "en_panne": 1 }],
  "stations_moins_accessibles": [
    { "id_station": 3, "nom_station": "Louvre - Rivoli", "statut": "en_panne",
      "nb_ascenseurs": 1, "nb_en_panne": 1, "nb_inconnus": 0, "date_maj": "2026-10-30T13:43:13.647Z" }
  ]
}
```

## 3. Mise en route PostgreSQL

```sql
CREATE USER movecity WITH PASSWORD 'movecity_dev';
CREATE DATABASE movecity      OWNER movecity ENCODING 'UTF8';
CREATE DATABASE movecity_test OWNER movecity ENCODING 'UTF8';   -- uniquement pour npm run test:api
```

```bash
copy .env.example .env        # Windows (Linux/Mac : cp)  → puis renseigner DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET
npm install
npm run db:migrate            # crée les tables
npm run db:seed               # données de Châtelet + opérateur (ADMIN_EMAIL / ADMIN_PASSWORD)
npm run db:demo              
npm run dev                   # API :3000 + front :5173
```

Variables de `.env` : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (ou `DATABASE_URL`), `DB_SSL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `KIOSK_ID`, `RETENTION_JOURNAL_JOURS`, `PORT`.

Autres commandes : `npm run db:reset` (⚠ supprime tout, développement uniquement) · `npm run operateur:creer -- email "motDePasse12+"`.

## 4. Tester avec Postman

1. Lancer l'API (`npm run dev`, ou `npm run dev:server` seul).
2. Postman → **Import** → `docs/postman/Movecity.postman_collection.json` **et** `docs/postman/Movecity-local.postman_environment.json`.
3. Choisir l'environnement **« Movecity – local »** (en haut à droite). Variables : `baseUrl` (`http://localhost:3000/api`), `email`, `password` (ceux de `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
4. Exécuter dans l'ordre **1 · Santé → 2 · Public → 3 · Auth → 4 · Opérateur**. La requête `POST /auth/login` enregistre automatiquement le jeton dans `{{token}}`.
5. Ou tout d'un coup : clic droit sur la collection → **Run collection**. Chaque requête contient ses tests (statut, forme de la réponse).

> Résultat de référence : 27 requêtes, 40 assertions. La requête `GET /geocode` exige internet (elle appelle la Base Adresse Nationale).
>
> **Exemple sans Postman (curl)** :
> `curl http://localhost:3000/api/stations/nearest?lat=48.8559&lon=2.3606&limit=3`

## 5. Tests automatiques

`npm run test:api` — 33 tests sur un vrai PostgreSQL (base `movecity_test`, **vidée à chaque exécution** ; le test refuse de tourner sur une base dont le nom ne finit pas par `_test`).
