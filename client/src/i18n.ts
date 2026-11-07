import type { Langue } from './types';

const fr = {
  bienvenue: 'Bienvenue sur Movecity, vous êtes ?',
  bienvenueAide: 'Choisissez votre profil : l’écran s’adapte. Aucun compte, aucune donnée personnelle.',
  touristeTitre: 'Touriste',
  touristeDesc: 'Je découvre le quartier',
  seniorTitre: 'Senior',
  seniorDesc: 'Je veux un écran simple et lisible',
  pmrTitre: 'PMR',
  pmrDesc: 'J’ai besoin d’un parcours accessible',
  changerProfil: 'Changer de profil',
  modePmr: 'Mode PMR',
  correspondances: 'Correspondances',
  aide: 'Aide',
  recherchePlaceholder: 'Entrez une adresse…',
  rechercher: 'Rechercher',
  effacer: 'Effacer la recherche',
  rechercheEnCours: 'Recherche…',
  stationsProches: 'Stations les plus proches',
  aucunResultat: 'Aucune adresse trouvée, réessayez.',
  serviceIndisponible: 'Recherche indisponible pour le moment, réessayez dans un instant.',
  tropDeRequetes: 'Trop de recherches, patientez quelques secondes.',
  etatAscenseurs: 'État des ascenseurs',
  disponible: 'Disponible',
  enPanne: 'En panne',
  inconnu: 'Statut inconnu',
  disponibles: 'disponible(s)',
  enPannePluriel: 'en panne',
  inconnus: 'inconnu(s)',
  majLe: 'Mis à jour le',
  donneeAncienne: 'Donnée ancienne : demandez confirmation à un agent.',
  suggestionPanne: 'Station accessible la plus proche :',
  aucuneStationAccessible: 'Aucune station accessible confirmée à proximité.',
  positionActuelle: 'Vous êtes ici',
  recentrer: 'Recentrer sur la borne',
  aideTitre: 'Besoin d’aide ?',
  aideTexte: 'Un agent peut vous accompagner. Appuyez sur le bouton ci-dessous pour le prévenir.',
  aideAppeler: 'Appeler un agent',
  aideEnvoyee: 'Un agent a été prévenu. Restez à proximité de la borne.',
  fermer: 'Fermer',
  inactiviteTitre: 'Êtes-vous toujours là ?',
  inactiviteTexte: 'Retour à l’accueil dans {s} secondes.',
  inactiviteBouton: 'Je suis toujours là',
  chargement: 'Chargement…',
  erreurChargement: 'Impossible de charger les données de la borne.',
  reessayer: 'Réessayer',
  langueChoix: 'Langue',
  carte: 'Carte du quartier'
};

export type CleTexte = keyof typeof fr;

const en: Record<CleTexte, string> = {
  bienvenue: 'Welcome to Movecity, who are you?',
  bienvenueAide: 'Pick your profile and the screen adapts. No account, no personal data.',
  touristeTitre: 'Tourist',
  touristeDesc: 'I’m exploring the area',
  seniorTitre: 'Senior',
  seniorDesc: 'I want a simple, easy-to-read screen',
  pmrTitre: 'Reduced mobility',
  pmrDesc: 'I need a step-free route',
  changerProfil: 'Change profile',
  modePmr: 'Reduced mobility mode',
  correspondances: 'Connections',
  aide: 'Help',
  recherchePlaceholder: 'Enter an address…',
  rechercher: 'Search',
  effacer: 'Clear search',
  rechercheEnCours: 'Searching…',
  stationsProches: 'Nearest stations',
  aucunResultat: 'No address found, try again.',
  serviceIndisponible: 'Search is unavailable right now, please try again shortly.',
  tropDeRequetes: 'Too many searches, please wait a few seconds.',
  etatAscenseurs: 'Elevator status',
  disponible: 'Available',
  enPanne: 'Out of service',
  inconnu: 'Status unknown',
  disponibles: 'available',
  enPannePluriel: 'out of service',
  inconnus: 'unknown',
  majLe: 'Updated on',
  donneeAncienne: 'Old data: please ask a staff member to confirm.',
  suggestionPanne: 'Nearest accessible station:',
  aucuneStationAccessible: 'No confirmed accessible station nearby.',
  positionActuelle: 'You are here',
  recentrer: 'Re-center on the kiosk',
  aideTitre: 'Need help?',
  aideTexte: 'A staff member can assist you. Press the button below to alert them.',
  aideAppeler: 'Call a staff member',
  aideEnvoyee: 'A staff member has been alerted. Please stay near the kiosk.',
  fermer: 'Close',
  inactiviteTitre: 'Are you still there?',
  inactiviteTexte: 'Back to the home screen in {s} seconds.',
  inactiviteBouton: 'I’m still here',
  chargement: 'Loading…',
  erreurChargement: 'Unable to load the kiosk data.',
  reessayer: 'Try again',
  langueChoix: 'Language',
  carte: 'Neighbourhood map'
};

const dictionnaires: Record<Langue, Record<CleTexte, string>> = { fr, en };

export function traduire(
  langue: Langue,
  cle: CleTexte,
  variables?: Record<string, string | number>
): string {
  let texte = dictionnaires[langue][cle];
  if (variables) {
    for (const [nom, valeur] of Object.entries(variables)) {
      texte = texte.replace(`{${nom}}`, String(valeur));
    }
  }
  return texte;
}
