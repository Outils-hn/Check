// Carnet d'essai : sans compte, 5 notes gardees sur ce poste (navigateur) pour decouvrir Check.
// Format identique aux anciennes notes du navigateur : a la premiere connexion, la fenetre de reprise
// existante les propose a l'import dans la base.
import type { Statut } from "@/lib/notes";
import { STATUTS } from "@/lib/notes";

export const CLE_INVITE = "check-notes-invite";
export const MAX_INVITE = 5;
export const MAX_TEXTE_INVITE = 4000;

export type NoteInvite = { id: string; text: string; category: string; status: Statut; dueDate: string | null; createdAt: number; completedAt: number | null; archived: boolean };

export function lireInvite(raw: string | null): NoteInvite[] {
  let liste: unknown = [];
  try { liste = JSON.parse(raw ?? "[]"); } catch { /* illisible */ }
  if (!Array.isArray(liste)) return [];
  return liste
    .filter((n): n is NoteInvite => !!n && typeof n.text === "string" && n.text.trim() !== "")
    .map((n) => ({ ...n, category: "", archived: false, status: (STATUTS as string[]).includes(n.status) ? n.status : "todo", dueDate: n.dueDate ?? null, completedAt: n.completedAt ?? null }))
    .slice(0, MAX_INVITE);
}

export const peutAjouter = (notes: NoteInvite[]) => notes.length < MAX_INVITE;

export function ajouterInvite(notes: NoteInvite[], texte: string, maintenant = Date.now()): NoteInvite[] {
  const t = texte.trim().slice(0, MAX_TEXTE_INVITE);
  if (!t || !peutAjouter(notes)) return notes;
  return [{ id: `i${maintenant.toString(36)}${Math.random().toString(36).slice(2, 6)}`, text: t, category: "", status: "todo", dueDate: null, createdAt: maintenant, completedAt: null, archived: false }, ...notes];
}

export function changerStatutInvite(notes: NoteInvite[], id: string, statut: Statut, maintenant = Date.now()): NoteInvite[] {
  return notes.map((n) => (n.id === id ? { ...n, status: statut, completedAt: statut === "done" ? maintenant : null } : n));
}
export const modifierTexteInvite = (notes: NoteInvite[], id: string, texte: string): NoteInvite[] =>
  notes.map((n) => (n.id === id && texte.trim() ? { ...n, text: texte.trim().slice(0, MAX_TEXTE_INVITE) } : n));
export const supprimerInvite = (notes: NoteInvite[], id: string): NoteInvite[] => notes.filter((n) => n.id !== id);
