# Movecity — Documentation d'architecture technique (v3)

> Périmètre : filière **Développement web**. Dernière mise à jour : 30/10/2026.
> Les schémas sont en Mermaid (affichés directement par GitHub / VS Code) ; leurs images sont dans `docs/img/`, leurs sources dans `docs/diagrams/`.

## 1. Objectif et périmètre

Movecity est une **borne interactive anonyme**, installée en station de métro (pilote : **Châtelet – Les Halles**, Paris). Elle aide trois profils — **touristes**, **seniors**, **personnes à mobilité réduite (PMR)** — à se repérer et à savoir si les ascenseurs fonctionnent. Aucun compte, aucune donnée personnelle côté citoyen.

| Dans le périmètre (prototype v1) | Prévu (J6 et suivantes) | Hors périmètre / simulé |
|---|---|---|
| Écran d'accueil à 3 profils | Synchronisation du flux IDFM « état des ascenseurs » | Rechargement Navigo, paiement par carte |
| Carte, position réelle de la borne, recherche d'adresse → 3 stations proches | Itinéraires via l'API PRIM | |
| Panneau ascenseurs **réservé au profil PMR** | Ticket imprimable (étapes + prix affiché avant validation) | |
| FR / EN, aide, retour automatique à l'accueil | Vue « accessibilité » sur la borne (taux de pannes, pannes par ligne, stations les moins accessibles) | |
| API REST + PostgreSQL, authentification opérateur, statistiques d'usage anonymes | Interface opérateur (connexion + dashboard ≥ 3 visualisations) | |

## 2. Contraintes qui structurent l'architecture

