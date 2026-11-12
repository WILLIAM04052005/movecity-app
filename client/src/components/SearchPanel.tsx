import { useState, type FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import { geocoder, GeocodageErreur } from '../api';
import { NB_STATIONS_PROCHES } from '../config';
import { useKiosk } from '../context/KioskContext';
import type { CleTexte } from '../i18n';
import { formatDistance, trierParDistance } from '../utils/geo';
import { LigneBadge } from './LigneBadge';
import { ResumeItineraire } from './ResumeItineraire';
import { StatusBadge } from './StatusBadge';

const MESSAGES_ERREUR: Record<GeocodageErreur['raison'], CleTexte> = {
  introuvable: 'aucunResultat',
  trop_de_requetes: 'tropDeRequetes',
  indisponible: 'serviceIndisponible'
};

/** Recherche d'adresse réelle (Base Adresse Nationale) → stations les plus proches. */
export function SearchPanel() {
  const { t, langue, stations, etats, persona, recherche, stationChoisie, setRecherche, setStationFocus, setStationChoisie } = useKiosk();
  const [texte, setTexte] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<CleTexte | null>(null);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    const q = texte.trim();
    if (q.length < 3 || enCours) return;

    setEnCours(true);
    setErreur(null);
    setStationChoisie(null);
    try {
      const adresse = await geocoder(q, langue);
      const proches = trierParDistance(adresse.latitude, adresse.longitude, stations).slice(0, NB_STATIONS_PROCHES);
      setRecherche({ adresse, proches });
    } catch (err) {
      setRecherche(null);
      setErreur(err instanceof GeocodageErreur ? MESSAGES_ERREUR[err.raison] : 'serviceIndisponible');
    } finally {
      setEnCours(false);
    }
  }

  function effacer() {
    setTexte('');
    setErreur(null);
    setRecherche(null);
    setStationFocus(null);
    setStationChoisie(null);
  }

  return (
    <section className="panneau recherche" aria-label={t('rechercher')}>
      {erreur && (
        <p className="erreur" role="alert">
          {t(erreur)}
        </p>
      )}

      {recherche && stationChoisie && <ResumeItineraire surNouvelleRecherche={effacer} />}

      {recherche && !stationChoisie && (
        <div className="recherche-resultats">
          <p className="resultats-titre">
            {t('stationsProches')} — <span className="libelle">{recherche.adresse.libelle}</span>
          </p>
          <ul className="liste-resultats">
            {recherche.proches.map(s => {
              const statut = etats.find(e => e.station.id_station === s.id_station)?.statut;
              return (
                <li key={s.id_station}>
                  <button type="button" className="resultat" onClick={() => setStationChoisie(s)}>
                    <span className="resultat-ligne">
                      <span className="station-nom">{s.nom_station}</span>
                      <span className="distance">{formatDistance(s.distanceKm)}</span>
                    </span>
                    <span className="lignes">
                      {s.lignes.map(code => (
                        <LigneBadge key={code} code={code} />
                      ))}
                      {persona === 'pmr' && statut && <StatusBadge statut={statut} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!(recherche && stationChoisie) && (
      <form className="champ-recherche" onSubmit={soumettre}>
        <input
          type="text"
          value={texte}
          onChange={e => setTexte(e.target.value)}
          placeholder={t('recherchePlaceholder')}
          aria-label={t('recherchePlaceholder')}
          maxLength={200}
          autoComplete="off"
          enterKeyHint="search"
        />
        {(texte || recherche) && (
          <button type="button" className="btn btn--icone" aria-label={t('effacer')} onClick={effacer}>
            <X size={24} aria-hidden="true" />
          </button>
        )}
        <button type="submit" className="btn btn--secondaire" disabled={enCours || texte.trim().length < 3}>
          <Search size={20} aria-hidden="true" />
          {enCours ? t('rechercheEnCours') : t('rechercher')}
        </button>
      </form>
      )}
    </section>
  );
}
