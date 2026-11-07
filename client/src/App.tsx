import { useEffect } from 'react';
import { IdleModal } from './components/IdleModal';
import { KioskScreen } from './components/KioskScreen';
import { WelcomeScreen } from './components/WelcomeScreen';
import { KioskProvider, useKiosk } from './context/KioskContext';
import { useInactivite } from './hooks/useInactivite';

function Racine() {
  const { persona, langue, reinitialiser } = useKiosk();

  // Rien à remettre à zéro si la borne est déjà dans son état d'accueil.
  const secondes = useInactivite(persona !== null || langue !== 'fr', reinitialiser);

  useEffect(() => {
    document.documentElement.lang = langue;
    document.documentElement.dataset.persona = persona ?? 'accueil';
  }, [langue, persona]);

  return (
    <>
      {persona ? <KioskScreen /> : <WelcomeScreen />}
      {persona && secondes !== null && <IdleModal secondes={secondes} />}
    </>
  );
}

export default function App() {
  return (
    <KioskProvider>
      <Racine />
    </KioskProvider>
  );
}
