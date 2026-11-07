import { CircleCheck, CircleHelp, TriangleAlert } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import type { StatutAscenseur } from '../types';

const ICONES = { disponible: CircleCheck, en_panne: TriangleAlert, inconnu: CircleHelp } as const;
const CLES = { disponible: 'disponible', en_panne: 'enPanne', inconnu: 'inconnu' } as const;

/** Statut d'ascenseur : icône + mot + couleur (jamais la couleur seule). */
export function StatusBadge({ statut }: { statut: StatutAscenseur }) {
  const { t } = useKiosk();
  const Icone = ICONES[statut];
  return (
    <span className={`badge-statut badge-statut--${statut}`}>
      <Icone size={18} aria-hidden="true" />
      {t(CLES[statut])}
    </span>
  );
}
