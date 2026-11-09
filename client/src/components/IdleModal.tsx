import { useKiosk } from '../context/KioskContext';
import { Modal } from './Modal';

/** Avertissement avant retour à l'accueil. */
export function IdleModal({ secondes }: { secondes: number }) {
  const { t } = useKiosk();
  return (
    <Modal titre={t('inactiviteTitre')}>
      <p role="timer" aria-live="polite">
        {t('inactiviteTexte', { s: secondes })}
      </p>
      <button type="button" className="btn btn--accent">
        {t('inactiviteBouton')}
      </button>
    </Modal>
  );
}
