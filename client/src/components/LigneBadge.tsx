import { couleurLigne } from '../utils/lignes';

export function LigneBadge({ code }: { code: string }) {
  const { fond, texte } = couleurLigne(code);
  return (
    <span className="badge-ligne" style={{ background: fond, color: texte }}>
      {code}
    </span>
  );
}
