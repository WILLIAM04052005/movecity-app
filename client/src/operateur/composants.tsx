import { CircleCheck, CircleHelp, TriangleAlert } from 'lucide-react';
import type { StatutAscenseur } from '../types';

const ICONES = { disponible: CircleCheck, en_panne: TriangleAlert, inconnu: CircleHelp } as const;
const LIBELLES = { disponible: 'Disponible', en_panne: 'En panne', inconnu: 'Statut inconnu' } as const;

/** Statut : icône + mot + couleur (jamais la couleur seule), comme sur la borne. */
export function Pastille({ statut }: { statut: StatutAscenseur }) {
  const Icone = ICONES[statut];
  return (
    <span className={`badge-statut badge-statut--${statut}`}>
      <Icone size={16} aria-hidden="true" />
      {LIBELLES[statut]}
    </span>
  );
}

/** Message de retour d'action (succès ou erreur), annoncé aux lecteurs d'écran. */
export function Message({ type, children }: { type: 'ok' | 'erreur'; children: React.ReactNode }) {
  return (
    <p className={`op-message op-message--${type}`} role={type === 'erreur' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(d);
}
