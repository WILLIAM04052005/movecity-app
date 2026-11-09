// ============================================================
// Tests d'intégration de l'API : vrai PostgreSQL (base *_test), vrai Express.
// Lancer :  npm run test:api      (la base de test est VIDÉE à chaque exécution)
// Pré-requis : CREATE DATABASE movecity_test OWNER movecity;
// ============================================================
process.env.NODE_ENV = 'test';
process.env.LIMITE_GEOCODE_PAR_MINUTE = '6';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const config = require('../src/config/env');
const { pool } = require('../src/config/database');
const db = require('../scripts/db');
const app = require('../src/app');
const journal = require('../src/models/journal.model');
const { synchroniser } = require('../src/sync/idfm.sync');
const { lireFichier } = require('../src/sync/idfm.client');
const path = require('node:path');

// Garde-fou : ces tests effacent la base. On refuse de tourner sur autre chose qu'une base *_test.
if (!config.db.url && !config.db.database.endsWith('_test')) {
  throw new Error(`Refus : la base "${config.db.database}" n'est pas une base de test.`);
}

let serveur;
let base;
const fetchOriginal = global.fetch;

// --- Simulation de la Base Adresse Nationale (aucun appel réseau pendant les tests) ---
let reponseBan = { status: 200, body: { features: [{ geometry: { coordinates: [2.3606, 48.8559] }, properties: { label: '10 Rue de Rivoli 75004 Paris' } }] } };
global.fetch = (url, options) => {
  if (String(url).startsWith(config.banUrl)) {
    if (reponseBan.erreurReseau) return Promise.reject(new Error('réseau coupé'));
    return Promise.resolve(new Response(JSON.stringify(reponseBan.body), { status: reponseBan.status, headers: { 'content-type': 'application/json' } }));
  }
  return fetchOriginal(url, options);
};

