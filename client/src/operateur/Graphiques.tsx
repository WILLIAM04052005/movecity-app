import type { StatsUsage } from './api';

/** Histogramme des 24 heures. Alternative textuelle : résumé du pic dans aria-label. */
export function HistogrammeHeures({ donnees }: { donnees: StatsUsage['par_heure'] }) {
  const max = Math.max(1, ...donnees.map(d => d.recherches));
  const pic = donnees.reduce((a, b) => (b.recherches > a.recherches ? b : a), donnees[0]);
  const L = 720, H = 220, BAS = 28, HAUT = 22, pas = L / 24, largeur = pas * 0.62;

  return (
    <figure className="op-figure">
      <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label={`Recherches par heure de la journée. Pic à ${pic.heure} h avec ${pic.recherches} recherches.`}>
        <line x1="0" y1={H - BAS} x2={L} y2={H - BAS} className="op-axe" />
        {donnees.map(d => {
          const h = ((H - BAS - HAUT) * d.recherches) / max;
          const x = d.heure * pas + (pas - largeur) / 2;
          return (
            <g key={d.heure}>
              <rect x={x} y={H - BAS - h} width={largeur} height={Math.max(h, d.recherches ? 2 : 0)} rx="3" className={d.heure === pic.heure && pic.recherches > 0 ? 'op-barre op-barre--pic' : 'op-barre'}>
                <title>{`${d.heure} h : ${d.recherches} recherche(s)`}</title>
              </rect>
              {d.heure % 3 === 0 && <text x={x + largeur / 2} y={H - 8} textAnchor="middle" className="op-etiquette">{d.heure} h</text>}
            </g>
          );
        })}
        {pic.recherches > 0 && (
          <text x={pic.heure * pas + pas / 2} y={H - BAS - ((H - BAS - HAUT) * pic.recherches) / max - 6} textAnchor="middle" className="op-etiquette op-etiquette--gras">
            {pic.recherches}
          </text>
        )}
      </svg>
      <figcaption>{pic.recherches > 0 ? `Pic à ${pic.heure} h (${pic.recherches} recherches). Heure de Paris.` : 'Aucune recherche sur la période.'}</figcaption>
    </figure>
  );
}

export interface LigneBarre { etiquette: React.ReactNode; valeur: number; texte: string }

/** Barres horizontales avec valeur écrite */
export function Barres({ lignes, max }: { lignes: LigneBarre[]; max?: number }) {
  const m = max ?? Math.max(1, ...lignes.map(l => l.valeur));
  return (
    <ul className="op-barres">
      {lignes.map((l, i) => (
        <li key={i} className="op-barre-ligne">
          <span className="op-barre-etiquette">{l.etiquette}</span>
          <span className="op-barre-piste" aria-hidden="true">
            <span className="op-barre-remplie" style={{ width: `${(l.valeur / m) * 100}%` }} />
          </span>
          <span className="op-barre-valeur">{l.texte}</span>
        </li>
      ))}
    </ul>
  );
}
