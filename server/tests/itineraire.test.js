const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parserNavitia, parserRoutage, libelleLigne, longueur } = require('../src/services/itineraire.service');

const navitia = {
  journeys: [
    {
      duration: 780,
      sections: [
        { type: 'waiting', duration: 60 },
        {
          type: 'public_transport',
          duration: 420,
          from: { name: 'Châtelet (Paris)' },
          to: { stop_point: { name: 'Saint-Michel - Notre-Dame (Paris)' } },
          display_informations: { commercial_mode: 'Métro', code: '4', color: 'BB4D98', direction: 'Porte d’Orléans' },
          geojson: { coordinates: [[2.3470, 48.8586], [2.3450, 48.8540], [2.3440, 48.8535]] }
        },
        {
          type: 'transfer',
          duration: 120,
          from: { name: 'Saint-Michel' },
          to: { name: 'Sortie' },
          geojson: { coordinates: [[2.3440, 48.8535], [2.3441, 48.8533]] }
        },
        { type: 'street_network', duration: 0, geojson: { coordinates: [] } }
      ]
    }
  ]
};

describe('Itinéraires : lecture de la réponse PRIM (Navitia)', () => {
  test('étapes transport et marche, lignes nommées comme dans nos données', () => {
    const r = parserNavitia(navitia);
    assert.equal(r.mode, 'transit');
    assert.equal(r.source, 'prim');
    assert.equal(r.duree_s, 780);
    assert.equal(r.etapes.length, 2);
    assert.equal(r.etapes[0].type, 'transport');
    assert.equal(r.etapes[0].ligne, 'M4');
    assert.equal(r.etapes[0].couleur, '#BB4D98');
    assert.equal(r.etapes[0].vers, 'Saint-Michel - Notre-Dame (Paris)');
    assert.equal(r.etapes[1].type, 'marche');
  });

  test('coordonnées converties de [lon, lat] vers [lat, lon]', () => {
    const r = parserNavitia(navitia);
    assert.deepEqual(r.etapes[0].geometrie[0], [48.8586, 2.347]);
  });

  test('la distance totale est la somme des étapes, calculée sur le tracé', () => {
    const r = parserNavitia(navitia);
    assert.equal(r.distance_m, r.etapes[0].distance_m + r.etapes[1].distance_m);
    assert.ok(r.distance_m > 400 && r.distance_m < 800);
  });

  test('réponse vide ou sans trajet → null (jamais un faux itinéraire)', () => {
    assert.equal(parserNavitia(null), null);
    assert.equal(parserNavitia({ journeys: [] }), null);
    assert.equal(parserNavitia({ journeys: [{ sections: [{ type: 'waiting', duration: 30 }] }] }), null);
  });

  test('libellés : métro, RER, autres lignes, couleur invalide ignorée', () => {
    assert.equal(libelleLigne({ commercial_mode: 'Métro', code: '14' }), 'M14');
    assert.equal(libelleLigne({ commercial_mode: 'RER', code: 'B' }), 'RER B');
    assert.equal(libelleLigne({ commercial_mode: 'Tramway', code: 'T3a' }), 'T3a');
    assert.equal(libelleLigne({ commercial_mode: 'Bus' }), null);
    const r = parserNavitia({ journeys: [{ duration: 1, sections: [{ type: 'public_transport', duration: 1, display_informations: { color: 'pasunecouleur', code: '1', commercial_mode: 'Métro' }, geojson: { coordinates: [[2, 48], [2.001, 48]] } }] }] });
    assert.equal(r.etapes[0].couleur, null);
  });
});

describe('Itinéraires : lecture de la réponse de routage (marche, vélo, voiture)', () => {
  const osrm = { routes: [{ distance: 1234.6, duration: 900.2, geometry: { coordinates: [[2.35, 48.86], [2.36, 48.85]] } }] };

  test('distance et durée arrondies, une seule étape du bon type', () => {
    const r = parserRoutage(osrm, 'bike');
    assert.equal(r.distance_m, 1235);
    assert.equal(r.duree_s, 900);
    assert.equal(r.etapes.length, 1);
    assert.equal(r.etapes[0].type, 'velo');
    assert.deepEqual(r.etapes[0].geometrie[1], [48.85, 2.36]);
    assert.equal(parserRoutage(osrm, 'car').etapes[0].type, 'voiture');
    assert.equal(parserRoutage(osrm, 'foot').etapes[0].type, 'marche');
  });

  test('aucune route → null', () => {
    assert.equal(parserRoutage({ routes: [] }, 'foot'), null);
    assert.equal(parserRoutage({}, 'foot'), null);
  });

  test('longueur d’un tracé vide ou d’un seul point = 0', () => {
    assert.equal(longueur([]), 0);
    assert.equal(longueur([[48.85, 2.35]]), 0);
  });
});
