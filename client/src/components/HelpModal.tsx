import { useState } from 'react';
import { PhoneCall } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import { Modal } from './Modal';

export function HelpModal() {
  const { t, setAideOuverte } = useKiosk();
  const [envoyee, setEnvoyee] = useState(false);

  return (
    <Modal titre={t('aideTitre')} onClose={() => setAideOuverte(false)}>
      <p>{envoyee ? t('aideEnvoyee') : t('aideTexte')}</p>
      {/* Prototype : l'alerte agent est simulée. À brancher plus tard sur un
          interphone / une route dédiée côté opérateur. */}
      {!envoyee && (
        <button type="button" className="btn btn--primaire" onClick={() => setEnvoyee(true)}>
          <PhoneCall size={20} aria-hidden="true" />
          {t('aideAppeler')}
        </button>
      )}
      <button type="button" className="btn" onClick={() => setAideOuverte(false)}>
        {t('fermer')}
      </button>
    </Modal>
  );
}
