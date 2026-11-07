DELETE FROM journal_recherche;

INSERT INTO journal_recherche (id_kiosque, id_station_proche, langue, date_recherche)
SELECT
  (SELECT id_kiosque FROM kiosque ORDER BY id_kiosque LIMIT 1),
  (SELECT id_station FROM station ORDER BY id_station OFFSET floor(random() * (SELECT count(*) FROM station))::int LIMIT 1),
  CASE WHEN random() < 0.65 THEN 'fr' ELSE 'en' END,
  now()
    - (floor(random() * 30) || ' days')::interval
    - (floor(random() * 24) || ' hours')::interval
    - (floor(random() * 60) || ' minutes')::interval
FROM generate_series(1, 600) AS g;
