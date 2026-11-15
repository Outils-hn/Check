import type { ReactNode } from "react";
import { sansAccents } from "@/lib/notes";

/** Affiche un texte en surlignant les mots cherches (sans tenir compte des accents ni des majuscules). */
export function Surligne({ texte, mots }: { texte: string; mots: string[] }) {
  if (!mots.length || !texte) return <>{texte}</>;
  // Texte « normalise » + table de correspondance vers le texte d'origine (un accent peut changer la longueur).
  let norm = "";
  const vers: number[] = [];
  let i = 0;
  for (const c of texte) {
    const n = sansAccents(c);
    for (let k = 0; k < n.length; k++) vers.push(i);
    norm += n;
    i += c.length;
  }
  const plages: [number, number][] = [];
  for (const m of mots) {
    let d = 0;
    for (;;) {
      const x = norm.indexOf(m, d);
      if (x < 0) break;
      plages.push([vers[x], x + m.length < vers.length ? vers[x + m.length] : texte.length]);
      d = x + m.length;
    }
  }
  if (!plages.length) return <>{texte}</>;
  plages.sort((a, b) => a[0] - b[0]);
  const fusion: [number, number][] = [];
  for (const p of plages) {
    const dernier = fusion[fusion.length - 1];
    if (dernier && p[0] <= dernier[1]) dernier[1] = Math.max(dernier[1], p[1]);
    else fusion.push([p[0], p[1]]);
  }
  const morceaux: ReactNode[] = [];
  let pos = 0;
  fusion.forEach(([a, b], idx) => {
    if (a > pos) morceaux.push(texte.slice(pos, a));
    morceaux.push(<mark key={idx} className="rounded-sm bg-yellow-200 px-0.5 text-foreground dark:bg-yellow-500/40">{texte.slice(a, b)}</mark>);
    pos = b;
  });
  if (pos < texte.length) morceaux.push(texte.slice(pos));
  return <>{morceaux}</>;
}
