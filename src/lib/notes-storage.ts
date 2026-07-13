export type NoteStatus = "todo" | "in_progress" | "waiting" | "done";
export type NotePriority = "low" | "medium" | "high";

export interface Note {
  id: string;
  text: string;
  category: string;
  status: NoteStatus;
  priority?: NotePriority;
  dueDate: string | null; // ISO date (yyyy-mm-dd)
  createdAt: number;
  completedAt?: number | null;
  archived: boolean;
  flash?: boolean;
}

export const DEFAULT_CATEGORY = "Général";

export const PRIORITY_LABEL: Record<NotePriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
};

export const PRIORITY_RANK: Record<NotePriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};


export const NOTES_KEY = "dp-notes-v1";
export const CATS_KEY = "dp-categories-v1";
export const CAT_COLORS_KEY = "dp-category-colors-v1";

const DEFAULT_CATS = ["Chantier 1", "Chantier 2", "Perso"];
export const UNCATEGORIZED = "Sans catégorie";

export const CATEGORY_PALETTE = [
  "#3b82f6", // blue
  "#f97316", // orange
  "#10b981", // emerald
  "#eab308", // yellow
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#ef4444", // red
  "#6366f1", // indigo
  "#84cc16", // lime
];

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

export function loadCategoryColors(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CAT_COLORS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveCategoryColors(colors: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CAT_COLORS_KEY, JSON.stringify(colors));
}

export function colorForCategory(name: string, colors: Record<string, string>): string {
  if (colors[name]) return colors[name];
  // deterministic fallback from name hash
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % CATEGORY_PALETTE.length;
  return CATEGORY_PALETTE[idx];
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
