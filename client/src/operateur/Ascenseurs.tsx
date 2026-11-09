import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Ascenseur, StatutAscenseur } from '../types';
import { changerStatut, chargerAscenseurs, chargerStations, creerAscenseur, ErreurApi, supprimerAscenseur, type StationAdmin } from './api';
import { formatDate, Message, Pastille } from './composants';

const CAUSES = ['Panne technique', 'Maintenance programmée', 'Fermé pour travaux', 'Autre problème'];
type Retour = { type: 'ok' | 'erreur'; texte: string } | null;
const texteErreur = (e: unknown) => (e instanceof ErreurApi ? (e.details?.length ? `${e.message} ${e.details.map(d => d.message).join(' ')}` : e.message) : 'Erreur inattendue.');

export function Ascenseurs() {
  const [liste, setListe] = useState<Ascenseur[] | null>(null);
  const [stations, setStations] = useState<StationAdmin[]>([]);
  const [retour, setRetour] = useState<Retour>(null);
  const [filtre, setFiltre] = useState<StatutAscenseur | 'tous'>('tous');
  const [panneId, setPanneId] = useState<number | null>(null);
  const [cause, setCause] = useState(CAUSES[0]);
  const [suppressionId, setSuppressionId] = useState<number | null>(null);

  const recharger = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([chargerAscenseurs(), chargerStations()]);
      setListe(a);
      setStations(s);
    } catch (e) {
      setRetour({ type: 'erreur', texte: texteErreur(e) });
    }
  }, []);
  useEffect(() => { void recharger(); }, [recharger]);

  async function agir(travail: () => Promise<unknown>, succes: string) {
    setRetour(null);
    try {
      await travail();
      setRetour({ type: 'ok', texte: succes });
      setPanneId(null);
      setSuppressionId(null);
      await recharger();
    } catch (e) {
      setRetour({ type: 'erreur', texte: texteErreur(e) });
    }
  }

  if (!liste) return retour ? <Message type="erreur">{retour.texte}</Message> : <p>Chargement…</p>;
  const visibles = filtre === 'tous' ? liste : liste.filter(a => a.statut === filtre);

  return (
    <div className="op-colonne">
      <div className="op-barre-outils">
        <div role="group" aria-label="Filtrer par statut">
          {(['tous', 'en_panne', 'inconnu', 'disponible'] as const).map(f => (
            <button key={f} type="button" className="btn btn--petit" aria-pressed={filtre === f} onClick={() => setFiltre(f)}>
              {f === 'tous' ? 'Tous' : f === 'en_panne' ? 'En panne' : f === 'inconnu' ? 'Inconnu' : 'Disponible'}
            </button>
          ))}
        </div>
        <span className="op-note">{visibles.length} ascenseur(s)</span>
      </div>

      {retour && <Message type={retour.type}>{retour.texte}</Message>}

      <div className="op-tableau-defile">
        <table className="op-table">
          <thead>
            <tr><th>Station</th><th>Emplacement</th><th>Référence</th><th>Statut</th><th>Mis à jour</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {visibles.length === 0 && <tr><td colSpan={6}>Aucun ascenseur.</td></tr>}
            {visibles.map(a => (
              <tr key={a.id_ascenseur}>
                <td><strong>{a.nom_station}</strong></td>
                <td>{a.libelle ?? '—'}</td>
                <td><code>{a.ref_externe ?? '—'}</code></td>
                <td>
                  <Pastille statut={a.statut} />
                  {a.cause_panne && <div className="op-note">{a.cause_panne}</div>}
                </td>
                <td>{formatDate(a.date_maj)}</td>
                <td>
                  {panneId === a.id_ascenseur ? (
                    <form className="op-actions" onSubmit={e => { e.preventDefault(); void agir(() => changerStatut(a.id_ascenseur, 'en_panne', cause), 'Ascenseur déclaré en panne.'); }}>
                      <label className="op-champ op-champ--compact">
                        <span>Cause</span>
                        <select value={cause} onChange={e => setCause(e.target.value)}>{CAUSES.map(c => <option key={c}>{c}</option>)}</select>
                      </label>
                      <button type="submit" className="btn btn--primaire btn--petit">Valider</button>
                      <button type="button" className="btn btn--petit" onClick={() => setPanneId(null)}>Annuler</button>
                    </form>
                  ) : suppressionId === a.id_ascenseur ? (
                    <div className="op-actions">
                      <span className="op-note">Supprimer définitivement ?</span>
                      <button type="button" className="btn btn--primaire btn--petit" onClick={() => void agir(() => supprimerAscenseur(a.id_ascenseur), 'Ascenseur supprimé.')}>Confirmer</button>
                      <button type="button" className="btn btn--petit" onClick={() => setSuppressionId(null)}>Annuler</button>
                    </div>
                  ) : (
                    <div className="op-actions">
                      {a.statut !== 'en_panne' && <button type="button" className="btn btn--petit" onClick={() => { setPanneId(a.id_ascenseur); setCause(CAUSES[0]); }}>Déclarer en panne</button>}
                      {a.statut !== 'disponible' && <button type="button" className="btn btn--accent btn--petit" onClick={() => void agir(() => changerStatut(a.id_ascenseur, 'disponible', null), 'Ascenseur remis en service.')}>Remettre en service</button>}
                      {a.statut !== 'inconnu' && <button type="button" className="btn btn--petit" onClick={() => void agir(() => changerStatut(a.id_ascenseur, 'inconnu', null), 'Statut passé à « inconnu ».')}>Statut inconnu</button>}
                      <button type="button" className="btn btn--petit" aria-label={`Supprimer l’ascenseur ${a.ref_externe ?? a.id_ascenseur}`} onClick={() => setSuppressionId(a.id_ascenseur)}>Supprimer</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormulaireAscenseur stations={stations} surCreation={(c) => agir(() => creerAscenseur(c), 'Ascenseur ajouté.')} />
    </div>
  );
}

function FormulaireAscenseur({ stations, surCreation }: { stations: StationAdmin[]; surCreation: (c: Parameters<typeof creerAscenseur>[0]) => Promise<void> }) {
  const [idStation, setIdStation] = useState('');
  const [statut, setStatut] = useState<StatutAscenseur>('inconnu');
  const [cause, setCause] = useState(CAUSES[0]);
  const [ref, setRef] = useState('');

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    await surCreation({
      id_station: Number(idStation),
      statut,
      cause_panne: statut === 'en_panne' ? cause : null,
      ref_externe: ref.trim() || null
    });
    setRef('');
  }

  return (
    <details className="panneau op-bloc">
      <summary>Ajouter un ascenseur</summary>
      <form className="op-formulaire" onSubmit={soumettre}>
        <label className="op-champ"><span>Station</span>
          <select required value={idStation} onChange={e => setIdStation(e.target.value)}>
            <option value="">Choisir…</option>
            {stations.map(s => <option key={s.id_station} value={s.id_station}>{s.nom_station}</option>)}
          </select>
        </label>
        <label className="op-champ"><span>Statut initial</span>
          <select value={statut} onChange={e => setStatut(e.target.value as StatutAscenseur)}>
            <option value="inconnu">Inconnu</option><option value="disponible">Disponible</option><option value="en_panne">En panne</option>
          </select>
        </label>
        {statut === 'en_panne' && (
          <label className="op-champ"><span>Cause</span>
            <select value={cause} onChange={e => setCause(e.target.value)}>{CAUSES.map(c => <option key={c}>{c}</option>)}</select>
          </label>
        )}
        <label className="op-champ"><span>Référence (facultatif)</span>
          <input value={ref} maxLength={50} onChange={e => setRef(e.target.value)} />
        </label>
        <button type="submit" className="btn btn--accent" disabled={!idStation}>Ajouter</button>
      </form>
    </details>
  );
}
