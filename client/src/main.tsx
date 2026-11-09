import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/kantumruy-pro/400.css';
import '@fontsource/kantumruy-pro/600.css';
import '@fontsource/kantumruy-pro/700.css';
import './styles/theme.css';
import './styles/app.css';
import App from './App';
import OperateurApp from './operateur/OperateurApp';
import './styles/operateur.css';

// /operateur → espace opérateur (connexion requise) ; tout le reste → borne citoyenne.
const estOperateur = window.location.pathname.replace(/\/+$/, '').startsWith('/operateur');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{estOperateur ? <OperateurApp /> : <App />}</StrictMode>
);