async function appel(methode, chemin, { body, token } = {}) {
  const reponse = await fetchOriginal(`${base}/api${chemin}`, {
    method: methode,
    headers: {
      ...(body && { 'content-type': 'application/json' }),
      ...(token && { authorization: `Bearer ${token}` })
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const texte = await reponse.text();
  return { status: reponse.status, headers: reponse.headers, data: texte ? JSON.parse(texte) : null };
}

let token;

before(async () => {
  await db.reset();
  serveur = http.createServer(app);
  await new Promise(ok => serveur.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${serveur.address().port}`;
});

after(async () => {
  global.fetch = fetchOriginal;
  await new Promise(ok => serveur.close(ok));
  await pool.end();
});

describe('Santé et sécurité', () => {
  test('GET /health → base joignable', async () => {
    const r = await appel('GET', '/health');
    assert.equal(r.status, 200);
    assert.equal(r.data.database, 'ok');
  });

  test('en-têtes de sécurité présents', async () => {
    const r = await appel('GET', '/health');
    assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    assert.equal(r.headers.get('x-powered-by'), null);
  });

  test('route inconnue → 404 JSON ; JSON cassé → 400', async () => {
    assert.equal((await appel('GET', '/nimporte')).status, 404);
    const r = await fetchOriginal(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
    assert.equal(r.status, 400);
  });
});

describe('API publique (borne anonyme)', () => {
  test('GET /kiosk/config → position réelle + 8 lignes ordonnées', async () => {
    const r = await appel('GET', '/kiosk/config');
    assert.equal(r.status, 200);
    assert.equal(r.data.station.nom_station, 'Châtelet - Les Halles');
    assert.equal(r.data.latitude, 48.8586);
    assert.deepEqual(r.data.lignes.map(l => l.code_ligne), ['M1', 'M4', 'M7', 'M11', 'M14', 'RER A', 'RER B', 'RER D']);
  });

  test('GET /lignes', async () => {
    const r = await appel('GET', '/lignes');
    assert.equal(r.data.length, 8);
  });

  test('GET /stations → 5 stations avec lignes et statut agrégé', async () => {
    const r = await appel('GET', '/stations');
    assert.equal(r.data.length, 5);
    const louvre = r.data.find(s => s.nom_station === 'Louvre - Rivoli');
    assert.deepEqual(louvre.lignes, ['M1']);
    assert.equal(louvre.statut_ascenseur, 'en_panne');
    assert.equal(r.data.find(s => s.nom_station === 'Hôtel de Ville').statut_ascenseur, 'inconnu');
  });

  test('GET /stations/nearest → triées par distance, limite respectée', async () => {
    const r = await appel('GET', '/stations/nearest?lat=48.8559&lon=2.3606&limit=3');
    assert.equal(r.data.length, 3);
    assert.equal(r.data[0].nom_station, 'Hôtel de Ville');
    assert.ok(r.data[0].distance_km < r.data[1].distance_km && r.data[1].distance_km < r.data[2].distance_km);
    assert.ok(r.data[0].distance_km > 0.6 && r.data[0].distance_km < 0.8);
  });

  test('GET /stations/nearest → paramètres invalides = 400', async () => {
    assert.equal((await appel('GET', '/stations/nearest?lat=48.8')).status, 400);
    assert.equal((await appel('GET', '/stations/nearest?lat=abc&lon=2')).status, 400);
    assert.equal((await appel('GET', '/stations/nearest?lat=95&lon=2')).status, 400);
  });

  test('GET /stations/:id → 200, 404, 400', async () => {
    assert.equal((await appel('GET', '/stations/1')).data.nom_station, 'Châtelet - Les Halles');
    assert.equal((await appel('GET', '/stations/9999')).status, 404);
    assert.equal((await appel('GET', '/stations/abc')).status, 400);
  });

  test('GET /ascenseurs (+ filtres)', async () => {
    assert.equal((await appel('GET', '/ascenseurs')).data.length, 5);
    const pannes = await appel('GET', '/ascenseurs?statut=en_panne');
    assert.equal(pannes.data.length, 1);
    assert.equal(pannes.data[0].cause_panne, 'Maintenance programmée');
    assert.equal((await appel('GET', '/ascenseurs?statut=cassé')).status, 400);
    assert.equal((await appel('GET', '/ascenseurs?id_station=1')).data.length, 1);
  });

  test('GET /ascenseurs/stats → taux, pannes par ligne, stations les moins accessibles', async () => {
    const { data } = await appel('GET', '/ascenseurs/stats');
    assert.equal(data.total, 5);
    assert.equal(data.en_panne, 1);
    assert.equal(data.inconnus, 1);
    assert.equal(data.taux_panne_pct, 20);
    assert.equal(data.pannes_par_ligne.find(l => l.code_ligne === 'M1').en_panne, 1);
    assert.equal(data.stations_moins_accessibles[0].nom_station, 'Louvre - Rivoli');
  });
});

describe('Recherche d’adresse + journal anonyme', () => {
  test('adresse trouvée → 200, journal sans adresse ni coordonnées', async () => {
    const avant = (await pool.query('SELECT count(*)::int n FROM journal_recherche')).rows[0].n;
    const r = await appel('GET', '/geocode?q=10%20rue%20de%20rivoli&lang=en');
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.data).sort(), ['latitude', 'libelle', 'longitude']);

    const { rows, fields } = await pool.query('SELECT * FROM journal_recherche ORDER BY id_recherche DESC LIMIT 1');
    assert.equal((await pool.query('SELECT count(*)::int n FROM journal_recherche')).rows[0].n, avant + 1);
    assert.equal(rows[0].langue, 'en');
    assert.equal(rows[0].id_station_proche, 2); // Hôtel de Ville
    assert.deepEqual(fields.map(f => f.name).sort(), ['date_recherche', 'id_kiosque', 'id_recherche', 'id_station_proche', 'langue']);
    assert.ok(!JSON.stringify(rows[0]).toLowerCase().includes('rivoli'));
  });

  test('adresse introuvable → 404 ; BAN en panne → 503 ; saisie invalide → 400', async () => {
    reponseBan = { status: 200, body: { features: [] } };
    assert.equal((await appel('GET', '/geocode?q=zzzzzzzz')).status, 404);
    reponseBan = { erreurReseau: true };
    assert.equal((await appel('GET', '/geocode?q=rue%20de%20rivoli')).status, 503);
    assert.equal((await appel('GET', '/geocode?q=ab')).status, 400);
    assert.equal((await appel('GET', `/geocode?q=${'a'.repeat(201)}`)).status, 400);
  });

  test('limitation de débit → 429 avec Retry-After', async () => {
    let dernier;
    for (let i = 0; i < 10 && (!dernier || dernier.status !== 429); i++) dernier = await appel('GET', '/geocode?q=ab');
    assert.equal(dernier.status, 429);
    assert.ok(dernier.headers.get('retry-after'));
  });

  test('purge : les entrées plus anciennes que la rétention disparaissent', async () => {
    await pool.query(`INSERT INTO journal_recherche (id_kiosque, langue, date_recherche) VALUES (1, 'fr', now() - interval '100 days')`);
    const supprimees = await journal.purger(90);
    assert.equal(supprimees, 1);
    assert.equal((await pool.query(`SELECT count(*)::int n FROM journal_recherche WHERE date_recherche < now() - interval '90 days'`)).rows[0].n, 0);
  });
});

describe('Authentification opérateur', () => {
  test('routes protégées sans jeton → 401', async () => {
    assert.equal((await appel('POST', '/stations', { body: { nom_station: 'X', latitude: 1, longitude: 1 } })).status, 401);
    assert.equal((await appel('GET', '/stats/usage')).status, 401);
    assert.equal((await appel('GET', '/auth/me')).status, 401);
    assert.equal((await appel('GET', '/auth/me', { token: 'pas.un.jeton' })).status, 401);
  });

  test('login : mauvais mot de passe / e-mail inconnu → 401 identique', async () => {
    const a = await appel('POST', '/auth/login', { body: { email: config.admin.email, password: 'mauvais' } });
    const b = await appel('POST', '/auth/login', { body: { email: 'inconnu@x.fr', password: 'mauvais' } });
    assert.equal(a.status, 401);
    assert.deepEqual(a.data, b.data);
  });

  test('login : corps invalide → 400', async () => {
    assert.equal((await appel('POST', '/auth/login', { body: { email: 'a@b.fr' } })).status, 400);
  });

  test('login OK → jeton, /auth/me fonctionne, e-mail insensible à la casse', async () => {
    const r = await appel('POST', '/auth/login', { body: { email: config.admin.email.toUpperCase(), password: config.admin.password } });
    assert.equal(r.status, 200);
    assert.ok(r.data.token);
    assert.equal(JSON.stringify(r.data).includes('password'), false);
    token = r.data.token;

    const me = await appel('GET', '/auth/me', { token });
    assert.equal(me.data.email, config.admin.email);
    assert.equal('password_hash' in me.data, false);
  });

  test('un compte supprimé perd l’accès même avec un jeton valide', async () => {
    const bcrypt = require('bcryptjs');
    const operateurs = require('../src/models/operateurs.model');
    const o = await operateurs.creer('temporaire@movecity.local', await bcrypt.hash('MotDePasse-Temporaire-1', 10));
    const r = await appel('POST', '/auth/login', { body: { email: 'temporaire@movecity.local', password: 'MotDePasse-Temporaire-1' } });
    assert.equal((await appel('GET', '/auth/me', { token: r.data.token })).status, 200);
    await pool.query('DELETE FROM operateur WHERE id_operateur = $1', [o.id_operateur]);
    assert.equal((await appel('GET', '/auth/me', { token: r.data.token })).status, 401);
  });
});

describe('Opérateur : gestion des stations', () => {
  let id;

  test('POST /stations → 201 avec lignes', async () => {
    const r = await appel('POST', '/stations', { token, body: { nom_station: 'Cité', latitude: 48.855, longitude: 2.347, lignes: ['M4', 'M1'] } });
    assert.equal(r.status, 201);
    assert.deepEqual(r.data.lignes, ['M1', 'M4']);
    id = r.data.id_station;
  });

  test('POST /stations avec ligne inconnue → 400 et RIEN n’est créé (transaction)', async () => {
    const avant = (await pool.query('SELECT count(*)::int n FROM station')).rows[0].n;
    const r = await appel('POST', '/stations', { token, body: { nom_station: 'Fantôme', latitude: 48.8, longitude: 2.3, lignes: ['M99'] } });
    assert.equal(r.status, 400);
    assert.equal((await pool.query('SELECT count(*)::int n FROM station')).rows[0].n, avant);
  });

  test('POST /stations : données invalides → 400 avec détails', async () => {
    const r = await appel('POST', '/stations', { token, body: { nom_station: '', latitude: 200, longitude: 2 } });
    assert.equal(r.status, 400);
    assert.ok(r.data.details.length >= 2);
  });

  test('PUT /stations/:id → modifie nom et remplace les lignes', async () => {
    const r = await appel('PUT', `/stations/${id}`, { token, body: { nom_station: 'Cité (île)', lignes: ['M4'] } });
    assert.equal(r.data.nom_station, 'Cité (île)');
    assert.deepEqual(r.data.lignes, ['M4']);
    assert.equal((await appel('PUT', `/stations/${id}`, { token, body: {} })).status, 400);
    assert.equal((await appel('PUT', '/stations/9999', { token, body: { nom_station: 'x' } })).status, 404);
  });

  test('DELETE /stations/:id → 204 ; station hébergeant la borne → 409', async () => {
    assert.equal((await appel('DELETE', `/stations/${id}`, { token })).status, 204);
    assert.equal((await appel('GET', `/stations/${id}`)).status, 404);
    assert.equal((await appel('DELETE', '/stations/1', { token })).status, 409);
  });
});

describe('Opérateur : gestion des ascenseurs', () => {
  let id;

  test('POST /ascenseurs → 201', async () => {
    const r = await appel('POST', '/ascenseurs', { token, body: { statut: 'en_panne', cause_panne: 'Porte bloquée', id_station: 4, ref_externe: 'TEST-1' } });
    assert.equal(r.status, 201);
    assert.equal(r.data.nom_station, 'Pont Neuf');
    id = r.data.id_ascenseur;
  });

  test('station inexistante → 409 ; ref_externe en double → 409 ; statut invalide → 400', async () => {
    assert.equal((await appel('POST', '/ascenseurs', { token, body: { id_station: 9999 } })).status, 409);
    assert.equal((await appel('POST', '/ascenseurs', { token, body: { id_station: 4, ref_externe: 'TEST-1' } })).status, 409);
    assert.equal((await appel('POST', '/ascenseurs', { token, body: { id_station: 4, statut: 'cassé' } })).status, 400);
  });

  test('PATCH → remet disponible : la cause de panne est effacée, date_maj rafraîchie', async () => {
    const avant = (await appel('GET', `/ascenseurs/${id}`)).data;
    await new Promise(ok => setTimeout(ok, 15));
    const r = await appel('PATCH', `/ascenseurs/${id}`, { token, body: { statut: 'disponible' } });
    assert.equal(r.data.statut, 'disponible');
    assert.equal(r.data.cause_panne, null);
    assert.ok(new Date(r.data.date_maj) > new Date(avant.date_maj));
  });

  test('PATCH → corps vide 400 ; inexistant 404', async () => {
    assert.equal((await appel('PATCH', `/ascenseurs/${id}`, { token, body: {} })).status, 400);
    assert.equal((await appel('PATCH', '/ascenseurs/9999', { token, body: { statut: 'inconnu' } })).status, 404);
  });

  test('la vue agrégée reflète le changement', async () => {
    const r = await appel('GET', '/stations/4');
    assert.equal(r.data.statut_ascenseur, 'disponible');
    await appel('PATCH', `/ascenseurs/${id}`, { token, body: { statut: 'en_panne', cause_panne: 'Test' } });
    assert.equal((await appel('GET', '/stations/4')).data.statut_ascenseur, 'en_panne');
  });

  test('DELETE → 204 puis 404', async () => {
    assert.equal((await appel('DELETE', `/ascenseurs/${id}`, { token })).status, 204);
    assert.equal((await appel('DELETE', `/ascenseurs/${id}`, { token })).status, 404);
  });
});

describe('Opérateur : statistiques d’usage', () => {
  test('GET /stats/usage → 24 heures, langues, stations (après données de démo)', async () => {
    await db.demo();
    const r = await appel('GET', '/stats/usage?jours=30', { token });
    assert.equal(r.status, 200);
    assert.equal(r.data.total_recherches, 600);
    assert.equal(r.data.par_heure.length, 24);
    assert.equal(r.data.par_heure.reduce((s, h) => s + h.recherches, 0), 600);
    assert.ok(r.data.par_station.length > 0 && r.data.par_station.length <= 5);
    assert.deepEqual(r.data.par_langue.map(l => l.langue).sort(), ['en', 'fr']);
    assert.ok(r.data.par_jour.length > 0);
  });

  test('paramètre invalide → 400', async () => {
    assert.equal((await appel('GET', '/stats/usage?jours=0', { token })).status, 400);
  });
});

describe('Synchronisation IDFM (fichier d\'exemple, base de test)', () => {
  const FIXTURE = path.join(__dirname, 'fixtures', 'etat-des-ascenseurs.exemple.csv');

  test('dry-run : n\'écrit rien et indique le rapprochement', async () => {
    const avant = (await pool.query('SELECT count(*)::int AS n FROM ascenseur')).rows[0].n;
    const r = await synchroniser(await lireFichier(FIXTURE), { dryRun: true });
    assert.equal(r.dryRun, true);
    assert.deepEqual(r.stations_rapprochees.map(s => s.station).sort(), ['Châtelet - Les Halles', 'Hôtel de Ville']);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM ascenseur')).rows[0].n, avant);
  });

  test('synchronisation : upsert, ref_zdc mémorisé, démo remplacée sur les stations couvertes', async () => {
    const r = await synchroniser(await lireFichier(FIXTURE));
    assert.equal(r.inseres, 4);          // 3 à Châtelet + 1 à Hôtel de Ville
    assert.equal(r.ignores, 1);          // ligne sans liftId
    assert.equal(r.demo_supprimes, 2);   // DEMO-001 (Châtelet) et DEMO-002 (Hôtel de Ville)

    const chatelet = await appel('GET', '/stations');
    const c = chatelet.data.find(s => s.nom_station === 'Châtelet - Les Halles');
    assert.equal(c.statut_ascenseur, 'en_panne');
    const { rows } = await pool.query("SELECT ref_zdc FROM station WHERE nom_station = 'Châtelet - Les Halles'");
    assert.equal(rows[0].ref_zdc, 'TEST-ZDC-1');

    const l2 = await pool.query("SELECT statut, cause_panne, libelle, date_maj FROM ascenseur WHERE ref_externe = 'TEST-L2'");
    assert.equal(l2.rows[0].statut, 'en_panne');
    assert.equal(l2.rows[0].cause_panne, 'Panne technique');
    assert.equal(l2.rows[0].libelle, 'Quai RER A → Direction Marne-la-Vallée');
    assert.equal(l2.rows[0].date_maj.toISOString(), '2026-10-30T06:05:00.000Z');   // date du flux, pas « maintenant »

    // Les stations non couvertes gardent leurs ascenseurs de démonstration.
    const demo = await pool.query("SELECT count(*)::int AS n FROM ascenseur WHERE ref_externe LIKE 'DEMO-%'");
    assert.equal(demo.rows[0].n, 3);
  });

  test('idempotente : un 2e passage ne crée rien', async () => {
    const r = await synchroniser(await lireFichier(FIXTURE));
    assert.equal(r.inseres, 0);
    assert.equal(r.mis_a_jour, 4);
  });

  test('ascenseur absent du flux → « inconnu », jamais « disponible »', async () => {
    const lignes = (await lireFichier(FIXTURE)).filter(l => l.liftId !== 'TEST-L1');
    const r = await synchroniser(lignes);
    assert.equal(r.passes_inconnu, 1);
    const { rows } = await pool.query("SELECT statut FROM ascenseur WHERE ref_externe = 'TEST-L1'");
    assert.equal(rows[0].statut, 'inconnu');
  });

  test('flux vide → refus, base inchangée', async () => {
    const avant = (await pool.query('SELECT count(*)::int AS n FROM ascenseur')).rows[0].n;
    await assert.rejects(synchroniser([]), /annulée/);
    await assert.rejects(synchroniser([{ nimporte: 'quoi' }]), /Colonnes trouvées : nimporte/);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM ascenseur')).rows[0].n, avant);
  });

  test('--purge-demo supprime toutes les démos restantes', async () => {
    const r = await synchroniser(await lireFichier(FIXTURE), { purgerDemo: true });
    assert.equal(r.demo_supprimes, 3);
  });

  test('GET /ascenseurs expose le libellé', async () => {
    const r = await appel('GET', '/ascenseurs?statut=en_panne');
    assert.ok(r.data.some(a => a.libelle && a.libelle.startsWith('Quai RER A')));
  });
});
