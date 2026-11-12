import { useKiosk } from '../context/KioskContext';
import { BottomBar } from './BottomBar';
import { ElevatorPanel } from './ElevatorPanel';
import { HelpModal } from './HelpModal';
import { MapView } from './MapView';
import { QrItineraire } from './QrItineraire';
import { SearchPanel } from './SearchPanel';
import { TopBar } from './TopBar';

/** Écran principal : carte en fond, panneaux par-dessus (wireframe validé). */
export function KioskScreen() {
  const { config, chargement, erreur, recharger, persona, aideOuverte, qrOuvert, t } = useKiosk();

  if (!config) {
    return (
      <main className="ecran-etat">
        {erreur ? (
          <>
            <p role="alert">{t('erreurChargement')}</p>
            <button type="button" className="btn btn--primaire" onClick={recharger}>
              {t('reessayer')}
            </button>
          </>
        ) : (
          <p>{chargement ? t('chargement') : ''}</p>
        )}
      </main>
    );
  }

  return (
    <div className="ecran-borne">
      <div className="carte-fond">
        <MapView config={config} />
      </div>

      <div className="calques">
        <TopBar />
        {persona === 'pmr' && <ElevatorPanel />}
        <div className="zone-basse">
          <BottomBar />
          <SearchPanel />
        </div>
      </div>

      {aideOuverte && <HelpModal />}
      {qrOuvert && <QrItineraire />}
    </div>
  );
}
