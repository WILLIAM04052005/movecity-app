// Synchronisation IDFM — fonctions PURES (aucun accès réseau ni base).
// Source : jeu « État des ascenseurs » d'Île-de-France Mobilités.

/** Minuscules, sans accents ni ponctuation : "Châtelet - Les Halles" → "chatelet les halles". */
function normaliser(texte) {
  return String(texte ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const STATUTS = {
  available: 'disponible',
  notavailable: 'en_panne',
  unknown: 'inconnu'
};

const CAUSES = {
  liftfailure: 'Panne technique',
  closedformaintenance: 'Fermé pour travaux / maintenance',
  undefinedequipmentproblem: 'Autre problème d’équipement'
};

function convertirStatut(liftStatus, liftReason) {
  const statut = STATUTS[normaliser(liftStatus).replace(/ /g, '')] || 'inconnu';
  if (statut !== 'en_panne') return { statut, cause_panne: null };
  const cause = CAUSES[normaliser(liftReason).replace(/ /g, '')] || 'Hors service';
  return { statut, cause_panne: cause };
}

function lireDate(valeur) {
  if (!valeur) return null;
  const d = new Date(valeur);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normaliserEnregistrement(brut) {
  if (!brut || typeof brut !== 'object') return null;
  const r = {};
  for (const [cle, valeur] of Object.entries(brut)) r[cle.toLowerCase()] = valeur;

  const liftId = String(r.liftid ?? '').trim();
  const zdcId = String(r.zdcid ?? '').trim();
  if (!liftId || !zdcId) return null;

  const { statut, cause_panne } = convertirStatut(r.liftstatus, r.liftreason);
  const situation = String(r.liftsituation ?? '').trim();
  const direction = String(r.liftdirection ?? '').trim();

  return {
    ref_externe: liftId.slice(0, 50),
    zdcId,
    zdcName: String(r.zdcname ?? '').trim(),
    statut,
    cause_panne,
    date_maj: lireDate(r.liftstateupdate),
    libelle: ([situation, direction ? `→ ${direction}` : ''].filter(Boolean).join(' ') || null)?.slice(0, 200) ?? null
  };
}

/** Dédoublonne par ref_externe (le dernier gagne) : indispensable avant un upsert. */
function normaliserTout(bruts) {
  const parRef = new Map();
  let ignores = 0;
  for (const brut of bruts) {
    const e = normaliserEnregistrement(brut);
    if (!e) { ignores++; continue; }
    parRef.set(e.ref_externe, e);
  }
  return { enregistrements: [...parRef.values()], ignores };
}

/**
 * @returns {{ associations: Map<string, object>, zonesNonRapprochees: Map<string,string> }}
 */
function rapprocherZones(enregistrements, stations, alias = {}) {
  const parRef = new Map(stations.filter(s => s.ref_zdc).map(s => [s.ref_zdc, s]));
  const parNom = new Map(stations.map(s => [normaliser(s.nom_station), s]));
  const aliasNormalises = new Map(Object.entries(alias).map(([k, v]) => [normaliser(k), normaliser(v)]));

  const associations = new Map();
  const zonesNonRapprochees = new Map();
  const zones = new Map(enregistrements.map(e => [e.zdcId, e.zdcName]));

  for (const [zdcId, zdcName] of zones) {
    const nom = normaliser(zdcName);
    const station =
      parRef.get(zdcId) ||
      parNom.get(nom) ||
      (aliasNormalises.has(nom) ? parNom.get(aliasNormalises.get(nom)) : undefined);
    if (station) associations.set(zdcId, station);
    else zonesNonRapprochees.set(zdcId, zdcName);
  }
  return { associations, zonesNonRapprochees };
}

/** Zones non rapprochées qui ressemblent à une de nos stations (aide au diagnostic / aux alias). */
function suggestions(zonesNonRapprochees, stations) {
  const mots = new Set(
    stations.flatMap(s => normaliser(s.nom_station).split(' ')).filter(m => m.length >= 4 && !['halles', 'ville'].includes(m))
  );
  const res = [];
  for (const [id, nom] of zonesNonRapprochees) {
    if (normaliser(nom).split(' ').some(m => mots.has(m))) res.push({ zdcId: id, zdcName: nom });
  }
  return res.sort((a, b) => a.zdcName.localeCompare(b.zdcName)).slice(0, 25);
}

function parseCsv(texte) {
  const contenu = texte.replace(/^﻿/, '');
  const premiere = contenu.split(/\r?\n/, 1)[0] || '';
  const sep = (premiere.match(/;/g) || []).length >= (premiere.match(/,/g) || []).length ? ';' : ',';

  const lignes = [];
  let ligne = [], champ = '', entreGuillemets = false;
  for (let i = 0; i < contenu.length; i++) {
    const c = contenu[i];
    if (entreGuillemets) {
      if (c === '"' && contenu[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') entreGuillemets = false;
      else champ += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === sep) { ligne.push(champ); champ = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && contenu[i + 1] === '\n') i++;
      ligne.push(champ); champ = '';
      if (ligne.some(v => v !== '')) lignes.push(ligne);
      ligne = [];
    } else champ += c;
  }
  ligne.push(champ);
  if (ligne.some(v => v !== '')) lignes.push(ligne);

  const [entetes, ...donnees] = lignes;
  if (!entetes) return [];
  return donnees.map(l => Object.fromEntries(entetes.map((h, i) => [h.trim(), (l[i] ?? '').trim()])));
}

/** Accepte : tableau brut, { results: [...] } (Opendatasoft v2), { records: [{ fields }] } (v1). */
function extraireEnregistrements(json) {
  if (Array.isArray(json)) return json.map(x => (x && x.fields ? x.fields : x));
  if (json && Array.isArray(json.results)) return json.results;
  if (json && Array.isArray(json.records)) return json.records.map(x => x.fields || x);
  throw new Error('Format de réponse IDFM inattendu (ni tableau, ni "results", ni "records").');
}

module.exports = {
  normaliser, convertirStatut, lireDate, normaliserEnregistrement, normaliserTout,
  rapprocherZones, suggestions, parseCsv, extraireEnregistrements
};
