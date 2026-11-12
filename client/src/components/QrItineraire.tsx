import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useKiosk } from '../context/KioskContext';
import { lienItineraire } from '../utils/itineraire';
import { Modal } from './Modal';

export function QrItineraire() {
  const { t, config, recherche, stationChoisie, mode, setQrOuvert } = useKiosk();
  const [image, setImage] = useState<string | null>(null);

  const lien =
    config && recherche
      ? lienItineraire(mode, stationChoisie ?? config, recherche.adresse)
      : null;

  useEffect(() => {
    if (!lien) return;
    let annule = false;
    QRCode.toDataURL(lien, { width: 360, margin: 2, errorCorrectionLevel: 'M' }).then(url => {
      if (!annule) setImage(url);
    });
    return () => {
      annule = true;
    };
  }, [lien]);

  if (!lien) return null;

  return (
    <Modal titre={t('qrTitre')} onClose={() => setQrOuvert(false)}>
      <p>{t('qrTexte')}</p>
      <div className="qr">{image && <img src={image} alt={t('qrAlt')} width={288} height={288} />}</div>
      <p className="meta">{t('qrAnonyme')}</p>
      <button type="button" className="btn btn--accent" onClick={() => setQrOuvert(false)}>
        {t('fermer')}
      </button>
    </Modal>
  );
}