| Contrainte | Conséquence technique |
|---|---|
| **Anonymat du citoyen** (RGPD, manifeste du projet) | Aucune table utilisateur public ; le journal ne stocke ni adresse ni coordonnées ; aucune session citoyen. |
| **Borne partagée** : plusieurs usagers se succèdent | Retour automatique à l'accueil après inactivité (60 s + 10 s d'avertissement) ; état effacé (recherche, profil, langue). |
| **Threat model — accès physique (16/16)** | Mode kiosque verrouillé (navigateur plein écran, hors code) + effacement de session. |
| **Threat model — exposition internet (12/16)** | En-têtes de sécurité + CSP stricte, limitation de débit, validation de toutes les entrées, requêtes SQL paramétrées, JWT pour l'opérateur, secrets dans `.env`. |
| **Threat model — véracité des données (4/16)** | Date de mise à jour affichée, statut « inconnu » plutôt qu'une supposition, avertissement si donnée > 24 h. |
| **Donnée ascenseurs non temps réel** | Publiée 3 fois par jour par IDFM (issue de tournées d'agents en gare) : on parle de « dernier état connu », jamais de « temps réel ». |
| **Usagers fragiles** (seniors, PMR) | Zones tactiles ≥ 3,5 rem, texte agrandi en profil Senior, statut jamais porté par la couleur seule (icône + mot), contrastes AA/AAA de la charte. |
| **Pas de clavier physique sur la borne** | Clavier tactile à l'écran à prévoir (non réalisé). |

## 3. Vue d'ensemble

{{mmd:architecture}}

*Traits pleins : réalisé. Traits pointillés : prévu.* Image : `img/architecture.png`.

## 4. Choix technologiques

| Couche | Choix | Pourquoi | Alternative écartée |
|---|---|---|---|
| Base de données | **PostgreSQL 16** | Plusieurs bornes + opérateurs en parallèle ; contraintes (`CHECK`, `FK`), vue SQL, types horodatés (`timestamptz`) ; hébergement managé courant ; extension PostGIS possible plus tard | SQLite (utilisé pour le prototype v1 : fichier local, une seule instance) |
| Accès aux données | Module **`pg`** + SQL écrit à la main dans les *modèles* | SQL visible et défendable au jury ; aucune « magie » ; requêtes toujours paramétrées | ORM (Prisma/Sequelize) : plus de dépendances, SQL masqué |
| Back | **Node.js + Express 4** (JavaScript) | Compétence de l'équipe, écosystème, simplicité | Express 5 / NestJS : surdimensionné pour le calendrier |
| Validation | **zod** | Schémas déclaratifs, messages d'erreur exploitables | Validation manuelle (répétitive, source de trous) |
| Authentification opérateur | **JWT** (HS256, 2 h) + **bcryptjs** | Sans état, testable sous Postman ; `bcryptjs` est du JavaScript pur : **aucune compilation native** (problème rencontré sous Windows avec `better-sqlite3`) | Sessions serveur ; `bcrypt` natif |
| Front | **React 19 + TypeScript (léger) + Vite** | Composants réutilisables ; types métier (`Station`, `Ascenseur`, `Persona`) qui sécurisent les échanges avec l'API | JavaScript vanilla (v1) : plus rien à structurer dès qu'il y a 3 profils |
| Carte | **Leaflet + tuiles OpenStreetMap** | Gratuit, sans clé, léger | Google Maps (clé + facturation) |
| Tests | `node:test` (API), Vitest (front), collection **Postman** | Aucune dépendance de test supplémentaire côté API | Jest |

## 5. Architecture du back-end (couches)

Règle d'or : **chaque couche ne parle qu'à la suivante**.
`routes` → `middleware` → `controllers` → `models` → PostgreSQL.
Un contrôleur n'écrit jamais de SQL ; un modèle ne connaît pas HTTP.

```
server/
├── src/
│   ├── server.js            # démarre l'écoute, vérifie PostgreSQL, arrêt propre
│   ├── app.js               # assemble Express (testable sans réseau)
│   ├── config/
│   │   ├── env.js           # lit .env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET…)
│   │   └── database.js      # pool PostgreSQL + transaction()
│   ├── routes/index.js      # table de tous les endpoints
│   ├── middleware/          # securite (CSP, limite de débit), validate (zod), auth (JWT), erreurs
│   ├── schemas/             # schémas zod de validation
│   ├── controllers/         # traduit HTTP ⇄ modèles (statuts, erreurs)
│   ├── models/              # SQL paramétré (un fichier par entité)
│   ├── jobs/purgeJournal.js # purge quotidienne (RGPD)
│   └── utils/http.js        # HttpError, asyncHandler
├── db/                      # schema.sql, seed.sql, seed_demo_journal.sql
├── scripts/                 # db.js (migrate/seed/reset/demo), creer-operateur.js
└── tests/api.test.js        # 33 tests d'intégration sur PostgreSQL réel
```

Diagramme de classes détaillé (contrôleurs ⇄ modèles ⇄ endpoints) : voir [`API.md`](API.md).

Points de conception à retenir :
- **Gestion d'erreurs centralisée** : les codes d'erreur PostgreSQL sont traduits en réponses HTTP claires (`23505` → 409 doublon, `23503` → 409 référence, `23514` → 400 règle de gestion).
- **Transactions** : création/modification d'une station + de ses lignes en un seul bloc (tout ou rien).
- **Règle de gestion portée par la base** : `CHECK (statut = 'en_panne' OR cause_panne IS NULL)`.
- **Vue `v_etat_station`** : statut agrégé prudent (une panne l'emporte, puis l'inconnu).
- **Distances en SQL** : formule de Haversine, sans extension.

## 6. Architecture du front-end

{{mmd:front}}

- **État global** : React Context (`KioskContext`) — profil, langue, recherche, données de l'API. Un seul endroit, pas de duplication.
- **Logique pure séparée** (`utils/`) : distance, agrégation des statuts, fraîcheur des données — testée unitairement (12 tests).
- **Profils** : *Touriste* (carte + recherche), *Senior* (idem, texte et boutons agrandis), *PMR* (ajoute le panneau ascenseurs et les marqueurs ✓ ✕ ?). Les ascenseurs ne sont affichés **que** pour le profil PMR.
- **Charte graphique** centralisée dans `client/src/styles/theme.css` (vert d'accent, secondaire `#c2bfff`, primaire `#efabb4`, texte `#222222`, police Kantumruy Pro auto-hébergée).

## 7. Flux principaux

### 7.1 Recherche d'adresse (citoyen)
{{mmd:sequence-recherche}}

### 7.2 Opérateur : connexion, mise à jour d'un ascenseur, statistiques
{{mmd:sequence-operateur}}

## 8. Sécurité et protection des données

| Menace (threat model) | Mesure | Où | État |
|---|---|---|---|
| Accès physique à la borne | Navigateur plein écran verrouillé, pas d'accès système | Système de la borne | **Prévu** (hors code) |
| | Retour accueil + effacement de session après inactivité | `hooks/useInactivite.ts` | Fait |
| Abus / saturation de l'API | Limitation de débit : 30 recherches/min, 10 connexions/15 min par IP | `middleware/securite.js` | Fait |
| Injection (SQL, corps malformé) | Requêtes paramétrées, validation zod, taille du corps limitée à 10 ko | `models/`, `schemas/` | Fait |
| XSS / chargement de ressources tierces | CSP stricte (`default-src 'self'`), `X-Frame-Options`, `nosniff`, pas de HTML venant des données | `middleware/securite.js`, `MapView.tsx` | Fait |
| Accès non autorisé à l'administration | JWT HS256 (2 h), compte revérifié en base à chaque requête, hash bcrypt, réponse identique si l'e-mail est inconnu | `middleware/auth.js`, `auth.controller.js` | Fait |
| Force brute sur la connexion | Limite de tentatives + temps de calcul constant | `routes/index.js` | Fait |
| Accès internet à l'administration | Zone opérateur derrière **VPN** | Infrastructure | **Prévu** (hors code) |
| Fuite de secrets | `.env` hors dépôt (`.gitignore`), refus de démarrer en production avec un secret faible | `config/env.js` | Fait |
| Donnée ascenseur fausse ou périmée | Date affichée, « inconnu » par défaut, avertissement > 24 h | `ElevatorPanel.tsx`, `v_etat_station` | Fait |
| Atteinte à la vie privée | Aucune adresse/coordonnée stockée, journal purgé (90 j proposés) | `journal.model.js`, `jobs/` | Fait — durée à valider avec la Cyber |

## 9. Environnements et déploiement

| | Développement | Production (cible) |
|---|---|---|
| Lancement | `npm run dev` : API `:3000` + Vite `:5173` (proxy `/api`) | `npm run build` puis `npm start` : **un seul serveur** Node qui sert l'API et le front compilé |
| Base | PostgreSQL local | PostgreSQL managé (SSL : `DB_SSL=true` ou `DATABASE_URL`) |
| Secrets | `.env` local | Variables d'environnement de l'hébergeur |
| Borne | Navigateur classique | Navigateur en mode kiosque plein écran, écran tactile |

Étapes de mise en ligne : créer la base → `npm run db:migrate` → `npm run db:seed` → `npm run operateur:creer` → définir `JWT_SECRET` (≥ 32 caractères aléatoires), `NODE_ENV=production`, `TRUST_PROXY=true` derrière un hébergeur → `npm run build && npm start`. Le choix de l'hébergeur reste à faire avec l'équipe.

## 10. Qualité

| Contrôle | Commande | Couverture |
|---|---|---|
| Tests d'intégration API (PostgreSQL réel, base `*_test` vidée à chaque exécution) | `npm run test:api` | 33 tests : endpoints publics, authentification, CRUD opérateur, règles de gestion, transactions, journal anonyme, purge, limite de débit |
| Tests unitaires front | `npm test` | 12 tests : distance, agrégation des statuts, dates |
| Typage | `npm run typecheck` | TypeScript strict |
| Recette manuelle de l'API | Collection Postman (`docs/postman/`) | 27 requêtes, 40 assertions (une dépend d'internet : la recherche d'adresse) |

## 11. Décisions d'architecture

| N° | Décision | Statut |
|---|---|---|
| ADR-01 | Borne **anonyme**, sans compte citoyen ; aucun favori ni historique | Validée par l'équipe |
| ADR-02 | Authentification **côté opérateur uniquement**, accès administration via VPN | Validée |
| ADR-03 | « Dernier état connu » plutôt que « temps réel » pour les ascenseurs | Validée |
| ADR-04 | Itinéraires via le calculateur **PRIM** plutôt que codés maison | Validée (intégration prévue) |
| ADR-05 | Journal de recherche **minimisé** (pas d'adresse) et purgé | Validée — durée à confirmer |
| ADR-06 | **PostgreSQL** + Express en couches ; SQL à la main (pas d'ORM) | Proposée le 30/10 |
| ADR-07 | Front **React + TypeScript** léger | Validée |
| ADR-08 | JWT + `bcryptjs` (JavaScript pur) | Proposée le 30/10 |

## 12. Limites connues et prochaines étapes

1. **Synchronisation IDFM implémentée mais à valider sur le vrai flux** : l'adresse de l'API (`IDFM_URL`), la correspondance des noms de zones avec nos stations (`npm run sync:ascenseurs -- --dry-run`) et la licence restent à confirmer. Tant qu'elle n'a pas tourné, les statuts (`DEMO-n`) sont des données de démonstration.
2. **PRIM** : compte et acceptation des CGU requis ; quotas à vérifier sur le compte de l'équipe ; option « fauteuil roulant » à confirmer. Prévoir un **cache** pour ne pas épuiser le quota quotidien.
3. **Interface opérateur** (connexion + dashboard ≥ 3 visualisations) : l'API est prête (`/auth/login`, `/stats/usage`, `/ascenseurs/stats`), l'interface reste à construire.
4. **Clavier tactile** à l'écran.
5. **Hébergement, VPN, mode kiosque, intégration continue** : à décider avec l'équipe.
6. **Fond de carte** : l'usage intensif des tuiles OpenStreetMap est encadré par leur politique ; à revoir avant un vrai déploiement.
