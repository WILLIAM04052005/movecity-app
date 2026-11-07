import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { traduire, type CleTexte } from '../i18n';
import { useDonneesBorne, type DonneesBorne } from '../hooks/useDonneesBorne';
import { etatDesStations } from '../utils/ascenseurs';
import type { EtatStation, Langue, Persona, Recherche, Station } from '../types';

interface KioskContextValue extends DonneesBorne {
  persona: Persona | null;
  langue: Langue;
  etats: EtatStation[];
  recherche: Recherche | null;
  stationFocus: Station | null;
  aideOuverte: boolean;
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

  const etats = useMemo(
    () => etatDesStations(donnees.stations, donnees.ascenseurs),
    [donnees.stations, donnees.ascenseurs]
  );

  const effacerSession = useCallback(() => {
    setRecherche(null);
    setStationFocus(null);
    setAideOuverte(false);
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
