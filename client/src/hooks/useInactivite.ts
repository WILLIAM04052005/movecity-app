import { useEffect, useRef, useState } from 'react';
import { AVERTISSEMENT_MS, INACTIVITE_MS } from '../config';

const EVENEMENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/**
 * Borne partagée : après INACTIVITE_MS sans interaction, on avertit puis, après
 * AVERTISSEMENT_MS, on appelle `surExpiration` (retour à l'accueil, effacement de
 * la session). Renvoie le nombre de secondes restantes pendant l'avertissement,
 * ou null si tout va bien.
 */
export function useInactivite(actif: boolean, surExpiration: () => void): number | null {
  const [secondes, setSecondes] = useState<number | null>(null);
  const rappel = useRef(surExpiration);

  useEffect(() => {
    rappel.current = surExpiration;
  }, [surExpiration]);

  useEffect(() => {
    if (!actif) {
      setSecondes(null);
      return;
    }

    let attente: number | undefined;
    let decompte: number | undefined;

    const arreter = () => {
      window.clearTimeout(attente);
      window.clearInterval(decompte);
    };

    const demarrer = () => {
      arreter();
      setSecondes(null);
      attente = window.setTimeout(() => {
        let restant = Math.round(AVERTISSEMENT_MS / 1000);
        setSecondes(restant);
        decompte = window.setInterval(() => {
          restant -= 1;
          if (restant <= 0) {
            arreter();
            setSecondes(null);
            rappel.current();
          } else {
            setSecondes(restant);
          }
        }, 1000);
      }, INACTIVITE_MS);
    };

    demarrer();
    EVENEMENTS.forEach(e => window.addEventListener(e, demarrer, { capture: true, passive: true }));

    return () => {
      arreter();
      EVENEMENTS.forEach(e => window.removeEventListener(e, demarrer, { capture: true }));
    };
  }, [actif]);

  return secondes;
}
