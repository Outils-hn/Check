import { CATS_KEY, NOTES_KEY, Note } from "./notes-storage";

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  notes: Note[];
  categories: string[];
}

export function exportBackup() {
  const notes = localStorage.getItem(NOTES_KEY);
  const cats = localStorage.getItem(CATS_KEY);
  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    notes: notes ? JSON.parse(notes) : [],
    categories: cats ? JSON.parse(cats) : [],
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carnet-chantier-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importBackupFile(file: File): Promise<BackupPayload> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray(parsed.notes) ||
    !Array.isArray(parsed.categories)
  ) {
    throw new Error("Format de sauvegarde invalide");
  }
  return parsed as BackupPayload;
}
