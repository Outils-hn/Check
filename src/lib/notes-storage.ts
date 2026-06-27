export type NoteStatus = "todo" | "in_progress" | "done";

export interface Note {
  id: string;
  text: string;
  category: string;
  status: NoteStatus;
  dueDate: string | null; // ISO date (yyyy-mm-dd)
  createdAt: number;
  archived: boolean;
}

export const NOTES_KEY = "dp-notes-v1";
export const CATS_KEY = "dp-categories-v1";

const DEFAULT_CATS = ["Chantier 1", "Chantier 2", "Perso"];
export const UNCATEGORIZED = "Sans catégorie";

export function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch {
    return [];
  }
}

export function saveNotes(notes: Note[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function loadCategories(): string[] {
  if (typeof window === "undefined") return DEFAULT_CATS;
  try {
    const raw = localStorage.getItem(CATS_KEY);
    if (!raw) return DEFAULT_CATS;
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATS;
  } catch {
    return DEFAULT_CATS;
  }
}

export function saveCategories(cats: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CATS_KEY, JSON.stringify(cats));
}

export const STATUS_LABEL: Record<NoteStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Réglé",
};

export const STATUS_ORDER: NoteStatus[] = ["todo", "in_progress", "done"];

export function nextStatus(s: NoteStatus): NoteStatus {
  const i = STATUS_ORDER.indexOf(s);
  return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
}
