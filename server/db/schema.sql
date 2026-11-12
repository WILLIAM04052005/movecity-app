-- Movecity — Schéma PostgreSQL (borne / kiosque)
-- Principes (manifeste + dossier de cadrage de l'equipe) :
--  * Citoyen ANONYME : aucune table utilisateur public, aucun favori, aucun historique de trajet.
--  * Minimisation : l'adresse tapée n'est JAMAIS stockée.
--  * Seul l'OPÉRATEUR a un compte (accès administration via VPN).

-- --- STATION ---
CREATE TABLE IF NOT EXISTS station (
  id_station   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom_station  VARCHAR(120)     NOT NULL,
  latitude     DOUBLE PRECISION NOT NULL CHECK (latitude  BETWEEN  -90 AND  90),
  longitude    DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  -- Identifiant de la zone de correspondance IDFM (ZdCId), mémorisé à la 1re synchronisation.
  ref_zdc      VARCHAR(30) UNIQUE
);

-- --- LIGNE ---
CREATE TABLE IF NOT EXISTS ligne (
  id_ligne    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code_ligne  VARCHAR(20) NOT NULL UNIQUE,                 -- "M1", "RER A"
  type_ligne  VARCHAR(20) NOT NULL CHECK (type_ligne IN ('Métro', 'RER', 'Tram', 'Train'))
);

-- --- DESSERT : STATION (0,n) — (0,n) LIGNE ---
CREATE TABLE IF NOT EXISTS station_ligne (
  id_station  INTEGER NOT NULL REFERENCES station(id_station) ON DELETE CASCADE,
  id_ligne    INTEGER NOT NULL REFERENCES ligne(id_ligne)     ON DELETE CASCADE,
  PRIMARY KEY (id_station, id_ligne)
);

-- --- ASCENSEUR : POSSÈDE — ASCENSEUR (1,1) — (0,n) STATION ---
-- La clé étrangère est du côté (1,1). date_maj = fraîcheur de la donnée
CREATE TABLE IF NOT EXISTS ascenseur (
  id_ascenseur  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  statut        VARCHAR(12)  NOT NULL DEFAULT 'inconnu'
                CHECK (statut IN ('disponible', 'en_panne', 'inconnu')),
  cause_panne   VARCHAR(200),
  date_maj      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  ref_externe   VARCHAR(50)  UNIQUE,
  libelle       VARCHAR(200),   -- emplacement dans la station (liftSituation → liftDirection)
  id_station    INTEGER      NOT NULL REFERENCES station(id_station) ON DELETE CASCADE,

  CONSTRAINT ck_cause_si_panne CHECK (statut = 'en_panne' OR cause_panne IS NULL)
);

-- KIOSQUE : borne physique, installée à UNE station (1,1)
-- RESTRICT : on ne peut pas supprimer une station qui héberge encore une borne.
CREATE TABLE IF NOT EXISTS kiosque (
  id_kiosque       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nom_emplacement  VARCHAR(160)     NOT NULL,
  latitude         DOUBLE PRECISION NOT NULL CHECK (latitude  BETWEEN  -90 AND  90),
  longitude        DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  id_station       INTEGER          NOT NULL REFERENCES station(id_station) ON DELETE RESTRICT
);

-- --- AFFICHE : KIOSQUE (0,n) — (0,n) LIGNE (zone « Correspondances » de l'écran) ---
CREATE TABLE IF NOT EXISTS kiosque_ligne (
  id_kiosque  INTEGER NOT NULL REFERENCES kiosque(id_kiosque) ON DELETE CASCADE,
  id_ligne    INTEGER NOT NULL REFERENCES ligne(id_ligne)     ON DELETE CASCADE,
  PRIMARY KEY (id_kiosque, id_ligne)
);

-- --- JOURNAL_RECHERCHE : statistiques d'usage SANS donnée personnelle ---
-- Ni adresse, ni coordonnées : seulement la station la plus proche trouvée,
CREATE TABLE IF NOT EXISTS journal_recherche (
  id_recherche       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_kiosque         INTEGER     NOT NULL REFERENCES kiosque(id_kiosque) ON DELETE CASCADE,
  id_station_proche  INTEGER              REFERENCES station(id_station) ON DELETE SET NULL,
  langue             VARCHAR(2)  NOT NULL DEFAULT 'fr' CHECK (langue IN ('fr', 'en')),
  date_recherche     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- OPERATEUR : comptes de l'exploitant (entité isolée des citoyens) ---
-- Mot de passe stocké uniquement sous forme de hash bcrypt.
CREATE TABLE IF NOT EXISTS operateur (
  id_operateur   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email          VARCHAR(254) NOT NULL,
  password_hash  TEXT         NOT NULL,
  date_creation  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- E-mail unique sans tenir compte de la casse
CREATE UNIQUE INDEX IF NOT EXISTS ux_operateur_email ON operateur (lower(email));

-- Verrouillage anti brute-force : compteur d'échecs et date de fin de verrouillage
ALTER TABLE operateur ADD COLUMN IF NOT EXISTS echecs_connexion  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE operateur ADD COLUMN IF NOT EXISTS verrouille_jusqua TIMESTAMPTZ;

-- Journal d'audit : qui a fait quoi (actions opérateur uniquement, jamais de donnée citoyen).
-- L'e-mail est recopié : la trace survit à la suppression du compte.
CREATE TABLE IF NOT EXISTS journal_audit (
  id_audit       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date_action    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  id_operateur   INTEGER      REFERENCES operateur(id_operateur) ON DELETE SET NULL,
  email_operateur VARCHAR(254),
  action         VARCHAR(40)  NOT NULL,
  cible          VARCHAR(30),
  id_cible       INTEGER,
  detail         JSONB
);
CREATE INDEX IF NOT EXISTS idx_audit_date ON journal_audit(date_action DESC);

-- --- Mises à niveau d'une base créée avec une version précédente (idempotent) ---
ALTER TABLE station   ADD COLUMN IF NOT EXISTS ref_zdc VARCHAR(30) UNIQUE;
ALTER TABLE ascenseur ADD COLUMN IF NOT EXISTS libelle VARCHAR(200);

-- --- Index ---
CREATE INDEX IF NOT EXISTS idx_ascenseur_station ON ascenseur(id_station);
CREATE INDEX IF NOT EXISTS idx_ascenseur_statut  ON ascenseur(statut);
CREATE INDEX IF NOT EXISTS idx_kiosque_station   ON kiosque(id_station);
CREATE INDEX IF NOT EXISTS idx_journal_date      ON journal_recherche(date_recherche);
CREATE INDEX IF NOT EXISTS idx_journal_station   ON journal_recherche(id_station_proche);

-- --- Vue : état agrégé des ascenseurs par station ---
-- Règle prudente (identique à celle du front) : une panne l'emporte, puis
-- l'inconnu ; « disponible » seulement si TOUS les ascenseurs le sont.
CREATE OR REPLACE VIEW v_etat_station AS
SELECT
  s.id_station,
  CASE
    WHEN count(a.id_ascenseur) = 0           THEN 'inconnu'
    WHEN bool_or(a.statut = 'en_panne')      THEN 'en_panne'
    WHEN bool_or(a.statut = 'inconnu')       THEN 'inconnu'
    ELSE 'disponible'
  END                                                      AS statut_ascenseur,
  count(a.id_ascenseur)::int                               AS nb_ascenseurs,
  (count(*) FILTER (WHERE a.statut = 'en_panne'))::int     AS nb_en_panne,
  (count(*) FILTER (WHERE a.statut = 'inconnu'))::int      AS nb_inconnus,
  min(a.date_maj)                                          AS date_maj_min
FROM station s
LEFT JOIN ascenseur a ON a.id_station = s.id_station
GROUP BY s.id_station;

