import { CircleHelp } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import { LigneBadge } from './LigneBadge';

export function TopBar() {
  const { config, t, setAideOuverte } = useKiosk();
  if (!config) return null;

  return (
    <header className="barre-haute panneau">
      <div className="logo logo--mini">
        Move
        <br />
        City
      </div>

      <div className="station-info">
        <div className="station-nom">{config.station.nom_station}</div>
        <div className="lignes" aria-label={t('correspondances')}>
          <span className="lignes-etiquette">{t('correspondances')}</span>
          {config.lignes.map(l => (
            <LigneBadge key={l.id_ligne} code={l.code_ligne} />
          ))}
        </div>
      </div>

      <button type="button" className="btn btn--primaire" onClick={() => setAideOuverte(true)}>
        <CircleHelp size={22} aria-hidden="true" />
        {t('aide')}
      </button>
    </header>
  );
}
