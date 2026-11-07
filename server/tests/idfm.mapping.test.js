// Tests des fonctions pures de synchronisation IDFM (aucune base, aucun réseau).
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const m = require('../src/sync/idfm.mapping');
const { lireFichier, lireUrl } = require('../src/sync/idfm.client');

const FIXTURE = path.join(__dirname, 'fixtures', 'etat-des-ascenseurs.exemple.csv');

describe('Conversion des statuts IDFM', () => {
  test('available / notavailable / unknown', () => {
    assert.deepEqual(m.convertirStatut('available', ''), { statut: 'disponible', cause_panne: null });
    assert.deepEqual(m.convertirStatut('notavailable', 'liftFailure'), { statut: 'en_panne', cause_panne: 'Panne technique' });
    assert.equal(m.convertirStatut('notavailable', 'closedForMaintenance').cause_panne, 'Fermé pour travaux / maintenance');
    assert.deepEqual(m.convertirStatut('unknown', 'liftFailure'), { statut: 'inconnu', cause_panne: null });
  });

  test('valeur inattendue ou absente → inconnu (on ne devine jamais)', () => {
    assert.equal(m.convertirStatut('???', '').statut, 'inconnu');
    assert.equal(m.convertirStatut(undefined, undefined).statut, 'inconnu');
  });

  test('panne sans motif connu → "Hors service"', () => {
    assert.equal(m.convertirStatut('notavailable', 'autreChose').cause_panne, 'Hors service');
  });
});

describe('Normalisation des enregistrements', () => {
  test('clés insensibles à la casse (ZdCName / zdcname)', () => {
    const e = m.normaliserEnregistrement({ liftid: '7', ZDCID: 'Z', zdcname: 'X', liftStatus: 'available' });
    assert.equal(e.ref_externe, '7');
    assert.equal(e.zdcId, 'Z');
  });

  test('sans liftId ou sans zone → rejeté', () => {
    assert.equal(m.normaliserEnregistrement({ zdcid: 'Z' }), null);
    assert.equal(m.normaliserEnregistrement({ liftId: '1' }), null);
    assert.equal(m.normaliserEnregistrement(null), null);
  });

  test('date invalide → null (pas de fausse fraîcheur)', () => {
    assert.equal(m.lireDate('pas une date'), null);
    assert.equal(m.lireDate(''), null);
    assert.equal(m.lireDate('2026-10-30T07:05:00+01:00'), '2026-10-30T06:05:00.000Z');
  });

  test('libellé = situation → direction', () => {
    const e = m.normaliserEnregistrement({ liftId: '1', zdcId: 'Z', liftSituation: 'Hall', liftDirection: 'Vincennes' });
    assert.equal(e.libelle, 'Hall → Vincennes');
  });

  test('doublons dédoublonnés, le dernier gagne', () => {
    const r = m.normaliserTout([
      { liftId: '1', zdcId: 'Z', liftStatus: 'available' },
      { liftId: '1', zdcId: 'Z', liftStatus: 'notavailable' },
      { zdcId: 'Z' }
    ]);
    assert.equal(r.enregistrements.length, 1);
    assert.equal(r.enregistrements[0].statut, 'en_panne');
    assert.equal(r.ignores, 1);
  });
});

describe('Rapprochement des stations', () => {
  const stations = [
    { id_station: 1, nom_station: 'Châtelet - Les Halles', ref_zdc: null },
    { id_station: 2, nom_station: 'Hôtel de Ville', ref_zdc: null },
    { id_station: 3, nom_station: 'Pont Neuf', ref_zdc: 'ZDC-PN' }
  ];
  const enr = (zdcId, zdcName) => ({ zdcId, zdcName });

  test('normaliser ignore accents, casse et ponctuation', () => {
    assert.equal(m.normaliser('Châtelet - Les Halles'), 'chatelet les halles');
    assert.equal(m.normaliser('CHATELET-LES  HALLES'), 'chatelet les halles');
  });

  test('par nom, par alias, par ref_zdc mémorisé', () => {
    const { associations, zonesNonRapprochees } = m.rapprocherZones(
      [enr('A', 'Hôtel de Ville'), enr('B', 'Châtelet-Les Halles'), enr('ZDC-PN', 'Nom totalement différent'), enr('D', 'Gare Fictive')],
      stations,
      { 'Châtelet-Les Halles': 'Châtelet - Les Halles' }
    );
    assert.equal(associations.get('A').id_station, 2);
    assert.equal(associations.get('B').id_station, 1);
    assert.equal(associations.get('ZDC-PN').id_station, 3);
    assert.deepEqual([...zonesNonRapprochees.keys()], ['D']);
  });

  test('pas de correspondance approximative', () => {
    const { associations } = m.rapprocherZones([enr('X', 'Hôtel de Ville de Paris')], stations);
    assert.equal(associations.size, 0);
  });

  test('suggestions : zones proches de nos stations', () => {
    const zones = new Map([['1', 'Saint-Michel'], ['2', 'Gare Fictive'], ['3', 'Pont Neuf Nord']]);
    const s = m.suggestions(zones, stations);
    assert.deepEqual(s.map(x => x.zdcName), ['Pont Neuf Nord']);
  });
});

describe('Lecture CSV / JSON / API', () => {
  test('parseCsv gère « ; », guillemets et BOM', () => {
    const lignes = m.parseCsv('﻿a;b\n"x;y";"il dit ""oui"""\n');
    assert.deepEqual(lignes, [{ a: 'x;y', b: 'il dit "oui"' }]);
  });

  test('fixture CSV : 6 lignes lues', async () => {
    const lignes = await lireFichier(FIXTURE);
    assert.equal(lignes.length, 6);
    assert.equal(lignes[1].liftStatus, 'notavailable');
  });

  test('extraireEnregistrements : tableau, results, records.fields', () => {
    assert.equal(m.extraireEnregistrements([{ a: 1 }])[0].a, 1);
    assert.equal(m.extraireEnregistrements({ results: [{ a: 2 }] })[0].a, 2);
    assert.equal(m.extraireEnregistrements({ records: [{ fields: { a: 3 } }] })[0].a, 3);
    assert.throws(() => m.extraireEnregistrements({ autre: 1 }), /inattendu/);
  });

  test('lireUrl : pagination jusqu\'à épuisement', async () => {
    const pages = [Array.from({ length: 100 }, (_, i) => ({ liftId: i })), [{ liftId: 100 }]];
    let appels = 0;
    const fetchImpl = async url => {
      assert.equal(new URL(url).searchParams.get('limit'), '100');
      return new Response(JSON.stringify({ total_count: 101, results: pages[appels++] }), { status: 200 });
    };
    const tout = await lireUrl('https://exemple.test/api', { fetchImpl });
    assert.equal(tout.length, 101);
    assert.equal(appels, 2);
  });

  test('lireUrl : refuse http, signale les erreurs HTTP', async () => {
    await assert.rejects(lireUrl('http://exemple.test/api'), /https/);
    await assert.rejects(lireUrl('https://exemple.test/api', { fetchImpl: async () => new Response('', { status: 503 }) }), /503/);
  });
});
