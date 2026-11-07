import { Accessibility, Users } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import { LangueSwitch } from './LangueSwitch';

/** Pied de page du wireframe : logo PMR (raccourci vers le mode PMR) + langue. */
export function BottomBar() {
  const { persona, choisirPersona, changerProfil, t } = useKiosk();

  return (
    <div className="barre-basse panneau">
      <button
        type="button"
        className="btn btn--icone"
        aria-pressed={persona === 'pmr'}
        aria-label={t('modePmr')}
        title={t('modePmr')}
        onClick={() => choisirPersona('pmr')}
      >
        <Accessibility size={28} aria-hidden="true" />
      </button>

      <LangueSwitch />

      <button type="button" className="btn" onClick={changerProfil}>
        <Users size={20} aria-hidden="true" />
        {t('changerProfil')}
      </button>
    </div>
  );
}
