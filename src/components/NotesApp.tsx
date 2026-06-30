import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATS_KEY,
  NOTES_KEY,
  Note,
  NoteStatus,
  STATUS_LABEL,
  UNCATEGORIZED,
  loadCategories,
  loadNotes,
  nextStatus,
  saveCategories,
  saveNotes,
} from "@/lib/notes-storage";
import { exportBackup, importBackupFile } from "@/lib/backup";
import { exportNotesPdf } from "@/lib/pdf-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  Check,
  Download,
  FileDown,
  FolderCog,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  Upload,
  X,
  AlertTriangle,
  Inbox,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StorageGauge } from "@/components/StorageGauge";

type SortKey = "created" | "due";
type StatusFilter = "all" | NoteStatus;

const STATUS_CLASSES: Record<NoteStatus, string> = {
  todo: "bg-status-todo text-status-todo-foreground hover:opacity-80",
  in_progress: "bg-status-progress text-status-progress-foreground hover:opacity-80",
  done: "bg-status-done text-status-done-foreground hover:opacity-80",
};

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDue(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dueState(iso: string | null): "none" | "ok" | "soon" | "late" {
  if (!iso) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "late";
  if (diff <= 2) return "soon";
  return "ok";
}

export default function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // form
  const [text, setText] = useState("");
  const [formCat, setFormCat] = useState<string>("");
  const [formStatus, setFormStatus] = useState<NoteStatus>("todo");
  const [formDue, setFormDue] = useState<string>("");

  // filters
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("created");
  const [showArchived, setShowArchived] = useState(false);

  // dialogs
  const [editing, setEditing] = useState<Note | null>(null);
  const [manageCats, setManageCats] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    notes: Note[];
    categories: string[];
  } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const c = loadCategories();
    setCats(c);
    setNotes(loadNotes());
    setFormCat(c[0] ?? "");
    setHydrated(true);
    const stored = (typeof window !== "undefined" && localStorage.getItem("check-theme")) as "dark" | "light" | null;
    const initial: "dark" | "light" = stored ?? (document.documentElement.classList.contains("dark") ? "dark" : "light");
    setTheme(initial);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem("check-theme", next); } catch {}
  }

  useEffect(() => {
    if (hydrated) saveNotes(notes);
  }, [notes, hydrated]);
  useEffect(() => {
    if (hydrated) saveCategories(cats);
  }, [cats, hydrated]);

  const allCatsForFilter = useMemo(() => {
    const set = new Set(cats);
    notes.forEach((n) => set.add(n.category));
    return Array.from(set);
  }, [cats, notes]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes
      .filter((n) => n.archived === showArchived)
      .filter((n) => (filterCat === "all" ? true : n.category === filterCat))
      .filter((n) => (filterStatus === "all" ? true : n.status === filterStatus))
      .filter((n) => (q ? n.text.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        if (sort === "created") return b.createdAt - a.createdAt;
        if (!a.dueDate && !b.dueDate) return b.createdAt - a.createdAt;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [notes, search, filterCat, filterStatus, sort, showArchived]);

  const stats = useMemo(() => {
    const active = notes.filter((n) => !n.archived);
    return {
      total: active.length,
      todo: active.filter((n) => n.status === "todo").length,
      in_progress: active.filter((n) => n.status === "in_progress").length,
      done: active.filter((n) => n.status === "done").length,
      late: active.filter(
        (n) => n.status !== "done" && dueState(n.dueDate) === "late",
      ).length,
    };
  }, [notes]);

  function addNote(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || !formCat) return;
    const n: Note = {
      id: uid(),
      text: t,
      category: formCat,
      status: formStatus,
      dueDate: formDue || null,
      createdAt: Date.now(),
      archived: false,
    };
    setNotes((p) => [n, ...p]);
    setText("");
    setFormDue("");
    setFormStatus("todo");
  }

  function cycleStatus(id: string) {
    setNotes((p) =>
      p.map((n) => (n.id === id ? { ...n, status: nextStatus(n.status) } : n)),
    );
  }
  function removeNote(id: string) {
    setNotes((p) => p.filter((n) => n.id !== id));
  }
  function toggleArchive(id: string) {
    setNotes((p) =>
      p.map((n) => (n.id === id ? { ...n, archived: !n.archived } : n)),
    );
  }
  function saveEdit(updated: Note) {
    setNotes((p) => p.map((n) => (n.id === updated.id ? updated : n)));
    setEditing(null);
  }

  function renameCategory(oldName: string, newName: string) {
    const v = newName.trim();
    if (!v || v === oldName) return;
    if (cats.includes(v)) {
      toast.error("Cette catégorie existe déjà");
      return;
    }
    setCats((p) => p.map((c) => (c === oldName ? v : c)));
    setNotes((p) =>
      p.map((n) => (n.category === oldName ? { ...n, category: v } : n)),
    );
    if (filterCat === oldName) setFilterCat(v);
    if (formCat === oldName) setFormCat(v);
    toast.success(`Catégorie renommée en "${v}"`);
  }

  function addCategoryName(name: string) {
    const v = name.trim();
    if (!v) return false;
    if (cats.includes(v)) {
      toast.error("Cette catégorie existe déjà");
      return false;
    }
    setCats((p) => [...p, v]);
    return true;
  }

  function deleteCategory(name: string, mode: "uncategorize" | "delete-notes") {
    if (mode === "delete-notes") {
      setNotes((p) => p.filter((n) => n.category !== name));
    } else {
      setNotes((p) =>
        p.map((n) =>
          n.category === name ? { ...n, category: UNCATEGORIZED } : n,
        ),
      );
    }
    setCats((p) => p.filter((c) => c !== name));
    if (filterCat === name) setFilterCat("all");
    if (formCat === name) {
      const remaining = cats.filter((c) => c !== name);
      setFormCat(remaining[0] ?? "");
    }
    toast.success(`Catégorie "${name}" supprimée`);
  }

  function handleExportBackup() {
    exportBackup();
    toast.success("Sauvegarde téléchargée");
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = await importBackupFile(file);
      setPendingImport({ notes: data.notes, categories: data.categories });
    } catch (err) {
      toast.error("Fichier invalide");
    }
  }

  function confirmImport() {
    if (!pendingImport) return;
    setNotes(pendingImport.notes);
    setCats(
      pendingImport.categories.length > 0
        ? pendingImport.categories
        : ["Perso"],
    );
    setFilterCat("all");
    setFormCat(pendingImport.categories[0] ?? "");
    // Also write raw to be safe
    localStorage.setItem(NOTES_KEY, JSON.stringify(pendingImport.notes));
    localStorage.setItem(CATS_KEY, JSON.stringify(pendingImport.categories));
    setPendingImport(null);
    toast.success("Sauvegarde restaurée");
  }

  function handleExportPdf() {
    if (visible.length === 0) {
      toast.error("Aucune note à exporter");
      return;
    }
    exportNotesPdf(visible);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* CHECK logo: rounded square with orange check */}
            <div className="relative size-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-soft">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary)" }}>
                <polyline points="4,13 10,19 20,5" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold leading-none tracking-tight">
                CHECK
              </h1>
              <p className="text-[11px] text-muted-foreground mt-1">
                Notes & tâches techniques
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground mr-2">
              <Badge variant="secondary">{stats.total} actives</Badge>
              {stats.late > 0 && (
                <Badge className="bg-destructive text-destructive-foreground">
                  <AlertTriangle className="size-3 mr-1" /> {stats.late} en retard
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 rounded-md border bg-background/60 px-1 py-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1.5 hidden sm:inline">
                Sauvegarde
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs"
                onClick={handleExportBackup}
                title="Exporter les données (.json)"
              >
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Exporter</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs"
                onClick={() => importInputRef.current?.click()}
                title="Importer une sauvegarde (.json)"
              >
                <Upload className="size-3.5" />
                <span className="hidden sm:inline">Importer</span>
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportFile}
              />
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded-lg border border-border"
              onClick={toggleTheme}
              title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
              aria-label="Basculer le thème"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Sidebar / Form */}
        <aside className="space-y-4">
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-xs font-semibold mb-3 flex items-center gap-2 uppercase tracking-[0.15em] text-muted-foreground">
              <Plus className="size-3.5" /> Nouvelle note
            </h2>
            <form onSubmit={addNote} className="space-y-3">
              <Textarea
                placeholder="Ex. Vérifier cotes plan RDC bâtiment A…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={formCat} onValueChange={setFormCat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={formStatus}
                  onValueChange={(v) => setFormStatus(v as NoteStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">À faire</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="done">Réglé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={formDue}
                  onChange={(e) => setFormDue(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={!text.trim()}>
                Ajouter
              </Button>
            </form>
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Catégories</h2>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 gap-1 text-xs"
                onClick={() => setManageCats(true)}
              >
                <FolderCog className="size-3.5" />
                Gérer
              </Button>
            </div>
            <ul className="space-y-1">
              {cats.map((c) => {
                const count = notes.filter(
                  (n) => !n.archived && n.category === c,
                ).length;
                return (
                  <li
                    key={c}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary/70" />
                      {c}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-sm grid grid-cols-3 gap-2 text-center">
            <StatCard label="À faire" value={stats.todo} tone="todo" />
            <StatCard label="En cours" value={stats.in_progress} tone="progress" />
            <StatCard label="Réglé" value={stats.done} tone="done" />
          </section>

          <StorageGauge deps={[notes, cats]} />
        </aside>

        {/* Notes list */}
        <section className="space-y-4 min-w-0">
          <div className="rounded-xl border bg-card p-3 shadow-sm flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher une note…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {allCatsForFilter.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as StatusFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="todo">À faire</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="done">Réglé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Tri : récent</SelectItem>
                <SelectItem value="due">Tri : échéance</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived((p) => !p)}
              className="gap-1"
            >
              <Archive className="size-4" />
              {showArchived ? "Archivées" : "Actives"}
            </Button>
            <Button
              size="sm"
              onClick={handleExportPdf}
              className="gap-1 ml-auto bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-[0.1em] text-xs"
              title="Exporter les notes affichées en PDF"
            >
              <FileDown className="size-4" />
              Exporter PDF
            </Button>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-12 text-center text-muted-foreground">
              <Inbox className="size-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {showArchived
                  ? "Aucune note archivée."
                  : "Aucune note. Ajoutez-en une depuis le formulaire."}
              </p>
            </div>
          ) : (
            <ul className="rounded-xl border bg-card shadow-sm divide-y overflow-hidden">
              {visible.map((n) => (
                <NoteRow
                  key={n.id}
                  note={n}
                  onCycle={() => cycleStatus(n.id)}
                  onEdit={() => setEditing(n)}
                  onDelete={() => removeNote(n.id)}
                  onArchive={() => toggleArchive(n.id)}
                />
              ))}
            </ul>

          )}
        </section>
      </main>

      {editing && (
        <EditDialog
          note={editing}
          cats={cats}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}

      <CategoryManagerDialog
        open={manageCats}
        onOpenChange={setManageCats}
        cats={cats}
        notes={notes}
        onAdd={addCategoryName}
        onRename={renameCategory}
        onDelete={deleteCategory}
      />

      <AlertDialog
        open={!!pendingImport}
        onOpenChange={(o) => !o && setPendingImport(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurer la sauvegarde ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va <strong>écraser toutes les données actuelles</strong>{" "}
              ({notes.length} note(s), {cats.length} catégorie(s)) et les
              remplacer par le contenu du fichier ({pendingImport?.notes.length}{" "}
              note(s), {pendingImport?.categories.length} catégorie(s)). Cette
              opération est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>
              Restaurer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "todo" | "progress" | "done";
}) {
  const dot =
    tone === "todo"
      ? "bg-status-todo"
      : tone === "progress"
        ? "bg-status-progress"
        : "bg-status-done";
  return (
    <div className="rounded-lg border bg-background/50 p-2">
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <span className={cn("size-2 rounded-full", dot)} />
        {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function NoteRow({
  note,
  onCycle,
  onEdit,
  onDelete,
  onArchive,
}: {
  note: Note;
  onCycle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
}) {
  const due = dueState(note.dueDate);
  const overdue = due === "late" && note.status !== "done";
  const soon = due === "soon" && note.status !== "done";

  return (
    <li
      className={cn(
        "group relative flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 px-3 py-2 text-sm transition-colors hover:bg-accent/60 border-l-2 border-transparent hover:border-l-[var(--accent-laser)]",
        overdue && "bg-destructive/10",
        note.status === "done" && "opacity-70",
      )}
    >
      {/* Category — fixed width column */}
      <div className="w-full sm:w-[150px] sm:shrink-0 flex sm:justify-start">
        <span
          className="inline-flex max-w-full items-center bg-background/60 text-foreground/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] border border-border truncate"
          title={note.category}
        >
          {note.category}
        </span>
      </div>

      {/* Status — fixed width column, centered */}
      <div className="w-[120px] shrink-0 flex justify-center">
        <button
          onClick={onCycle}
          className={cn(
            "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition rounded-none",
            STATUS_CLASSES[note.status],
          )}
          title="Cliquer pour changer de statut"
        >
          {STATUS_LABEL[note.status]}
        </button>
      </div>

      {/* Note text — flex-1 */}
      <p
        className={cn(
          "flex-1 min-w-0 truncate sm:whitespace-normal sm:break-words basis-full sm:basis-auto order-last sm:order-none",
          note.status === "done" && "line-through text-muted-foreground",
        )}
        title={note.text}
      >
        {note.text}
      </p>

      {/* Date — discreet, fixed width */}
      <span
        className={cn(
          "shrink-0 sm:w-[110px] inline-flex items-center justify-end gap-1 text-[11px] text-muted-foreground tabular-nums",
          overdue && "text-destructive font-medium",
          soon && "text-warning font-medium",
        )}
      >
        <CalendarDays className="size-3" />
        {note.dueDate ? fmtDue(note.dueDate) : fmtDate(note.createdAt)}
      </span>


      {/* Actions — right */}
      <div className="shrink-0 flex items-center gap-0.5 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEdit} title="Modifier">
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={onArchive}
          title={note.archived ? "Désarchiver" : "Archiver"}
        >
          {note.archived ? (
            <ArchiveRestore className="size-3.5" />
          ) : (
            <Archive className="size-3.5" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={onDelete}
          title="Supprimer"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </li>
  );
}


function EditDialog({
  note,
  cats,
  onClose,
  onSave,
}: {
  note: Note;
  cats: string[];
  onClose: () => void;
  onSave: (n: Note) => void;
}) {
  const [text, setText] = useState(note.text);
  const [cat, setCat] = useState(note.category);
  const [status, setStatus] = useState<NoteStatus>(note.status);
  const [due, setDue] = useState(note.dueDate ?? "");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la note</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cats.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as NoteStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">À faire</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="done">Réglé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={() =>
              onSave({
                ...note,
                text: text.trim() || note.text,
                category: cat,
                status,
                dueDate: due || null,
              })
            }
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryManagerDialog({
  open,
  onOpenChange,
  cats,
  notes,
  onAdd,
  onRename,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cats: string[];
  notes: Note[];
  onAdd: (name: string) => boolean;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string, mode: "uncategorize" | "delete-notes") => void;
}) {
  const [newCat, setNewCat] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] =
    useState<"uncategorize" | "delete-notes">("uncategorize");

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    notes.forEach((n) => {
      m[n.category] = (m[n.category] ?? 0) + 1;
    });
    return m;
  }, [notes]);

  function handleAdd() {
    if (onAdd(newCat)) setNewCat("");
  }

  function startEdit(c: string) {
    setEditingCat(c);
    setEditValue(c);
  }

  function commitEdit() {
    if (editingCat) onRename(editingCat, editValue);
    setEditingCat(null);
  }

  const deletingCount = deleting ? counts[deleting] ?? 0 : 0;
  const canDelete = cats.length > 1; // keep at least one

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-4" /> Gérer les catégories
            </DialogTitle>
            <DialogDescription>
              Renommez ou supprimez vos catégories. Les notes associées seront
              mises à jour automatiquement.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Input
              placeholder="Nouvelle catégorie"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={!newCat.trim()}>
              <Plus className="size-4" />
            </Button>
          </div>

          <ul className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
            {cats.map((c) => {
              const count = counts[c] ?? 0;
              const isEditing = editingCat === c;
              return (
                <li
                  key={c}
                  className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5"
                >
                  {isEditing ? (
                    <>
                      <Input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") setEditingCat(null);
                        }}
                        className="h-8"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={commitEdit}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => setEditingCat(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm flex items-center gap-2">
                        <span className="size-2 rounded-full bg-primary/70" />
                        {c}
                        <span className="text-xs text-muted-foreground">
                          {count} note{count > 1 ? "s" : ""}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => startEdit(c)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleting(c);
                          setDeleteMode("uncategorize");
                        }}
                        disabled={!canDelete}
                        title={
                          !canDelete
                            ? "Impossible : il doit rester au moins une catégorie"
                            : "Supprimer la catégorie"
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer la catégorie « {deleting} » ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCount > 0
                ? `${deletingCount} note(s) sont associées à cette catégorie. Choisissez ce qu'il faut en faire :`
                : "Aucune note n'est associée à cette catégorie."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deletingCount > 0 && (
            <div className="space-y-2 py-2">
              <label className="flex items-start gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent">
                <input
                  type="radio"
                  name="del-mode"
                  className="mt-1"
                  checked={deleteMode === "uncategorize"}
                  onChange={() => setDeleteMode("uncategorize")}
                />
                <span className="text-sm">
                  <strong>Conserver les notes</strong> — les basculer vers «{" "}
                  {UNCATEGORIZED} »
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent">
                <input
                  type="radio"
                  name="del-mode"
                  className="mt-1"
                  checked={deleteMode === "delete-notes"}
                  onChange={() => setDeleteMode("delete-notes")}
                />
                <span className="text-sm">
                  <strong className="text-destructive">
                    Supprimer aussi les notes
                  </strong>{" "}
                  — action irréversible
                </span>
              </label>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) onDelete(deleting, deleteMode);
                setDeleting(null);
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
