// Logique des notes (sans base ni affichage) : types, recherche, filtres, tri, echeances.

export type Statut = "todo" | "in_progress" | "waiting" | "done";
export type Note = {
  id: string; projet_id: string | null; auteur: string; pour: string | null;
  texte: string; statut: Statut; echeance: string | null; flash: boolean; archive: boolean;
  ordre: number; regle_le: string | null; supprime_le: string | null; created_at: string; updated_at?: string;
};
export type Projet = { id: string; nom: string; numero: string; cree_par: string | null; archive: boolean };
export type Membre = { projet_id: string; user_id: string };
export type Compte = { id: string; nom: string; email: string };

export const STATUTS: Statut[] = ["todo", "in_progress", "waiting", "done"];
export const LIBELLE: Record<Statut, string> = { todo: "À faire", in_progress: "En cours", waiting: "En attente", done: "Réglé" };
export const suivant = (s: Statut): Statut => STATUTS[(STATUTS.indexOf(s) + 1) % STATUTS.length];

export const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ß/g, "ss");

/** Echeance : depassee, dans 2 jours ou moins, plus tard, ou aucune. */
export function etatEcheance(iso: string | null, maintenant = new Date()): "aucune" | "ok" | "proche" | "retard" {
  if (!iso) return "aucune";
  const j = new Date(maintenant); j.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  const diff = Math.round((d.getTime() - j.getTime()) / 86400000);
  return diff < 0 ? "retard" : diff <= 2 ? "proche" : "ok";
}

/** Projet affiche : « 24-118 · Résidence Les Pins » ou le nom seul. */
export const nomProjet = (p: Projet | undefined | null) => (!p ? "Perso" : p.numero ? `${p.numero} · ${p.nom}` : p.nom);

export type Vue = "actives" | "pour-moi" | "archivees" | "corbeille";
export type Tri = "manuel" | "recent" | "echeance";
export type Filtres = { vue: Vue; projets: string[]; statut: Statut | "tous"; q: string; tri: Tri };
/** Identifiant de la boite « Perso » dans les filtres de projets. */
export const PERSO = "__perso__";

export function filtrer(notes: Note[], f: Filtres, moi: string, nomDe: (id: string | null) => string): Note[] {
  const mots = sansAccents(f.q).split(/\s+/).filter(Boolean);
  const res = notes.filter((n) => {
    if (f.vue === "corbeille") { if (!n.supprime_le) return false; }
    else {
      if (n.supprime_le) return false;
      if (f.vue === "archivees" ? !n.archive : n.archive) return false;
      if (f.vue === "pour-moi" && (n.pour !== moi || n.statut === "done")) return false;
    }
    if (f.projets.length && !f.projets.includes(n.projet_id ?? PERSO)) return false;
    if (f.statut !== "tous" && n.statut !== f.statut) return false;
    if (mots.length) {
      const t = sansAccents(`${n.texte} ${nomDe(n.projet_id)}`);
      if (!mots.every((m) => t.includes(m))) return false;
    }
    return true;
  });
  const parEcheance = (a: Note, b: Note) =>
    !a.echeance && !b.echeance ? b.created_at.localeCompare(a.created_at) : !a.echeance ? 1 : !b.echeance ? -1 : a.echeance.localeCompare(b.echeance);
  const tri = f.vue === "pour-moi" ? "echeance" : f.tri;
  return res.sort(tri === "manuel" ? (a, b) => a.ordre - b.ordre || b.created_at.localeCompare(a.created_at)
    : tri === "recent" ? (a, b) => b.created_at.localeCompare(a.created_at) : parEcheance);
}

/** Ordre d'une note deplacee juste avant « cible » (entre cible et sa voisine du dessus). */
export function ordreAvant(liste: Note[], cibleId: string, deplaceeId: string): number {
  const l = liste.filter((n) => n.id !== deplaceeId);
  const i = l.findIndex((n) => n.id === cibleId);
  if (i < 0) return 0;
  const apres = l[i].ordre;
  const avant = i > 0 ? l[i - 1].ordre : apres - 2;
  return (avant + apres) / 2;
}

/** Ordre d'une nouvelle note : tout en haut. */
export const ordreEnTete = (notes: Note[]) => (notes.length ? Math.min(...notes.map((n) => n.ordre)) - 1 : 0);

/** Notes « Réglé » depuis plus de 7 jours, a archiver par « Nettoyer ». */
export const aNettoyer = (notes: Note[], maintenant = Date.now()) =>
  notes.filter((n) => !n.archive && !n.supprime_le && n.statut === "done" && n.regle_le && Date.parse(n.regle_le) < maintenant - 7 * 86400000);
