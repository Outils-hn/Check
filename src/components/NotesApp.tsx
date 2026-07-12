import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATS_KEY,
  CAT_COLORS_KEY,
  CATEGORY_PALETTE,
  NOTES_KEY,
  Note,
  NotePriority,
  NoteStatus,
  PRIORITY_LABEL,
  PRIORITY_RANK,
  STATUS_LABEL,
  UNCATEGORIZED,
  colorForCategory,
  hexToRgba,
  loadCategories,
  loadCategoryColors,
  loadNotes,
  nextStatus,
  saveCategories,
  saveCategoryColors,
  saveNotes,
} from "@/lib/notes-storage";
import { exportBackup, importBackupFile } from "@/lib/backup";
import { exportNotesPdf } from "@/lib/pdf-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  GripVertical,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  Upload,
  X,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StorageGauge } from "@/components/StorageGauge";
import { ThemeToggle } from "@/components/ThemeToggle";

type SortKey = "manual" | "created" | "due" | "priority";
type StatusFilter = "all" | NoteStatus;

const STATUS_CLASSES: Record<NoteStatus, string> = {
  todo: "bg-status-todo text-status-todo-foreground hover:bg-status-todo/90",
  in_progress: "bg-status-progress text-status-progress-foreground hover:bg-status-progress/90",
  done: "bg-status-done text-status-done-foreground hover:bg-status-done/90",
};

