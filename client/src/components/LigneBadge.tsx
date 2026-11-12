import { couleurLigne } from '../utils/lignes';

function texteLisible(fond: string): string {
  const n = parseInt(fond.slice(1), 16);
  const luminance = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return luminance > 0.6 ? '#222222' : '#ffffff';
}

export function LigneBadge({ code, couleur }: { code: string; couleur?: string | null }) {
  const connue = couleurLigne(code);
  const fond = couleur && /^#[0-9a-fA-F]{6}$/.test(couleur) ? couleur : connue.fond;
  const texte = couleur && /^#[0-9a-fA-F]{6}$/.test(couleur) ? texteLisible(couleur) : connue.texte;
  return (
    <span className="badge-ligne" style={{ background: fond, color: texte }}>
      {code}
    </span>
  );
}
