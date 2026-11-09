import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { LigneBadge } from '../components/LigneBadge';
import type { Ligne } from '../types';
import { chargerLignes, chargerStations, creerStation, ErreurApi, modifierStation, supprimerStation, type StationAdmin } from './api';
import { Message, Pastille } from './composants';

type Retour = { type: 'ok' | 'erreur'; texte: string } | null;
const texteErreur = (e: unknown) => (e instanceof ErreurApi ? (e.details?.length ? `${e.message} ${e.details.map(d => d.message).join(' ')}` : e.message) : 'Erreur inattendue.');
const VIDE = { nom: '', lat: '', lon: '', lignes: [] as string[] };

export function Stations() {
  const [liste, setListe] = useState<StationAdmin[] | null>(null);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [retour, setRetour] = useState<Retour>(null);
  const [edition, setEdition] = useState<number | 'nouvelle' | null>(null);
  const [form, setForm] = useState(VIDE);
  const [suppressionId, setSuppressionId] = useState<number | null>(null);

  const recharger = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([chargerStations(), chargerLignes()]);
      setListe(s);
      setLignes(l);
    } catch (e) {
      setRetour({ type: 'erreur', texte: texteErreur(e) });
    }
  }, []);
  useEffect(() => { void recharger(); }, [recharger]);

  function ouvrir(s?: StationAdmin) {
    setRetour(null);
    setSuppressionId(null);
    setEdition(s ? s.id_station : 'nouvelle');
    setForm(s ? { nom: s.nom_station, lat: String(s.latitude), lon: String(s.longitude), lignes: s.lignes } : VIDE);
  }

  async function enregistrer(e: FormEvent) {
    e.preventDefault();
    setRetour(null);
    const corps = { nom_station: form.nom.trim(), latitude: Number(form.lat.replace(',', '.')), longitude: Number(form.lon.replace(',', '.')), lignes: form.lignes };
    try {
      if (edition === 'nouvelle') await creerStation(corps);
      else if (edition !== null) await modifierStation(edition, corps);
      setRetour({ type: 'ok', texte: edition === 'nouvelle' ? 'Station créée.' : 'Station modifiée.' });
      setEdition(null);
      await recharger();
    } catch (err) {
      setRetour({ type: 'erreur', texte: texteErreur(err) });
    }
  }

  async function supprimer(id: number) {
    setRetour(null);
    try {
      await supprimerStation(id);
      setRetour({ type: 'ok', texte: 'Station supprimée (ses ascenseurs aussi).' });
      setSuppressionId(null);
      await recharger();
    } catch (err) {
      setSuppressionId(null);
      setRetour({ type: 'erreur', texte: texteErreur(err) });
    }
  }

  const basculer = (code: string) =>
    setForm(f => ({ ...f, lignes: f.lignes.includes(code) ? f.lignes.filter(c => c !== code) : [...f.lignes, code] }));

  if (!liste) return retour ? <Message type="erreur">{retour.texte}</Message> : <p>Chargement…</p>;

  return (
    <div className="op-colonne">
      <div className="op-barre-outils">
        <span className="op-note">{liste.length} station(s)</span>
        <button type="button" className="btn btn--accent btn--petit" onClick={() => ouvrir()}>Ajouter une station</button>
      </div>

      {retour && <Message type={retour.type}>{retour.texte}</Message>}

      {edition !== null && (
        <form className="panneau op-bloc op-formulaire" onSubmit={enregistrer}>
          <h2>{edition === 'nouvelle' ? 'Nouvelle station' : 'Modifier la station'}</h2>
          <label className="op-champ"><span>Nom</span><input required maxLength={120} value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></label>
          <label className="op-champ"><span>Latitude</span><input required inputMode="decimal" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} placeholder="48.8586" /></label>
          <label className="op-champ"><span>Longitude</span><input required inputMode="decimal" value={form.lon} onChange={e => setForm({ ...form, lon: e.target.value })} placeholder="2.3470" /></label>
          <fieldset className="op-champ op-lignes">
            <legend>Lignes desservies</legend>
            {lignes.map(l => (
              <label key={l.code_ligne} className="op-case">
                <input type="checkbox" checked={form.lignes.includes(l.code_ligne)} onChange={() => basculer(l.code_ligne)} />
                <LigneBadge code={l.code_ligne} />
              </label>
            ))}
          </fieldset>
          <div className="op-actions">
            <button type="submit" className="btn btn--accent">Enregistrer</button>
            <button type="button" className="btn" onClick={() => setEdition(null)}>Annuler</button>
          </div>
        </form>
      )}

      <div className="op-tableau-defile">
        <table className="op-table">
          <thead><tr><th>Station</th><th>Lignes</th><th>Position</th><th>Ascenseurs</th><th>Actions</th></tr></thead>
          <tbody>
            {liste.map(s => (
              <tr key={s.id_station}>
                <td><strong>{s.nom_station}</strong></td>
                <td><div className="lignes">{s.lignes.map(c => <LigneBadge key={c} code={c} />)}</div></td>
                <td><code>{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}</code></td>
                <td><Pastille statut={s.statut_ascenseur} /></td>
                <td>
                  {suppressionId === s.id_station ? (
                    <div className="op-actions">
                      <span className="op-note">Supprimer, avec ses ascenseurs ?</span>
                      <button type="button" className="btn btn--primaire btn--petit" onClick={() => void supprimer(s.id_station)}>Confirmer</button>
                      <button type="button" className="btn btn--petit" onClick={() => setSuppressionId(null)}>Annuler</button>
                    </div>
                  ) : (
                    <div className="op-actions">
                      <button type="button" className="btn btn--petit" onClick={() => ouvrir(s)}>Modifier</button>
                      <button type="button" className="btn btn--petit" aria-label={`Supprimer la station ${s.nom_station}`} onClick={() => { setRetour(null); setSuppressionId(s.id_station); }}>Supprimer</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="op-note">La station qui héberge la borne ne peut pas être supprimée.</p>
    </div>
  );
}
