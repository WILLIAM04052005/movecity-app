import { useState } from 'react';
import { Bike, Car, ChevronDown, ChevronUp, Footprints, TrainFront, QrCode, type LucideIcon } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import type { CleTexte } from '../i18n';
import type { EtapeItineraire, ModeTransport } from '../types';
import { distanceKm, formatDistance } from '../utils/geo';
import { formatDuree } from '../utils/itineraire';
import { LigneBadge } from './LigneBadge';

const ICONES: Record<ModeTransport, LucideIcon> = { transit: TrainFront, foot: Footprints, bike: Bike, car: Car };
const LIBELLES: Record<ModeTransport, CleTexte> = {
  transit: 'modeTransit',
  foot: 'modeFoot',
  bike: 'modeBike',
  car: 'modeCar'
};
const LIBELLES_ETAPE: Record<EtapeItineraire['type'], CleTexte> = {
  transport: 'modeTransit',
  marche: 'etapeMarche',
  velo: 'etapeVelo',
  voiture: 'etapeVoiture'
};

export function ResumeItineraire({ surNouvelleRecherche }: { surNouvelleRecherche: () => void }) {
  const { t, config, recherche, stationChoisie, setStationChoisie, modes, mode, setMode, itineraires, setQrOuvert } = useKiosk();
  const [detail, setDetail] = useState(false);
  if (!recherche || !stationChoisie || !config) return null;

  const vol = distanceKm(config.latitude, config.longitude, recherche.adresse.latitude, recherche.adresse.longitude);
  const courant = itineraires[mode];

  return (
    <div className="itineraire">
      <div className="itineraire-tete">
        <p className="resultats-titre">
          {t('itineraireVers')} <span className="libelle">{recherche.adresse.libelle}</span>
          <span className="itineraire-via">
            {t('viaStation')} {stationChoisie.nom_station}
          </span>
        </p>
        <div className="itineraire-actions">
          <button type="button" className="btn btn--petit" onClick={() => setStationChoisie(null)}>
            {t('changerStation')}
          </button>
          <button type="button" className="btn btn--petit" onClick={surNouvelleRecherche}>
            {t('nouvelleRecherche')}
          </button>
        </div>
      </div>

      <div className="modes" role="group" aria-label={t('choixTransport')}>
        {modes.map(m => {
          const Icone = ICONES[m];
          const etat = itineraires[m];
          let detail = t('calcul');
          if (etat?.statut === 'ok') {
            detail = `${formatDistance(etat.itineraire.distance_m / 1000)} · ${formatDuree(etat.itineraire.duree_s)}`;
          } else if (etat?.statut === 'erreur') {
            detail = m === 'transit' ? t('indisponible') : `≈ ${formatDistance(vol)}`;
          }
          return (
            <button key={m} type="button" className="mode" aria-pressed={m === mode} onClick={() => setMode(m)}>
              <Icone size={22} aria-hidden="true" />
              <span className="mode-nom">{t(LIBELLES[m])}</span>
              <span className="mode-detail">{detail}</span>
            </button>
          );
        })}
      </div>

      {courant?.statut === 'ok' && (
        <>
          <div className="apercu">
            {courant.itineraire.etapes.map((e, i) => (
              <span key={i} className="apercu-etape">
                {e.type === 'transport' && e.ligne ? (
                  <LigneBadge code={e.ligne} couleur={e.couleur} />
                ) : (
                  <span className="etape-type">{t(LIBELLES_ETAPE[e.type])}</span>
                )}
                <span className="etape-duree">{formatDuree(e.duree_s)}</span>
              </span>
            ))}
            <button
              type="button"
              className="lien-detail"
              aria-expanded={detail}
              onClick={() => setDetail(d => !d)}
            >
              {detail ? t('masquerDetail') : t('afficherDetail')}
              {detail ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
            </button>
          </div>

          {detail && (
            <ol className="etapes">
              {courant.itineraire.etapes.map((e, i, toutes) => (
                <li key={i} className="etape">
                  {e.type === 'transport' && e.ligne ? (
                    <LigneBadge code={e.ligne} couleur={e.couleur} />
                  ) : (
                    <span className="etape-type">{t(LIBELLES_ETAPE[e.type])}</span>
                  )}
                  <span className="etape-texte">
                    {e.vers
                      ? `${t('etapeVers')} ${e.vers}`
                      : i === toutes.length - 1
                        ? `${t('etapeVers')} ${recherche.adresse.libelle}`
                        : ''}
                  </span>
                  <span className="etape-duree">{formatDuree(e.duree_s)}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      {courant?.statut === 'erreur' && <p className="meta">{t('tracIndicatif')}</p>}

      <button type="button" className="btn btn--accent btn-qr" onClick={() => setQrOuvert(true)}>
        <QrCode size={22} aria-hidden="true" />
        {t('envoyerTelephone')}
      </button>
    </div>
  );
}
