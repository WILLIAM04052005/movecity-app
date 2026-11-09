import { useMemo } from 'react';
import { useKiosk } from '../context/KioskContext';
import { estAncienne, formatMaj } from '../utils/ascenseurs';
import { formatDistance, trierParDistance } from '../utils/geo';
import { LigneBadge } from './LigneBadge';
import { StatusBadge } from './StatusBadge';
import type { StatutAscenseur } from '../types';

/** Panneau réservé au profil PMR : disponibilité et état des ascenseurs. */
export function ElevatorPanel() {
  const { etats, t, langue, setStationFocus } = useKiosk();

  const compte = (statut: StatutAscenseur) => etats.filter(e => e.statut === statut).length;
  const accessibles = useMemo(
    () => etats.filter(e => e.statut === 'disponible').map(e => e.station),
    [etats]
  );

  return (
    <aside className="panneau panneau-ascenseurs" aria-labelledby="titre-ascenseurs">
      <h2 id="titre-ascenseurs">{t('etatAscenseurs')}</h2>

      <p className="resume">
        <span className="badge-statut badge-statut--disponible">
          {compte('disponible')} {t('disponibles')}
        </span>
        <span className="badge-statut badge-statut--en_panne">
          {compte('en_panne')} {t('enPannePluriel')}
        </span>
        <span className="badge-statut badge-statut--inconnu">
          {compte('inconnu')} {t('inconnus')}
        </span>
      </p>

      <ul className="liste-etats">
        {etats.map(({ station, statut, cause, dateMaj }) => {
          const alternative =
            statut === 'en_panne'
              ? trierParDistance(
                  station.latitude,
                  station.longitude,
                  accessibles.filter(s => s.id_station !== station.id_station)
                )[0]
              : undefined;

          return (
            <li key={station.id_station} className="ligne-etat">
              <button type="button" className="ligne-etat-tete" onClick={() => setStationFocus(station)}>
                <span className="station-nom">{station.nom_station}</span>
                <StatusBadge statut={statut} />
              </button>

              <div className="lignes">
                {station.lignes.map(code => (
                  <LigneBadge key={code} code={code} />
                ))}
              </div>

              {cause && <p className="meta">{cause}</p>}
              {dateMaj && (
                <p className="meta">
                  {t('majLe')} {formatMaj(dateMaj, langue)}
                </p>
              )}
              {estAncienne(dateMaj) && statut !== 'inconnu' && (
                <p className="meta meta--alerte">{t('donneeAncienne')}</p>
              )}

              {statut === 'en_panne' && (
                <p className="suggestion">
                  {alternative
                    ? `${t('suggestionPanne')} ${alternative.nom_station} (${formatDistance(alternative.distanceKm)})`
                    : t('aucuneStationAccessible')}
                </p>
              )}
            </li>
          );
        })}
      </ul>

    </aside>
  );
}
