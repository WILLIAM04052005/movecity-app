// ============================================================
// Usage :
//   npm run sync:ascenseurs                      synchronise depuis IDFM_URL
//   npm run sync:ascenseurs -- --dry-run         simule : n'écrit rien, montre le rapprochement
//   npm run sync:ascenseurs -- --file ./ascenseurs.csv   utilise un fichier téléchargé à la main
//   npm run sync:ascenseurs -- --purge-demo      supprime TOUS les ascenseurs de démonstration (DEMO-n)
// ============================================================
const config = require('../src/config/env');
const { pool } = require('../src/config/database');
const { recuperer } = require('../src/sync/idfm.client');
const { synchroniser } = require('../src/sync/idfm.sync');

const args = process.argv.slice(2);
const drapeau = nom => args.includes(nom);
const valeur = nom => { const i = args.indexOf(nom); return i >= 0 ? args[i + 1] : undefined; };

(async () => {
  const fichier = valeur('--file') || config.idfm.fichier;
  console.log(fichier ? `Source : fichier ${fichier}` : `Source : ${config.idfm.url}`);

  const bruts = await recuperer({ url: config.idfm.url, fichier });
  const r = await synchroniser(bruts, { dryRun: drapeau('--dry-run'), purgerDemo: drapeau('--purge-demo') });

  console.log(`\n${r.dryRun ? '[SIMULATION] ' : ''}${r.recus} enregistrement(s) reçu(s), ${r.ascenseurs_valides} valide(s) dans ${r.zones} zone(s) (${r.ignores} ignoré(s)).`);
  console.log('\nStations rapprochées :');
  if (r.stations_rapprochees.length === 0) console.log('  (aucune)');
  for (const s of r.stations_rapprochees) console.log(`  ✔ ${s.station}  ←  zone ${s.zdcId}  (${s.ascenseurs} ascenseur(s))`);
  if (r.stations_sans_donnees.length) console.log(`\nStations SANS données IDFM (laissées telles quelles) : ${r.stations_sans_donnees.join(', ')}`);
  if (r.suggestions_alias.length) {
    console.log('\nZones IDFM qui ressemblent à vos stations mais n\'ont pas été rapprochées.');
    console.log('→ Si l\'une d\'elles correspond, ajoutez-la dans server/src/sync/alias-stations.json :');
    for (const z of r.suggestions_alias) console.log(`  ? "${z.zdcName}"  (zone ${z.zdcId})`);
  }
  if (!r.dryRun) {
    console.log(`\nRésultat : ${r.inseres} créé(s), ${r.mis_a_jour} mis à jour, ${r.passes_inconnu} passé(s) en « inconnu » (absents du flux), ${r.demo_supprimes} ascenseur(s) de démo supprimé(s).`);
  }
})()
  .catch(err => { console.error('✘', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
