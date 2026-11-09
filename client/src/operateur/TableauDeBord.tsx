import { useCallback, useEffect, useState } from 'react';
import { LigneBadge } from '../components/LigneBadge';
import type { StatsAscenseurs } from '../types';
import { chargerStatsAscenseurs, chargerUsage, ErreurApi, type StatsUsage } from './api';
import { Message } from './composants';
import { Barres, HistogrammeHeures } from './Graphiques';

const PERIODES = [7, 30, 90] as const;
const NOMS_LANGUES: Record<string, string> = { fr: 'Français', en: 'English' };
const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

export function TableauDeBord() {
  const [jours, setJours] = useState<number>(30);
  const [usage, setUsage] = useState<StatsUsage | null>(null);
  const [ascenseurs, setAscenseurs] = useState<StatsAscenseurs | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(() => {
    setErreur(null);
    Promise.all([chargerUsage(jours), chargerStatsAscenseurs()])
      .then(([u, a]) => { setUsage(u); setAscenseurs(a); })
      .catch(e => setErreur(e instanceof ErreurApi ? e.message : 'Chargement impossible.'));
  }, [jours]);
  useEffect(charger, [charger]);

  if (erreur) return <div className="op-bloc"><Message type="erreur">{erreur}</Message><button className="btn" onClick={charger}>Réessayer</button></div>;
  if (!usage || !ascenseurs) return <p>Chargement…</p>;

  const langueTop = usage.par_langue[0];
  const lignesAvecPannes = ascenseurs.pannes_par_ligne;

  return (
    <div className="op-colonne">
      <div className="op-barre-outils">
        <div role="group" aria-label="Période">
          {PERIODES.map(p => (
            <button key={p} type="button" className="btn btn--petit" aria-pressed={jours === p} onClick={() => setJours(p)}>
              {p} jours
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--petit" onClick={charger}>Actualiser</button>
      </div>

      <div className="op-tuiles">
        <div className="op-tuile op-tuile--secondaire"><span>Recherches ({jours} j)</span><strong>{usage.total_recherches}</strong></div>
        <div className="op-tuile op-tuile--primaire"><span>Ascenseurs en panne</span><strong>{ascenseurs.en_panne} / {ascenseurs.total}</strong><small>{String(ascenseurs.taux_panne_pct).replace('.', ',')} %</small></div>
        <div className="op-tuile op-tuile--accent"><span>Disponibles</span><strong>{ascenseurs.disponibles}</strong><small>✓ en service au dernier relevé</small></div>
        <div className="op-tuile"><span>Langue la plus utilisée</span><strong>{langueTop ? NOMS_LANGUES[langueTop.langue] ?? langueTop.langue : '—'}</strong>{langueTop && <small>{pct(langueTop.recherches, usage.total_recherches)} %</small>}</div>
      </div>

      {usage.total_recherches === 0 && (
        <Message type="ok">Aucune recherche sur cette période. En développement, <code>npm run db:demo</code> ajoute 600 recherches fictives.</Message>
      )}

      <div className="op-grille">
        <section className="panneau op-bloc op-bloc--large" aria-labelledby="g-heures">
          <h2 id="g-heures">Recherches par heure</h2>
          <HistogrammeHeures donnees={usage.par_heure} />
        </section>

        <section className="panneau op-bloc" aria-labelledby="g-langues">
          <h2 id="g-langues">Recherches par langue</h2>
          <Barres
            lignes={usage.par_langue.map(l => ({ etiquette: NOMS_LANGUES[l.langue] ?? l.langue, valeur: l.recherches, texte: `${pct(l.recherches, usage.total_recherches)} %` }))}
            max={usage.total_recherches}
          />
        </section>

        <section className="panneau op-bloc" aria-labelledby="g-stations">
          <h2 id="g-stations">Stations les plus recherchées</h2>
          <Barres lignes={usage.par_station.slice(0, 6).map(s => ({ etiquette: s.nom_station, valeur: s.recherches, texte: String(s.recherches) }))} />
          <p className="op-note">Station la plus proche de l’adresse tapée ; l’adresse elle-même n’est jamais enregistrée.</p>
        </section>

        <section className="panneau op-bloc op-bloc--large" aria-labelledby="g-lignes">
          <h2 id="g-lignes">Pannes d’ascenseurs par ligne</h2>
          <Barres
            lignes={lignesAvecPannes.map(l => ({
              etiquette: <LigneBadge code={l.code_ligne} />,
              valeur: l.en_panne,
              texte: l.total === 0 ? 'aucun suivi' : `${l.en_panne} / ${l.total}`
            }))}
          />
          <p className="op-note">Dernier état connu. Données de démonstration tant que la synchronisation IDFM n’est pas active.</p>
        </section>
      </div>
    </div>
  );
}
