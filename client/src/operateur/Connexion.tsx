import { useState, type FormEvent } from 'react';
import { ErreurApi, seConnecter, type Operateur } from './api';
import { Message } from './composants';

export function Connexion({ surConnexion, info }: { surConnexion: (jeton: string, o: Operateur) => void; info?: string }) {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const r = await seConnecter(email, motDePasse);
      surConnexion(r.token, r.operateur);
    } catch (err) {
      setErreur(
        err instanceof ErreurApi
          ? err.status === 429
            ? 'Trop de tentatives. Patientez quelques minutes.'
            : err.status === 401
              ? 'E-mail ou mot de passe incorrect.'
              : err.message
          : 'Erreur inattendue.'
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <main className="op-connexion">
      <form className="panneau op-carte-connexion" onSubmit={soumettre} noValidate>
        <div className="op-logo">Move<br />City</div>
        <h1>Espace opérateur</h1>
        <p className="op-note">Accès réservé aux opérateurs, via le VPN. Les citoyens n’ont pas de compte.</p>

        {info && <Message type="erreur">{info}</Message>}

        <label className="op-champ">
          <span>E-mail</span>
          <input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label className="op-champ">
          <span>Mot de passe</span>
          <input type="password" autoComplete="current-password" required value={motDePasse} onChange={e => setMotDePasse(e.target.value)} />
        </label>

        {erreur && <Message type="erreur">{erreur}</Message>}

        <button type="submit" className="btn btn--accent" disabled={envoi || !email || !motDePasse}>
          {envoi ? 'Connexion…' : 'Se connecter'}
        </button>
        <p className="op-aide">10 tentatives maximum par 15 minutes. Session de 2 h.</p>
      </form>
    </main>
  );
}
