import { useCallback, useEffect, useState } from 'react';
import { definirJeton, definirSurSessionExpiree, type Operateur } from './api';
import { Ascenseurs } from './Ascenseurs';
import { Connexion } from './Connexion';
import { Stations } from './Stations';
import { TableauDeBord } from './TableauDeBord';

type Onglet = 'dashboard' | 'ascenseurs' | 'stations';
const ONGLETS: { id: Onglet; titre: string }[] = [
  { id: 'dashboard', titre: 'Tableau de bord' },
  { id: 'ascenseurs', titre: 'Ascenseurs' },
  { id: 'stations', titre: 'Stations' }
];

/** Espace opérateur (/operateur) : connexion JWT puis gestion. Le citoyen n'y a jamais accès. */
export default function OperateurApp() {
  const [operateur, setOperateur] = useState<Operateur | null>(null);
  const [onglet, setOnglet] = useState<Onglet>('dashboard');
  const [info, setInfo] = useState<string | undefined>();

  useEffect(() => {
    document.title = 'Movecity — Espace opérateur';
    document.documentElement.dataset.persona = 'operateur';
    document.documentElement.lang = 'fr';
  }, []);

  const deconnecter = useCallback((message?: string) => {
    definirJeton(null);
    setOperateur(null);
    setInfo(message);
  }, []);

  useEffect(() => {
    definirSurSessionExpiree(() => deconnecter('Session expirée : reconnectez-vous.'));
    return () => definirSurSessionExpiree(null);
  }, [deconnecter]);

  if (!operateur) {
    return (
      <Connexion
        info={info}
        surConnexion={(jeton, o) => {
          definirJeton(jeton);
          setInfo(undefined);
          setOnglet('dashboard');
          setOperateur(o);
        }}
      />
    );
  }

  return (
    <div className="op-page">
      <header className="panneau op-entete">
        <div className="op-logo">Move<br />City</div>
        <h1>Espace opérateur — Châtelet - Les Halles</h1>
        <span className="op-utilisateur">{operateur.email}</span>
        <button type="button" className="btn btn--petit" onClick={() => deconnecter()}>Déconnexion</button>
      </header>

      <nav className="op-onglets" role="tablist" aria-label="Sections">
        {ONGLETS.map(o => (
          <button key={o.id} type="button" role="tab" id={`onglet-${o.id}`} aria-selected={onglet === o.id} aria-controls="op-contenu" className="op-onglet" onClick={() => setOnglet(o.id)}>
            {o.titre}
          </button>
        ))}
      </nav>

      <main id="op-contenu" role="tabpanel" aria-labelledby={`onglet-${onglet}`}>
        {onglet === 'dashboard' && <TableauDeBord />}
        {onglet === 'ascenseurs' && <Ascenseurs />}
        {onglet === 'stations' && <Stations />}
      </main>
    </div>
  );
}
