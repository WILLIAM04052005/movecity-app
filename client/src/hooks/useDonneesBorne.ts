import { useCallback, useEffect, useState } from 'react';
import { chargerAscenseurs, chargerConfig, chargerStations } from '../api';
import { RAFRAICHISSEMENT_ASCENSEURS_MS } from '../config';
import type { Ascenseur, KioskConfig, Station } from '../types';

export interface DonneesBorne {
  config: KioskConfig | null;
  stations: Station[];
  ascenseurs: Ascenseur[];
  erreur: boolean;
  chargement: boolean;
  recharger: () => void;
}

/** Charge la config de la borne, les stations et les ascenseurs, et rafraîchit
 *  l'état des ascenseurs régulièrement (la donnée source change ~3 fois par jour). */
export function useDonneesBorne(): DonneesBorne {
  const [config, setConfig] = useState<KioskConfig | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [ascenseurs, setAscenseurs] = useState<Ascenseur[]>([]);
  const [erreur, setErreur] = useState(false);
  const [chargement, setChargement] = useState(true);

  const recharger = useCallback(() => {
    setChargement(true);
    setErreur(false);
    Promise.all([chargerConfig(), chargerStations(), chargerAscenseurs()])
      .then(([c, s, a]) => {
        setConfig(c);
        setStations(s);
        setAscenseurs(a);
      })
      .catch(() => setErreur(true))
      .finally(() => setChargement(false));
  }, []);

  useEffect(recharger, [recharger]);

  useEffect(() => {
    const minuteur = window.setInterval(() => {
      chargerAscenseurs()
        .then(setAscenseurs)
        .catch(() => {
          /* on garde la dernière donnée connue (sa date reste affichée) */
        });
    }, RAFRAICHISSEMENT_ASCENSEURS_MS);
    return () => window.clearInterval(minuteur);
  }, []);

  return { config, stations, ascenseurs, erreur, chargement, recharger };
}
