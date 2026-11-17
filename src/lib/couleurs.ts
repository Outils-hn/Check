import { sansAccents } from "./notes";

// Une couleur par sujet : la meme pour « Soudure », « soudure » ou « SOUDURE » (sans accents, sans casse).
// Classes ecrites en toutes lettres pour que Tailwind les garde.
const PALETTE = [
  { badge: "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200", bord: "border-l-sky-500" },
  { badge: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200", bord: "border-l-emerald-500" },
  { badge: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200", bord: "border-l-amber-500" },
  { badge: "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200", bord: "border-l-rose-500" },
  { badge: "border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200", bord: "border-l-violet-500" },
  { badge: "border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-200", bord: "border-l-orange-500" },
  { badge: "border-teal-300 bg-teal-100 text-teal-900 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-200", bord: "border-l-teal-500" },
  { badge: "border-pink-300 bg-pink-100 text-pink-900 dark:border-pink-700 dark:bg-pink-950 dark:text-pink-200", bord: "border-l-pink-500" },
];
export function couleurSujet(sujet: string): { badge: string; bord: string } | null {
  const cle = sansAccents(sujet).trim();
  if (!cle) return null;
  let h = 0;
  for (const c of cle) h = (h * 31 + c.codePointAt(0)!) >>> 0;
  return PALETTE[h % PALETTE.length];
}
