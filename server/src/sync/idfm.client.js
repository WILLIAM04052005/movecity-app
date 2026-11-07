// Récupération du flux IDFM « État des ascenseurs » (réseau ou fichier local).
const fs = require('fs');
const path = require('path');
const { parseCsv, extraireEnregistrements } = require('./idfm.mapping');

const TAILLE_PAGE = 100;   // maximum accepté par l'API Opendatasoft
const PAGES_MAX = 60;      // garde-fou : 6 000 ascenseurs maximum par synchronisation

async function lireFichier(fichier) {
  const texte = fs.readFileSync(path.resolve(fichier), 'utf8');
  return path.extname(fichier).toLowerCase() === '.csv' ? parseCsv(texte) : extraireEnregistrements(JSON.parse(texte));
}

async function lireUrl(url, { timeoutMs = 20_000, fetchImpl = fetch } = {}) {
  if (!/^https:\/\//i.test(url)) throw new Error('IDFM_URL doit commencer par https://');
  const toutes = [];
  for (let page = 0; page < PAGES_MAX; page++) {
    const adresse = new URL(url);
    adresse.searchParams.set('limit', String(TAILLE_PAGE));
    adresse.searchParams.set('offset', String(page * TAILLE_PAGE));

    const reponse = await fetchImpl(adresse, {
      headers: { accept: 'application/json', 'user-agent': 'Movecity-borne/0.2 (projet pédagogique)' },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!reponse.ok) throw new Error(`Le flux IDFM répond ${reponse.status} (${adresse.origin}${adresse.pathname}).`);

    const json = await reponse.json();
    const lot = extraireEnregistrements(json);
    toutes.push(...lot);

    const total = typeof json.total_count === 'number' ? json.total_count : null;
    if (lot.length < TAILLE_PAGE || (total !== null && toutes.length >= total)) return toutes;
  }
  throw new Error(`Plus de ${PAGES_MAX * TAILLE_PAGE} enregistrements : arrêt par sécurité.`);
}

/** Source = fichier local si IDFM_FILE / --file est fourni, sinon l'URL du flux. */
async function recuperer({ url, fichier, ...options }) {
  if (fichier) return lireFichier(fichier);
  if (!url) throw new Error('Aucune source : renseignez IDFM_URL dans .env (ou utilisez --file).');
  return lireUrl(url, options);
}

module.exports = { recuperer, lireFichier, lireUrl };
