import { Accessibility, Luggage, PersonStanding } from 'lucide-react';
import { useKiosk } from '../context/KioskContext';
import { LangueSwitch } from './LangueSwitch';
import type { CleTexte } from '../i18n';
import type { Persona } from '../types';

const PROFILS: Array<{
  id: Persona;
  titre: CleTexte;
  description: CleTexte;
  Icone: typeof Luggage;
}> = [
  { id: 'touriste', titre: 'touristeTitre', description: 'touristeDesc', Icone: Luggage },
  { id: 'senior', titre: 'seniorTitre', description: 'seniorDesc', Icone: PersonStanding },
  { id: 'pmr', titre: 'pmrTitre', description: 'pmrDesc', Icone: Accessibility }
];

export function WelcomeScreen() {
  const { t, choisirPersona } = useKiosk();

  return (
    <main className="accueil">
      <header className="accueil-entete">
        <div className="logo">
          Move
          <br />
          City
        </div>
        <LangueSwitch />
      </header>

      <section className="accueil-centre">
        <h1>{t('bienvenue')}</h1>
        <p className="accueil-aide">{t('bienvenueAide')}</p>

        <div className="cartes-persona">
          {PROFILS.map(({ id, titre, description, Icone }) => (
            <button
              key={id}
              type="button"
              className={`carte-persona carte-persona--${id}`}
              onClick={() => choisirPersona(id)}
            >
              <Icone size={64} strokeWidth={1.75} aria-hidden="true" />
              <span className="carte-persona-titre">{t(titre)}</span>
              <span className="carte-persona-desc">{t(description)}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
