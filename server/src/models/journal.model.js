const { query } = require('../config/database');

/** Une recherche = station la plus proche + langue + heure. Jamais l'adresse. */
async function enregistrer({ id_kiosque, id_station_proche, langue }) {
  await query(
    'INSERT INTO journal_recherche (id_kiosque, id_station_proche, langue) VALUES ($1, $2, $3)',
    [id_kiosque, id_station_proche ?? null, langue]
  );
}

/** Supprime les entrées plus anciennes que `jours` (minimisation RGPD). */
async function purger(jours) {
  const { rowCount } = await query(
    `DELETE FROM journal_recherche WHERE date_recherche < now() - make_interval(days => $1)`,
    [jours]
  );
  return rowCount;
}

/** Statistiques d'usage agrégées sur les `jours` derniers jours (dashboard opérateur). */
async function statistiques(jours) {
  const periode = `date_recherche >= now() - make_interval(days => $1)`;
  const [total, parStation, parLangue, parHeure, parJour] = await Promise.all([
    query(`SELECT count(*)::int AS total FROM journal_recherche WHERE ${periode}`, [jours]),
    query(`SELECT s.nom_station, count(*)::int AS recherches
             FROM journal_recherche j LEFT JOIN station s ON s.id_station = j.id_station_proche
            WHERE ${periode.replace('date_recherche', 'j.date_recherche')}
            GROUP BY s.nom_station ORDER BY recherches DESC, s.nom_station LIMIT 10`, [jours]),
    query(`SELECT langue, count(*)::int AS recherches FROM journal_recherche
            WHERE ${periode} GROUP BY langue ORDER BY recherches DESC`, [jours]),
    query(`SELECT EXTRACT(HOUR FROM date_recherche AT TIME ZONE 'Europe/Paris')::int AS heure,
                  count(*)::int AS recherches
             FROM journal_recherche WHERE ${periode} GROUP BY 1 ORDER BY 1`, [jours]),
    query(`SELECT to_char((date_recherche AT TIME ZONE 'Europe/Paris')::date, 'YYYY-MM-DD') AS jour,
                  count(*)::int AS recherches
             FROM journal_recherche WHERE ${periode} GROUP BY 1 ORDER BY 1`, [jours])
  ]);

  // On complète les heures sans recherche (0 à 23) pour un graphique sans trous
  const parHeureComplete = Array.from({ length: 24 }, (_, heure) => ({
    heure,
    recherches: parHeure.rows.find(r => r.heure === heure)?.recherches ?? 0
  }));

  return {
    jours,
    total_recherches: total.rows[0].total,
    par_station: parStation.rows.map(r => ({ nom_station: r.nom_station ?? 'Non déterminée', recherches: r.recherches })),
    par_langue: parLangue.rows,
    par_heure: parHeureComplete,
    par_jour: parJour.rows
  };
}

module.exports = { enregistrer, purger, statistiques };