const PRIORITY_STYLES: Record<NotePriority, { badge: string; mark: string }> = {
  high: {
    badge: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    mark: "!!!",
  },
  medium: {
    badge: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    mark: "!!",
  },
  low: {
    badge: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
    mark: "!",
  },
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
  const [catColors, setCatColors] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  // form
  const [text, setText] = useState("");
  const [formCat, setFormCat] = useState<string>("");
  const [formStatus, setFormStatus] = useState<NoteStatus>("todo");
  const [formPriority, setFormPriority] = useState<NotePriority>("medium");
  const [formDue, setFormDue] = useState<string>("");

  // filters
  const [search, setSearch] = useState("");
  const [filterCats, setFilterCats] = useState<string[]>([]); // empty = all
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("manual");
  const [showArchived, setShowArchived] = useState(false);

  // drag & drop
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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
    setCatColors(loadCategoryColors());
    setFormCat(c[0] ?? "");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveNotes(notes);
  }, [notes, hydrated]);
  useEffect(() => {
    if (hydrated) saveCategories(cats);
  }, [cats, hydrated]);
  useEffect(() => {
    if (hydrated) saveCategoryColors(catColors);
  }, [catColors, hydrated]);

  const allCatsForFilter = useMemo(() => {
    const set = new Set(cats);
    notes.forEach((n) => set.add(n.category));
    return Array.from(set);
  }, [cats, notes]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = notes
      .map((n, idx) => ({ n, idx }))
      .filter(({ n }) => n.archived === showArchived)
      .filter(({ n }) => (filterCats.length === 0 ? true : filterCats.includes(n.category)))
      .filter(({ n }) => (filterStatus === "all" ? true : n.status === filterStatus))
      .filter(({ n }) => (q ? n.text.toLowerCase().includes(q) : true));

    filtered.sort((a, b) => {
      if (sort === "manual") return a.idx - b.idx;
      if (sort === "created") return b.n.createdAt - a.n.createdAt;
      if (sort === "priority") {
        const pa = PRIORITY_RANK[a.n.priority ?? "medium"];
        const pb = PRIORITY_RANK[b.n.priority ?? "medium"];
        if (pa !== pb) return pa - pb;
        return b.n.createdAt - a.n.createdAt;
      }
      // due
      if (!a.n.dueDate && !b.n.dueDate) return b.n.createdAt - a.n.createdAt;
      if (!a.n.dueDate) return 1;
      if (!b.n.dueDate) return -1;
      return a.n.dueDate.localeCompare(b.n.dueDate);
    });
    return filtered.map(({ n }) => n);
  }, [notes, search, filterCats, filterStatus, sort, showArchived]);

  const stats = useMemo(() => {
    const active = notes.filter((n) => !n.archived);
    return {
      total: active.length,
      todo: active.filter((n) => n.status === "todo").length,
      in_progress: active.filter((n) => n.status === "in_progress").length,
      done: active.filter((n) => n.status === "done").length,
      late: active.filter((n) => n.status !== "done" && dueState(n.dueDate) === "late").length,
    };
  }, [notes]);

  function ensureCategoryColor(name: string) {
    setCatColors((prev) => {
      if (prev[name]) return prev;
      const used = new Set(Object.values(prev));
      const next = CATEGORY_PALETTE.find((c) => !used.has(c)) ?? CATEGORY_PALETTE[Object.keys(prev).length % CATEGORY_PALETTE.length];
      return { ...prev, [name]: next };
    });
  }

  function addNote(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || !formCat) return;
    const n: Note = {
      id: uid(),
      text: t,
      category: formCat,
      status: formStatus,
      priority: formPriority,
      dueDate: formDue || null,
      createdAt: Date.now(),
      completedAt: formStatus === "done" ? Date.now() : null,
      archived: false,
    };
    setNotes((p) => [n, ...p]);
    setText("");
    setFormDue("");
    setFormStatus("todo");
    setFormPriority("medium");
  }

  function cycleStatus(id: string) {
    setNotes((p) =>
      p.map((n) => {
        if (n.id !== id) return n;
        const ns = nextStatus(n.status);
        return { ...n, status: ns, completedAt: ns === "done" ? Date.now() : null };
      }),
    );
  }
  function removeNote(id: string) {
    setNotes((p) => p.filter((n) => n.id !== id));
  }
  function toggleArchive(id: string) {
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, archived: !n.archived } : n)));
  }
  function saveEdit(updated: Note) {
    setNotes((p) =>
      p.map((n) => {
        if (n.id !== updated.id) return n;
        let completedAt = n.completedAt ?? null;
        if (updated.status === "done" && n.status !== "done") completedAt = Date.now();
        else if (updated.status !== "done") completedAt = null;
        return { ...updated, completedAt };
      }),
    );
    setEditing(null);
  }

  function moveNote(fromId: string, toId: string) {
    if (fromId === toId) return;
    setNotes((p) => {
      const from = p.findIndex((n) => n.id === fromId);
      const to = p.findIndex((n) => n.id === toId);
      if (from < 0 || to < 0) return p;
      const copy = [...p];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }

  function renameCategory(oldName: string, newName: string) {
    const v = newName.trim();
    if (!v || v === oldName) return;
    if (cats.includes(v)) {
      toast.error("Cette catégorie existe déjà");
      return;
    }
    setCats((p) => p.map((c) => (c === oldName ? v : c)));
    setNotes((p) => p.map((n) => (n.category === oldName ? { ...n, category: v } : n)));
    setCatColors((prev) => {
      const { [oldName]: c, ...rest } = prev;
      return c ? { ...rest, [v]: c } : rest;
    });
    setFilterCats((p) => p.map((c) => (c === oldName ? v : c)));
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
    ensureCategoryColor(v);
    return true;
  }

  function setCategoryColor(name: string, color: string) {
    setCatColors((p) => ({ ...p, [name]: color }));
  }

  function deleteCategory(name: string, mode: "uncategorize" | "delete-notes") {
    if (mode === "delete-notes") {
      setNotes((p) => p.filter((n) => n.category !== name));
    } else {
      setNotes((p) => p.map((n) => (n.category === name ? { ...n, category: UNCATEGORIZED } : n)));
    }
    setCats((p) => p.filter((c) => c !== name));
    setCatColors((prev) => {
      const { [name]: _, ...rest } = prev;
      return rest;
    });
    setFilterCats((p) => p.filter((c) => c !== name));
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
    setCats(pendingImport.categories.length > 0 ? pendingImport.categories : ["Perso"]);
    setFilterCats([]);
    setFormCat(pendingImport.categories[0] ?? "");
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

  // Sync filter with top select — single-cat semantics
  const topSelectValue = filterCats.length === 0 ? "all" : filterCats.length === 1 ? filterCats[0] : "__multi__";

  function onTopSelectChange(v: string) {
    if (v === "all") setFilterCats([]);
    else if (v === "__multi__") return;
    else setFilterCats([v]);
  }

  function onSidebarCategoryClick(cat: string, e: React.MouseEvent) {
    const multi = e.ctrlKey || e.metaKey;
    setFilterCats((prev) => {
      if (multi) {
        return prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat];
      }
      // single click: if it's the only selected -> clear (all); else set to just this
      if (prev.length === 1 && prev[0] === cat) return [];
      return [cat];
    });
  }

  function onSidebarCategoryCheck(cat: string, checked: boolean) {
    setFilterCats((prev) => {
      if (checked) return prev.includes(cat) ? prev : [...prev, cat];
      return prev.filter((c) => c !== cat);
    });
  }

  const dndActive = sort === "manual" && !search.trim() && filterStatus === "all";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white dark:bg-slate-100 border border-border shadow-sm grid place-items-center">
              <Check className="size-6 text-[#ff6a1a]" strokeWidth={3} />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold uppercase tracking-[0.22em] text-foreground">Check</h1>
              <p className="text-xs text-muted-foreground">Notes &amp; tâches techniques</p>
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
            <ThemeToggle />
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
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Sidebar / Form */}
        <aside className="space-y-4">
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Plus className="size-4" /> Nouvelle note
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
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as NoteStatus)}>
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
                <Input type="date" value={formDue} onChange={(e) => setFormDue(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={!text.trim()}>
                Ajouter
              </Button>
            </form>
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Catégories</h2>
              <div className="flex items-center gap-1">
                {filterCats.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 gap-1 text-xs"
                    onClick={() => setFilterCats([])}
                    title="Réinitialiser le filtre"
                  >
                    <X className="size-3.5" /> Tout
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={() => setManageCats(true)}>
                  <FolderCog className="size-3.5" />
                  Gérer
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              Clic pour filtrer · Ctrl/⌘ + clic ou cases pour cumuler
            </p>
            <ul className="space-y-1">
              {cats.map((c) => {
                const count = notes.filter((n) => !n.archived && n.category === c).length;
                const selected = filterCats.includes(c);
                const color = colorForCategory(c, catColors);
                return (
                  <li
                    key={c}
                    onClick={(e) => onSidebarCategoryClick(c, e)}
                    className={cn(
                      "flex items-center justify-between rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
                      selected ? "bg-accent" : "hover:bg-accent/60",
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(v) => onSidebarCategoryCheck(c, !!v)}
                        onClick={(e) => e.stopPropagation()}
                        className="size-3.5"
                      />
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate">{c}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{count}</span>
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

          <StorageGauge deps={[notes, cats, catColors]} />
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
            <Select value={topSelectValue} onValueChange={onTopSelectChange}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {filterCats.length > 1 && (
                  <SelectItem value="__multi__" disabled>
                    {filterCats.length} sélectionnées
                  </SelectItem>
                )}
                {allCatsForFilter.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as StatusFilter)}>
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
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Tri : manuel</SelectItem>
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
              className="gap-1 ml-auto bg-slate-800 hover:bg-slate-900 text-white"
              title="Exporter les notes affichées en PDF"
            >
              <FileDown className="size-4" />
              Exporter en PDF
            </Button>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-12 text-center text-muted-foreground">
              <Inbox className="size-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {showArchived ? "Aucune note archivée." : "Aucune note. Ajoutez-en une depuis le formulaire."}
              </p>
            </div>
          ) : (
            <ul className="rounded-xl border bg-card shadow-sm divide-y overflow-hidden">
              {visible.map((n) => (
                <NoteRow
                  key={n.id}
                  note={n}
                  categoryColor={colorForCategory(n.category, catColors)}
                  dndActive={dndActive}
                  isDragging={dragId === n.id}
                  isDragOver={dragOverId === n.id && dragId !== n.id}
                  onDragStart={() => setDragId(n.id)}
                  onDragEnterRow={() => dragId && setDragOverId(n.id)}
                  onDragEndRow={() => {
                    setDragId(null);
                    setDragOverId(null);
                  }}
                  onDropRow={() => {
                    if (dragId) moveNote(dragId, n.id);
                    setDragId(null);
                    setDragOverId(null);
                  }}
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

      {editing && <EditDialog note={editing} cats={cats} onClose={() => setEditing(null)} onSave={saveEdit} />}

      <CategoryManagerDialog
        open={manageCats}
        onOpenChange={setManageCats}
        cats={cats}
        notes={notes}
        catColors={catColors}
        onAdd={addCategoryName}
        onRename={renameCategory}
        onDelete={deleteCategory}
        onSetColor={setCategoryColor}
      />

      <AlertDialog open={!!pendingImport} onOpenChange={(o) => !o && setPendingImport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurer la sauvegarde ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va <strong>écraser toutes les données actuelles</strong> ({notes.length} note(s),{" "}
              {cats.length} catégorie(s)) et les remplacer par le contenu du fichier ({pendingImport?.notes.length}{" "}
              note(s), {pendingImport?.categories.length} catégorie(s)). Cette opération est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>Restaurer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "todo" | "progress" | "done" }) {
  const dot = tone === "todo" ? "bg-status-todo" : tone === "progress" ? "bg-status-progress" : "bg-status-done";
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
  categoryColor,
  dndActive,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnterRow,
  onDragEndRow,
  onDropRow,
  onCycle,
  onEdit,
  onDelete,
  onArchive,
}: {
  note: Note;
  categoryColor: string;
  dndActive: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragEnterRow: () => void;
  onDragEndRow: () => void;
  onDropRow: () => void;
  onCycle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
}) {
  const due = dueState(note.dueDate);
  const overdue = due === "late" && note.status !== "done";
  const soon = due === "soon" && note.status !== "done";

  const badgeStyle: React.CSSProperties = {
    backgroundColor: hexToRgba(categoryColor, 0.14),
    borderColor: hexToRgba(categoryColor, 0.55),
    color: categoryColor,
  };

  return (
    <li
      draggable={dndActive}
      onDragStart={(e) => {
        if (!dndActive) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", note.id);
        onDragStart();
      }}
      onDragOver={(e) => {
        if (!dndActive) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragEnterRow();
      }}
      onDrop={(e) => {
        if (!dndActive) return;
        e.preventDefault();
        onDropRow();
      }}
      onDragEnd={onDragEndRow}
      className={cn(
        "group flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 px-3 py-2 text-sm transition-colors hover:bg-accent/40",
        overdue && "bg-destructive/5",
        note.status === "done" && "opacity-70",
        isDragging && "opacity-40",
        isDragOver && "border-t-2 border-t-primary",
      )}
    >
      {/* Drag handle */}
      <span
        className={cn(
          "shrink-0 -ml-1 grid place-items-center size-6 rounded text-muted-foreground/60",
          dndActive ? "cursor-grab active:cursor-grabbing hover:text-foreground hover:bg-accent" : "opacity-30 cursor-not-allowed",
        )}
        title={dndActive ? "Glisser pour réordonner" : "Passez en tri manuel pour réordonner"}
      >
        <GripVertical className="size-3.5" />
      </span>

      {/* Category — fixed width column */}
      <div className="w-full sm:w-[150px] sm:shrink-0 flex sm:justify-start">
        <span
          className="inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-[11px] font-medium border truncate"
          style={badgeStyle}
          title={note.category}
        >
          {note.category}
        </span>
      </div>

      {/* Status */}
      <div className="w-[120px] shrink-0 flex justify-center">
        <button
          onClick={onCycle}
          className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium transition", STATUS_CLASSES[note.status])}
          title="Cliquer pour changer de statut"
        >
          {STATUS_LABEL[note.status]}
        </button>
      </div>

      {/* Note text */}
      <p
        className={cn(
          "flex-1 min-w-0 truncate sm:whitespace-normal sm:break-words basis-full sm:basis-auto order-last sm:order-none",
          note.status === "done" && "line-through text-muted-foreground",
        )}
        title={note.text}
      >
        {note.text}
      </p>

      {/* Date */}
      <div
        className={cn(
          "shrink-0 sm:w-[190px] flex flex-col items-end justify-center gap-0.5 text-[11px] tabular-nums leading-tight whitespace-nowrap",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1 text-muted-foreground whitespace-nowrap",
            overdue && "text-destructive font-medium",
            soon && "text-warning font-medium",
          )}
          title={note.dueDate ? `Échéance : ${fmtDue(note.dueDate)}` : undefined}
        >
          <CalendarDays className="size-3" />
          Créée le {fmtDate(note.createdAt)}
        </span>
        {note.status === "done" && note.completedAt && (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
            <Check className="size-3" />
            Réglée le {fmtDate(note.completedAt)}
          </span>
        )}
      </div>

      {/* Actions */}
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
          {note.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
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
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} />
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
            <Select value={status} onValueChange={(v) => setStatus(v as NoteStatus)}>
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
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
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

function CategoryColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {CATEGORY_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "size-4 rounded-full border transition-transform",
            value.toLowerCase() === c.toLowerCase() ? "ring-2 ring-offset-1 ring-foreground scale-110" : "hover:scale-110",
          )}
          style={{ backgroundColor: c, borderColor: c }}
          title={c}
          aria-label={`Couleur ${c}`}
        />
      ))}
    </div>
  );
}

function CategoryManagerDialog({
  open,
  onOpenChange,
  cats,
  notes,
  catColors,
  onAdd,
  onRename,
  onDelete,
  onSetColor,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cats: string[];
  notes: Note[];
  catColors: Record<string, string>;
  onAdd: (name: string) => boolean;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string, mode: "uncategorize" | "delete-notes") => void;
  onSetColor: (name: string, color: string) => void;
}) {
  const [newCat, setNewCat] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState<"uncategorize" | "delete-notes">("uncategorize");

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

  const deletingCount = deleting ? (counts[deleting] ?? 0) : 0;
  const canDelete = cats.length > 1;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-4" /> Gérer les catégories
            </DialogTitle>
            <DialogDescription>
              Renommez, colorez ou supprimez vos catégories. Les notes associées seront mises à jour automatiquement.
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
              const color = colorForCategory(c, catColors);
              return (
                <li key={c} className="flex flex-col gap-2 rounded-md border bg-card px-2 py-1.5">
                  <div className="flex items-center gap-2">
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
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={commitEdit}>
                          <Check className="size-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingCat(null)}>
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm flex items-center gap-2 min-w-0">
                          <span
                            className="size-3 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate">{c}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {count} note{count > 1 ? "s" : ""}
                          </span>
                        </span>
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => startEdit(c)}>
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
                            !canDelete ? "Impossible : il doit rester au moins une catégorie" : "Supprimer la catégorie"
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <CategoryColorPicker value={color} onChange={(nc) => onSetColor(c, nc)} />
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

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la catégorie « {deleting} » ?</AlertDialogTitle>
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
                  <strong>Conserver les notes</strong> — les basculer vers « {UNCATEGORIZED} »
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
                  <strong className="text-destructive">Supprimer aussi les notes</strong> — action irréversible
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
