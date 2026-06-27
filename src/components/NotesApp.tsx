import { useEffect, useMemo, useState } from "react";
import {
  Note,
  NoteStatus,
  STATUS_LABEL,
  loadCategories,
  loadNotes,
  nextStatus,
  saveCategories,
  saveNotes,
} from "@/lib/notes-storage";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "created" | "due";
type StatusFilter = "all" | NoteStatus;

const STATUS_CLASSES: Record<NoteStatus, string> = {
  todo: "bg-status-todo text-status-todo-foreground hover:bg-status-todo/90",
  in_progress:
    "bg-status-progress text-status-progress-foreground hover:bg-status-progress/90",
  done: "bg-status-done text-status-done-foreground hover:bg-status-done/90",
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

  // edit / new cat dialogs
  const [editing, setEditing] = useState<Note | null>(null);
  const [newCat, setNewCat] = useState("");
  const [catDialog, setCatDialog] = useState(false);

  useEffect(() => {
    const c = loadCategories();
    setCats(c);
    setNotes(loadNotes());
    setFormCat(c[0] ?? "");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveNotes(notes);
  }, [notes, hydrated]);
  useEffect(() => {
    if (hydrated) saveCategories(cats);
  }, [cats, hydrated]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes
      .filter((n) => n.archived === showArchived)
      .filter((n) => (filterCat === "all" ? true : n.category === filterCat))
      .filter((n) => (filterStatus === "all" ? true : n.status === filterStatus))
      .filter((n) => (q ? n.text.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        if (sort === "created") return b.createdAt - a.createdAt;
        // due asc, nulls last
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

  function addCategory() {
    const v = newCat.trim();
    if (!v || cats.includes(v)) return;
    setCats((p) => [...p, v]);
    setNewCat("");
    setCatDialog(false);
  }
  function removeCategory(c: string) {
    if (cats.length <= 1) return;
    setCats((p) => p.filter((x) => x !== c));
    if (filterCat === c) setFilterCat("all");
    if (formCat === c) setFormCat(cats.find((x) => x !== c) ?? "");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">
              DP
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">
                Carnet de chantier
              </h1>
              <p className="text-xs text-muted-foreground">
                Notes & tâches — dessinateur projeteur
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{stats.total} actives</Badge>
            {stats.late > 0 && (
              <Badge className="bg-destructive text-destructive-foreground">
                <AlertTriangle className="size-3 mr-1" /> {stats.late} en retard
              </Badge>
            )}
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
              <h2 className="text-sm font-semibold">Catégories</h2>
              <Dialog open={catDialog} onOpenChange={setCatDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 px-2">
                    <Plus className="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouvelle catégorie</DialogTitle>
                  </DialogHeader>
                  <Input
                    placeholder="Ex. Chantier 3"
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  />
                  <DialogFooter>
                    <Button onClick={addCategory} disabled={!newCat.trim()}>
                      Ajouter
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <ul className="space-y-1">
              {cats.map((c) => {
                const count = notes.filter(
                  (n) => !n.archived && n.category === c,
                ).length;
                return (
                  <li
                    key={c}
                    className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary/70" />
                      {c}
                      <span className="text-xs text-muted-foreground">
                        {count}
                      </span>
                    </span>
                    <button
                      onClick={() => removeCategory(c)}
                      disabled={cats.length <= 1}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive disabled:opacity-0"
                      aria-label={`Supprimer ${c}`}
                    >
                      <X className="size-3.5" />
                    </button>
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
                {cats.map((c) => (
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
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((n) => (
                <NoteCard
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

function NoteCard({
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
        "rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-3 transition",
        overdue && "border-destructive/50",
        note.status === "done" && "opacity-75",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Badge variant="outline" className="text-[11px]">
          {note.category}
        </Badge>
        <button
          onClick={onCycle}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium transition",
            STATUS_CLASSES[note.status],
          )}
          title="Cliquer pour changer de statut"
        >
          {STATUS_LABEL[note.status]}
        </button>
      </div>

      <p
        className={cn(
          "text-sm whitespace-pre-wrap break-words",
          note.status === "done" && "line-through text-muted-foreground",
        )}
      >
        {note.text}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {note.dueDate && (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              overdue && "text-destructive font-medium",
              soon && "text-warning font-medium",
            )}
          >
            <CalendarDays className="size-3" />
            {fmtDue(note.dueDate)}
            {overdue && " · en retard"}
            {soon && " · bientôt"}
          </span>
        )}
        <span className="ml-auto">Créée le {fmtDate(note.createdAt)}</span>
      </div>

      <div className="flex items-center justify-end gap-1 -mb-1 -mr-1">
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onEdit}>
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
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
          className="h-7 px-2 text-destructive hover:text-destructive"
          onClick={onDelete}
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
