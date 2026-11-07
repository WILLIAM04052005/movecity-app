-- Movecity — Données réelles, pôle Châtelet - Les Halles (station pilote)
$
TRUNCATE journal_recherche, kiosque_ligne, kiosque, ascenseur, station_ligne, ligne, station
  RESTART IDENTITY CASCADE;

INSERT INTO ligne (code_ligne, type_ligne) VALUES
  ('RER A', 'RER'), ('RER B', 'RER'), ('RER D', 'RER'),
  ('M1', 'Métro'), ('M4', 'Métro'), ('M7', 'Métro'), ('M11', 'Métro'), ('M14', 'Métro');

INSERT INTO station (nom_station, latitude, longitude) VALUES
  ('Châtelet - Les Halles',     48.8586, 2.3470),
  ('Hôtel de Ville',            48.8574, 2.3514),
  ('Louvre - Rivoli',           48.8606, 2.3408),
  ('Pont Neuf',                 48.8586, 2.3419),
  ('Saint-Michel - Notre-Dame', 48.8535, 2.3441);

-- Lignes desservant chaque station (liaison par NOMS : aucune dépendance aux identifiants)
INSERT INTO station_ligne (id_station, id_ligne)
SELECT s.id_station, l.id_ligne
FROM (VALUES
  ('Châtelet - Les Halles', 'RER A'), ('Châtelet - Les Halles', 'RER B'), ('Châtelet - Les Halles', 'RER D'),
  ('Châtelet - Les Halles', 'M1'),    ('Châtelet - Les Halles', 'M4'),    ('Châtelet - Les Halles', 'M7'),
  ('Châtelet - Les Halles', 'M11'),   ('Châtelet - Les Halles', 'M14'),
  ('Hôtel de Ville', 'M1'), ('Hôtel de Ville', 'M11'),
  ('Louvre - Rivoli', 'M1'),
  ('Pont Neuf', 'M7'),
  ('Saint-Michel - Notre-Dame', 'RER B'), ('Saint-Michel - Notre-Dame', 'M4')
) AS v(station, ligne)
JOIN station s ON s.nom_station = v.station
JOIN ligne   l ON l.code_ligne  = v.ligne;

-- La borne pilote, installée à Châtelet - Les Halles
INSERT INTO kiosque (nom_emplacement, latitude, longitude, id_station)
SELECT 'Borne Châtelet - Les Halles', 48.8586, 2.3470, id_station
FROM station WHERE nom_station = 'Châtelet - Les Halles';

-- Elle affiche les 8 lignes de la station
INSERT INTO kiosque_ligne (id_kiosque, id_ligne)
SELECT k.id_kiosque, sl.id_ligne
FROM kiosque k JOIN station_ligne sl ON sl.id_station = k.id_station;

-- Ascenseurs : STATUTS DE DÉMONSTRATION
INSERT INTO ascenseur (statut, cause_panne, id_station, ref_externe)
SELECT v.statut, v.cause, s.id_station, v.ref
FROM (VALUES
  ('disponible', NULL::text,                'Châtelet - Les Halles',     'DEMO-001'),
  ('inconnu',    NULL::text,                'Hôtel de Ville',            'DEMO-002'),
  ('en_panne',   'Maintenance programmée',  'Louvre - Rivoli',           'DEMO-003'),
  ('disponible', NULL::text,                'Pont Neuf',                 'DEMO-004'),
  ('disponible', NULL::text,                'Saint-Michel - Notre-Dame', 'DEMO-005')
) AS v(statut, cause, station, ref)
JOIN station s ON s.nom_station = v.station;
