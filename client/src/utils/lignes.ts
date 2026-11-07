// Couleurs d'identification des lignes (repères visuels proches de ceux d'IDFM).
// jamais le seul indice.
interface CouleurLigne { fond: string; texte: string }

const COULEURS: Record<string, CouleurLigne> = {
  M1:      { fond: '#FFCE00', texte: '#222222' },
  M4:      { fond: '#BB4D98', texte: '#ffffff' },
  M7:      { fond: '#FA9ABA', texte: '#222222' },
  M11:     { fond: '#8D5E2A', texte: '#ffffff' },
  M14:     { fond: '#62259D', texte: '#ffffff' },
  'RER A': { fond: '#E2231A', texte: '#ffffff' },
  'RER B': { fond: '#5091CB', texte: '#222222' },
  'RER D': { fond: '#00814F', texte: '#ffffff' }
};

export function couleurLigne(code: string): CouleurLigne {
  return COULEURS[code] ?? { fond: '#d9d9d9', texte: '#222222' };
}
