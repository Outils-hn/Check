// Logique des notes (sans base ni affichage) : types, recherche, filtres, tri, echeances.

export type Statut = "todo" | "in_progress" | "waiting" | "done";
export type Note = {
  id: string; projet_id: string | null; auteur: string; pour: string | null;
  texte: string; statut: Statut; echeance: string | null; flash: boolean; archive: boolean;
  ordre: number; atelier?: boolean; tache?: string | null; tache_nom?: string | null; images?: string[]; reponse: string | null; regle_le: string | null; supprime_le: string | null; created_at: string; updated_at?: string;
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

export type Vue = "aujourdhui" | "actives" | "pour-moi" | "archivees" | "corbeille";
export type Tri = "manuel" | "recent" | "echeance";
export type Filtres = { vue: Vue; projets: string[]; statut: Statut | "tous"; q: string; tri: Tri; avecReponse?: boolean };
/** Identifiant de la boite « Perso » dans les filtres de projets. */
export const PERSO = "__perso__";

/** Reponse affichee : seulement quand la note est reglee (elle est gardee si on la rouvre). */
export const reponseDe = (n: Pick<Note, "statut" | "reponse">) => (n.statut === "done" ? n.reponse?.trim() ?? "" : "");

/** Date locale du jour au format AAAA-MM-JJ. */
export const jourIso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** « Aujourd'hui » : pas reglee, et (confiee a moi, ou echeance aujourd'hui / depassee). */
export const pourAujourdhui = (n: Pick<Note, "statut" | "pour" | "echeance">, moi: string, jour = jourIso()) =>
  n.statut !== "done" && (n.pour === moi || (!!n.echeance && n.echeance <= jour));

/** Cherche « #mot » dans le texte : si le mot designe un projet (nom ou numero, sans accents), on le retire du texte et on rend le projet. */
export function projetDepuisTexte(texte: string, projets: Projet[]): { texte: string; projetId: string | null } {
  for (const m of texte.matchAll(/(^|\s)#([^\s#]+)/g)) {
    const mot = sansAccents(m[2]);
    const p = projets.find((x) => sansAccents(x.numero) === mot) ?? projets.find((x) => sansAccents(x.nom).replace(/\s+/g, "").startsWith(mot) || sansAccents(x.nom).split(/\s+/).includes(mot));
    if (p) return { texte: texte.replace(m[0], m[1]).replace(/\s{2,}/g, " ").trim(), projetId: p.id };
  }
  return { texte, projetId: null };
}

export function filtrer(notes: Note[], f: Filtres, moi: string, nomDe: (id: string | null) => string): Note[] {
  const mots = sansAccents(f.q).split(/\s+/).filter(Boolean);
  const res = notes.filter((n) => {
    if (n.atelier) return false; // les questions de tache vivent dans « Questions Tâches »
    if (f.vue === "corbeille") { if (!n.supprime_le) return false; }
    else {
      if (n.supprime_le) return false;
      if (f.vue === "archivees" ? !n.archive : n.archive) return false;
      if (f.vue === "pour-moi" && (n.pour !== moi || n.statut === "done")) return false;
      if (f.vue === "aujourdhui" && !pourAujourdhui(n, moi)) return false;
    }
    if (f.projets.length && !f.projets.includes(n.projet_id ?? PERSO)) return false;
    if (f.statut !== "tous" && n.statut !== f.statut) return false;
    if (f.avecReponse && !reponseDe(n)) return false;
    if (mots.length) {
      const t = sansAccents(`${n.texte} ${reponseDe(n)} ${nomDe(n.projet_id)}`);
      if (!mots.every((m) => t.includes(m))) return false;
    }
    return true;
  });
  const parEcheance = (a: Note, b: Note) =>
    !a.echeance && !b.echeance ? b.created_at.localeCompare(a.created_at) : !a.echeance ? 1 : !b.echeance ? -1 : a.echeance.localeCompare(b.echeance);
  const tri = f.vue === "pour-moi" || f.vue === "aujourdhui" ? "echeance" : f.tri;
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
  notes.filter((n) => !n.atelier && !n.archive && !n.supprime_le && n.statut === "done" && n.regle_le && Date.parse(n.regle_le) < maintenant - 7 * 86400000);

/** Nombre de jours de retard d'une echeance (0 si pas en retard). */
export function joursRetard(echeance: string | null, jour = jourIso()): number {
  if (!echeance || echeance >= jour) return 0;
  const a = Date.UTC(+echeance.slice(0, 4), +echeance.slice(5, 7) - 1, +echeance.slice(8, 10));
  const b = Date.UTC(+jour.slice(0, 4), +jour.slice(5, 7) - 1, +jour.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** Question « a demander a l'atelier » : une note de projet marquee Atelier, rangee sous un numero de tache. */
export type GroupeAtelier = { cle: string; projet_id: string; tache: string; nom: string; enAttente: Note[]; reglees: Note[] };

/** Questions de l'atelier regroupees par projet puis par tache ; les taches avec des questions en attente passent d'abord. */
export function groupesAtelier(notes: Note[], nomDe: (id: string | null) => string): GroupeAtelier[] {
  const m = new Map<string, GroupeAtelier>();
  for (const n of notes) {
    if (!n.atelier || !n.projet_id || n.supprime_le || n.archive) continue;
    const tache = (n.tache ?? "").trim();
    const cle = `${n.projet_id}|${sansAccents(tache)}`;
    const g = m.get(cle) ?? { cle, projet_id: n.projet_id, tache, nom: "", enAttente: [], reglees: [] };
    (n.statut === "done" ? g.reglees : g.enAttente).push(n);
    if (!g.nom && n.tache_nom?.trim()) g.nom = n.tache_nom.trim(); // le nom est repete sur chaque question de la tache
    m.set(cle, g);
  }
  const parAncien = (a: Note, b: Note) => a.created_at.localeCompare(b.created_at);
  const l = [...m.values()];
  for (const g of l) { g.enAttente.sort(parAncien); g.reglees.sort((a, b) => b.created_at.localeCompare(a.created_at)); }
  return l.sort((a, b) => (+!a.enAttente.length - +!b.enAttente.length) || nomDe(a.projet_id).localeCompare(nomDe(b.projet_id), "fr") || a.tache.localeCompare(b.tache, "fr", { numeric: true }));
}

/** Nombre de questions encore sans reponse (pour la pastille de l'onglet). */
export const nbQuestionsAtelier = (notes: Note[]) => notes.filter((n) => n.atelier && n.projet_id && !n.supprime_le && !n.archive && n.statut !== "done").length;
