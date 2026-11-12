import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { traduire, type CleTexte } from '../i18n';
import { useDonneesBorne, type DonneesBorne } from '../hooks/useDonneesBorne';
import { etatDesStations } from '../utils/ascenseurs';
import { useItineraires, type EtatsItineraires } from '../hooks/useItineraires';
import { modesPour } from '../utils/itineraire';
import type { EtatStation, Langue, ModeTransport, Persona, Recherche, Station } from '../types';

interface KioskContextValue extends DonneesBorne {
  persona: Persona | null;
  langue: Langue;
  etats: EtatStation[];
  recherche: Recherche | null;
  stationFocus: Station | null;
  aideOuverte: boolean;
  stationChoisie: Station | null;
  modes: ModeTransport[];
  mode: ModeTransport;
  itineraires: EtatsItineraires;
  qrOuvert: boolean;
  setStationChoisie: (s: Station | null) => void;
  setMode: (m: ModeTransport) => void;
  setQrOuvert: (ouvert: boolean) => void;
  choisirPersona: (p: Persona) => void;
  changerProfil: () => void;
  setLangue: (l: Langue) => void;
  setRecherche: (r: Recherche | null) => void;
  setStationFocus: (s: Station | null) => void;
  setAideOuverte: (ouverte: boolean) => void;
  /** Remet la borne à zéro pour le prochain usager. */
  reinitialiser: () => void;
  t: (cle: CleTexte, variables?: Record<string, string | number>) => string;
}

const KioskContext = createContext<KioskContextValue | null>(null);

export function KioskProvider({ children }: { children: ReactNode }) {
  const donnees = useDonneesBorne();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [langue, setLangue] = useState<Langue>('fr');
  const [recherche, setRecherche] = useState<Recherche | null>(null);
  const [stationFocus, setStationFocus] = useState<Station | null>(null);
  const [aideOuverte, setAideOuverte] = useState(false);
  const [stationChoisie, setStationChoisie] = useState<Station | null>(null);
  const [modeChoisi, setMode] = useState<ModeTransport>('transit');
  const [qrOuvert, setQrOuvert] = useState(false);

  const modes = useMemo(() => modesPour(persona), [persona]);
  const mode = modes.includes(modeChoisi) ? modeChoisi : 'transit';
  const departLat = donnees.config?.latitude;
  const departLon = donnees.config?.longitude;
  const depart = useMemo(
    () => (departLat !== undefined && departLon !== undefined ? { lat: departLat, lon: departLon } : null),
    [departLat, departLon]
  );
  const itineraires = useItineraires(depart, recherche, stationChoisie, modes, persona === 'pmr');

  const etats = useMemo(
    () => etatDesStations(donnees.stations, donnees.ascenseurs),
    [donnees.stations, donnees.ascenseurs]
  );

  const effacerSession = useCallback(() => {
    setRecherche(null);
    setStationFocus(null);
    setAideOuverte(false);
    setStationChoisie(null);
    setMode('transit');
    setQrOuvert(false);
  }, []);

  const choisirPersona = useCallback((p: Persona) => setPersona(p), []);

  const changerProfil = useCallback(() => {
    effacerSession();
    setPersona(null);
  }, [effacerSession]);

  const reinitialiser = useCallback(() => {
    effacerSession();
    setPersona(null);
    setLangue('fr');
  }, [effacerSession]);

  const t = useCallback(
    (cle: CleTexte, variables?: Record<string, string | number>) => traduire(langue, cle, variables),
    [langue]
  );

  const valeur: KioskContextValue = {
    ...donnees,
    persona,
    langue,
    etats,
    recherche,
    stationFocus,
    aideOuverte,
    stationChoisie,
    modes,
    mode,
    itineraires,
    qrOuvert,
    setStationChoisie,
    setMode,
    setQrOuvert,
    choisirPersona,
    changerProfil,
    setLangue,
    setRecherche,
    setStationFocus,
    setAideOuverte,
    reinitialiser,
    t
  };

  return <KioskContext.Provider value={valeur}>{children}</KioskContext.Provider>;
}

export function useKiosk(): KioskContextValue {
  const contexte = useContext(KioskContext);
  if (!contexte) throw new Error('useKiosk doit être utilisé dans <KioskProvider>');
  return contexte;
}
