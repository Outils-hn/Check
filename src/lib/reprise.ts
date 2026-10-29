// Reprise des notes de l'ancienne version (stockees dans ce navigateur) et sauvegardes JSON.
import type { Note, Projet, Statut } from "@/lib/notes";
import { STATUTS } from "@/lib/notes";

export const ANCIENNES_NOTES = "dp-notes-v1";
export const ANCIENNES_CATEGORIES = "dp-categories-v1";
export const REPRISE_FAITE = "check-reprise-faite";

type Ancienne = { id?: string; text?: string; category?: string; status?: string; dueDate?: string | null; createdAt?: number; completedAt?: number | null; archived?: boolean; flash?: boolean };

/** Une note a creer dans la base : son projet est designe par son nom (ou null = perso). */
export type NoteAImporter = { projet: string | null; texte: string; statut: Statut; echeance: string | null; flash: boolean; archive: boolean; created_at: string; regle_le: string | null };

export function lireAnciennes(raw: string | null): { categories: string[]; notes: NoteAImporter[] } {
  let liste: Ancienne[] = [];
  try { const p = JSON.parse(raw ?? "[]"); if (Array.isArray(p)) liste = p; } catch { /* donnees illisibles */ }
  const notes = liste.filter((n) => String(n?.text ?? "").trim()).map((n) => ({
    projet: String(n.category ?? "").trim() || null,
    texte: String(n.text).trim().slice(0, 4000),
    statut: (STATUTS as string[]).includes(String(n.status)) ? (n.status as Statut) : "todo",
    echeance: /^\d{4}-\d{2}-\d{2}$/.test(String(n.dueDate ?? "")) ? (n.dueDate as string) : null,
    flash: !!n.flash, archive: !!n.archived,
    created_at: new Date(Number.isFinite(n.createdAt) ? (n.createdAt as number) : Date.now()).toISOString(),
    regle_le: n.status === "done" && n.completedAt ? new Date(n.completedAt).toISOString() : null,
  }));
  const categories = [...new Set(notes.map((n) => n.projet).filter((c): c is string => !!c))];
  return { categories, notes };
}

/** Choix par categorie : « perso » (notes perso) ou le nom du projet a creer / reutiliser. */
export type Choix = Record<string, { mode: "perso" } | { mode: "projet"; nom: string }>;
export const choixParDefaut = (categories: string[]): Choix =>
  Object.fromEntries(categories.map((c) => [c, /^perso/i.test(c) ? { mode: "perso" } : { mode: "projet", nom: c }]));

/** Sauvegarde JSON : projets (noms) et notes visibles par ce compte. */
export type Sauvegarde = { app: "check"; version: 2; le: string; projets: Pick<Projet, "nom" | "numero">[]; notes: (NoteAImporter & { id: string })[] };

export function exporter(projets: Projet[], notes: Note[], maintenant = new Date()): Sauvegarde {
  const nom = new Map(projets.map((p) => [p.id, p.nom]));
  return {
    app: "check", version: 2, le: maintenant.toISOString(),
    projets: projets.map((p) => ({ nom: p.nom, numero: p.numero })),
    notes: notes.filter((n) => !n.supprime_le).map((n) => ({
      id: n.id, projet: n.projet_id ? nom.get(n.projet_id) ?? null : null, texte: n.texte, statut: n.statut, echeance: n.echeance,
      flash: n.flash, archive: n.archive, created_at: n.created_at, regle_le: n.regle_le,
    })),
  };
}

/** Import fusionne : les notes deja presentes (meme identifiant) sont ignorees, rien n'est ecrase. */
export function planImport(p: unknown, existantes: Note[]): { erreur?: string; projets: string[]; notes: NoteAImporter[] } {
  if (!p || typeof p !== "object") return { erreur: "Fichier illisible.", projets: [], notes: [] };
  const o = p as { app?: string; notes?: unknown; version?: number };
  // Ancienne sauvegarde (v1, sans « app ») : meme format que le stockage du navigateur
  if (!o.app && Array.isArray(o.notes)) {
    const a = lireAnciennes(JSON.stringify(o.notes));
    return { projets: a.categories, notes: a.notes };
  }
  if (o.app !== "check" || !Array.isArray(o.notes)) return { erreur: "Ce fichier n'est pas une sauvegarde Check.", projets: [], notes: [] };
  const deja = new Set(existantes.map((n) => n.id));
  const notes = (o.notes as (NoteAImporter & { id: string })[]).filter((n) => n && !deja.has(n.id) && String(n.texte ?? "").trim())
    .map(({ id: _id, ...n }) => ({ ...n, statut: (STATUTS as string[]).includes(n.statut) ? n.statut : "todo" }));
  return { projets: [...new Set(notes.map((n) => n.projet).filter((x): x is string => !!x))], notes };
}
