# Movecity — MCD / MLD / modèle physique (v3, PostgreSQL)

Évolutions depuis la v2 : passage à **PostgreSQL** ; `ascenseur.ref_externe` (clé de synchronisation IDFM) ; `date_maj` en `timestamptz` ; règle « cause de panne uniquement si en panne » portée par la base ; `kiosque → station` en `ON DELETE RESTRICT` ; vue `v_etat_station` ; **synchronisation IDFM** : `station.ref_zdc` (zone de correspondance IDFM, UNIQUE, NULL) et `ascenseur.libelle` (emplacement).

## 1. Règles de gestion

1. Une **station** est desservie par 0 à n **lignes** ; une ligne dessert 0 à n stations.
2. Un **ascenseur** appartient à **une et une seule** station ; une station possède 0 à n ascenseurs.
3. Un **kiosque** (borne) est installé à **une et une seule** station ; une station accueille 0 à n kiosques.
4. Un kiosque affiche 0 à n **lignes** ; une ligne peut être affichée sur 0 à n kiosques.
5. Une **recherche** (journal) est enregistrée par **un** kiosque et concerne au plus **une** station (la plus proche). Elle ne contient **ni adresse ni coordonnées**.
6. Un **opérateur** est un compte isolé : aucun lien avec les citoyens.
7. Une **cause de panne** n'existe que si l'ascenseur est **en panne**.
8. On ne peut pas supprimer une station qui héberge encore une borne.

## 2. MCD (Merise)

![MCD Merise](img/mcd-merise.png)

| Association | Entité A | Entité B | Lecture |
|---|---|---|---|
| DESSERT | STATION (0,n) | LIGNE (0,n) | Une station est desservie par plusieurs lignes et inversement |
| POSSÈDE | ASCENSEUR **(1,1)** | STATION (0,n) | Un ascenseur → exactement une station |
| SITUÉ_À | KIOSQUE **(1,1)** | STATION (0,n) | Une borne → exactement une station |
| AFFICHE | KIOSQUE (0,n) | LIGNE (0,n) | Lignes montrées en haut de l'écran |
| ENREGISTRE | JOURNAL_RECHERCHE **(1,1)** | KIOSQUE (0,n) | Chaque recherche vient d'une borne |
| EST_PROCHE_DE | JOURNAL_RECHERCHE (0,1) | STATION (0,n) | Station la plus proche (optionnelle) |

> Lecture d'une cardinalité : on la lit **du côté de l'entité qu'on quitte** vers l'association. « Un ascenseur possède combien de stations ? » → 1,1.

## 3. Dictionnaire de données

| Entité | Attribut | Type PostgreSQL | Contrainte |
|---|---|---|---|
| STATION | id_station | `INTEGER` identité | PK |
| | nom_station | `VARCHAR(120)` | NOT NULL |
| | latitude / longitude | `DOUBLE PRECISION` | NOT NULL, bornes −90..90 / −180..180 |
| | ref_zdc | `VARCHAR(30)` | UNIQUE, NULL (zone de correspondance IDFM) |
| LIGNE | id_ligne | `INTEGER` identité | PK |
| | code_ligne | `VARCHAR(20)` | UNIQUE, NOT NULL (« M1 », « RER A ») |
| | type_ligne | `VARCHAR(20)` | `Métro` \| `RER` \| `Tram` \| `Train` |
| ASCENSEUR | id_ascenseur | `INTEGER` identité | PK |
| | statut | `VARCHAR(12)` | `disponible` \| `en_panne` \| `inconnu` (défaut `inconnu`) |
| | cause_panne | `VARCHAR(200)` | NULL, uniquement si `en_panne` |
| | date_maj | `TIMESTAMPTZ` | NOT NULL, défaut `now()` |
| | ref_externe | `VARCHAR(50)` | UNIQUE, NULL (identifiant IDFM `liftId`) |
| | libelle | `VARCHAR(200)` | NULL (emplacement, IDFM `liftSituation → liftDirection`) |
| | id_station | `INTEGER` | FK → station, NOT NULL, CASCADE |
| KIOSQUE | id_kiosque | `INTEGER` identité | PK |
| | nom_emplacement | `VARCHAR(160)` | NOT NULL |
| | latitude / longitude | `DOUBLE PRECISION` | NOT NULL (position réelle de la borne) |
| | id_station | `INTEGER` | FK → station, NOT NULL, **RESTRICT** |
| JOURNAL_RECHERCHE | id_recherche | `BIGINT` identité | PK |
| | id_kiosque | `INTEGER` | FK → kiosque, NOT NULL, CASCADE |
| | id_station_proche | `INTEGER` | FK → station, NULL, SET NULL |
| | langue | `VARCHAR(2)` | `fr` \| `en` |
| | date_recherche | `TIMESTAMPTZ` | NOT NULL, défaut `now()` |
| OPERATEUR | id_operateur | `INTEGER` identité | PK |
| | email | `VARCHAR(254)` | UNIQUE (insensible à la casse) |
| | password_hash | `TEXT` | hash bcrypt |
| | date_creation | `TIMESTAMPTZ` | défaut `now()` |

## 4. MLD (relationnel)

Clé primaire : **PK** · clé étrangère : `#`.

```
STATION           (PK id_station, nom_station, latitude, longitude, ref_zdc)
LIGNE             (PK id_ligne, code_ligne, type_ligne)
STATION_LIGNE     (PK #id_station, PK #id_ligne)
ASCENSEUR         (PK id_ascenseur, statut, cause_panne, date_maj, ref_externe, libelle, #id_station)
KIOSQUE           (PK id_kiosque, nom_emplacement, latitude, longitude, #id_station)
KIOSQUE_LIGNE     (PK #id_kiosque, PK #id_ligne)
JOURNAL_RECHERCHE (PK id_recherche, #id_kiosque, #id_station_proche, langue, date_recherche)
OPERATEUR         (PK id_operateur, email, password_hash, date_creation)
```

Règles de passage MCD → MLD appliquées :
- association **(1,1)–(0,n)** : la clé étrangère va **du côté (1,1)** → `#id_station` dans ASCENSEUR et KIOSQUE, jamais l'inverse ;
- association **(n,n)** (DESSERT, AFFICHE) : nouvelle table dont la clé primaire est la paire de clés étrangères ;
- association **(0,1)–(0,n)** (journal → station) : clé étrangère **nullable**.

{{mmd:mld}}

Image : `img/mld.png`. Script exécutable : [`server/db/schema.sql`](../server/db/schema.sql).

## 5. Vue SQL : `v_etat_station`

| Colonne | Sens |
|---|---|
| `statut_ascenseur` | `en_panne` si au moins un ascenseur l'est, sinon `inconnu` si au moins un l'est ou si aucun n'est référencé, sinon `disponible` |
| `nb_ascenseurs`, `nb_en_panne`, `nb_inconnus` | Compteurs par station |
| `date_maj_min` | Mise à jour la plus ancienne (approche prudente) |

## 6. Diagramme de classes du domaine

{{mmd:classes-domaine}}

Image : `img/classes-domaine.png`. Le diagramme des classes **avec les endpoints** (contrôleurs ⇄ modèles) est dans [`API.md`](API.md).
