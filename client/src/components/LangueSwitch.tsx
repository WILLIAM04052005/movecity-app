import { useKiosk } from '../context/KioskContext';
import type { Langue } from '../types';

const LANGUES: Langue[] = ['fr', 'en'];

export function LangueSwitch() {
  const { langue, setLangue, t } = useKiosk();
  return (
    <div className="langue-switch" role="group" aria-label={t('langueChoix')}>
      {LANGUES.map(l => (
        <button
          key={l}
          type="button"
          className="btn btn--langue"
          aria-pressed={langue === l}
          onClick={() => setLangue(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
