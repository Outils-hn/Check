import { useMemo, useState } from "react";
import { CalendarDays, FolderOpen, MessageSquareReply, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LIBELLE, STATUTS, etatEcheance, sansAccents, suivant, type Statut } from "@/lib/notes";

const DOT: Record<Statut, string> = { todo: "var(--st-todo)", in_progress: "var(--st-progress)", waiting: "var(--st-waiting)", done: "var(--st-done)" };

type Exemple = { id: string; texte: string; statut: Statut; projet: string; pour: string; jours: number; reponse?: string };
// jours = ecart avec aujourd'hui : l'exemple reste toujours « vivant » (un retard, des echeances proches).
const EXEMPLES: Exemple[] = [
  { id: "e1", texte: "Valider les cotes de l'angle nord avec le bureau d'études", statut: "todo", projet: "Façade nord", pour: "Julie (BET)", jours: 5 },
  { id: "e2", texte: "Vérifier le calepinage de la façade ventilée", statut: "in_progress", projet: "Façade sud", pour: "Moi", jours: 2 },
  { id: "e3", texte: "Relancer le fournisseur : fiche technique des profilés", statut: "waiting", projet: "Façade ouest", pour: "Marc (fournisseur)", jours: -3 },
  { id: "e4", texte: "Confirmer la teinte RAL des garde-corps", statut: "waiting", projet: "Balcons", pour: "Architecte", jours: 12 },
  { id: "e5", texte: "Commander les échantillons de panneaux", statut: "done", projet: "Façade sud", pour: "Atelier", jours: -6, reponse: "Livrés mercredi, validés par l'architecte." },
];

const iso = (jours: number) => { const d = new Date(); d.setDate(d.getDate() + jours); return d.toISOString().slice(0, 10); };
const dateCourte = (jours: number) => new Date(iso(jours) + "T00:00:00").toLocaleDateString("fr-CH", { day: "numeric", month: "short" });

const FONCTIONS = [
  ["Un statut par note", "À faire, en cours, en attente, réglé : un clic pour avancer."],
  ["Qui, quoi, pour quand", "Projet, personne concernée et échéance ; le retard ressort tout seul."],
  ["La réponse au même endroit", "Une fois réglé, on garde ce qui a été décidé."],
  ["Recherche et filtres", "Par statut, projet ou mot, même avec des centaines de notes."],
  ["Rapport PDF et sauvegarde", "Un export propre à envoyer, et vos notes en sécurité."],
];

/** Carnet d'exemple : tout est cliquable mais rien n'est enregistre (etat en memoire seulement). */
export function ApercuExemple() {
  const [notes, setNotes] = useState(EXEMPLES);
  const [filtre, setFiltre] = useState<Statut | "tous">("tous");
  const [q, setQ] = useState("");
  const visibles = useMemo(() => {
    const mot = sansAccents(q.trim());
    return notes.filter((n) => (filtre === "tous" || n.statut === filtre) && (!mot || sansAccents(`${n.texte} ${n.projet} ${n.pour} ${n.reponse ?? ""}`).includes(mot)));
  }, [notes, filtre, q]);
  const compte = (s: Statut) => notes.filter((n) => n.statut === s).length;
  return (
    <section className="panel space-y-4 p-5" aria-label="Exemple de carnet">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Voici ce que Check sait faire</h2>
        <span className="text-xs text-muted-foreground">Exemple : cliquez, rien n'est enregistré</span>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" aria-label="Rechercher dans l'exemple" placeholder="Rechercher : fournisseur, RAL, Julie…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer l'exemple par statut">
        {(["tous", ...STATUTS] as const).map((s) => (
          <button key={s} aria-pressed={filtre === s} onClick={() => setFiltre(s)}
            className={`min-h-9 rounded-full px-3 text-xs ${filtre === s ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-accent"}`}>
            {s === "tous" ? `Toutes ${notes.length}` : `${LIBELLE[s]} ${compte(s)}`}
          </button>
        ))}
      </div>
      <ul className="space-y-2" aria-label="Notes d'exemple">
        {visibles.length === 0 && <li className="rounded-md border p-3 text-center text-sm text-muted-foreground">Aucune note ne correspond.</li>}
        {visibles.map((n) => {
          const retard = n.statut !== "done" && etatEcheance(iso(n.jours)) === "retard";
          return (
            <li key={n.id} className="space-y-1.5 rounded-md border p-3">
              <div className="flex items-start gap-3">
                <p className={`min-w-0 flex-1 text-sm font-medium ${n.statut === "done" ? "text-muted-foreground line-through" : ""}`}>{n.texte}</p>
                <button className="flex min-h-8 shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground" aria-label={`Statut : ${LIBELLE[n.statut]}. Cliquer pour changer`}
                  onClick={() => setNotes((l) => l.map((x) => (x.id === n.id ? { ...x, statut: suivant(x.statut) } : x)))}>
                  <span className="size-2 rounded-full" style={{ background: DOT[n.statut] }} />{LIBELLE[n.statut]}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><FolderOpen className="size-3.5" />{n.projet}</span>
                <span className="inline-flex items-center gap-1"><User className="size-3.5" />Pour : {n.pour}</span>
                <span className={`inline-flex items-center gap-1 ${retard ? "font-semibold text-destructive" : ""}`}>
                  <CalendarDays className="size-3.5" />{retard ? `En retard · ${dateCourte(n.jours)}` : n.statut === "done" ? `Réglé · ${dateCourte(n.jours)}` : `Pour le ${dateCourte(n.jours)}`}
                </span>
              </div>
              {n.statut === "done" && n.reponse && (
                <p className="flex items-start gap-1.5 rounded bg-muted px-2.5 py-1.5 text-xs"><MessageSquareReply className="mt-0.5 size-3.5 shrink-0" />Réponse : {n.reponse}</p>
              )}
            </li>
          );
        })}
      </ul>
      <dl className="grid gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-2">
        {FONCTIONS.map(([t, d]) => (
          <div key={t}><dt className="text-sm font-medium">{t}</dt><dd className="text-xs text-muted-foreground">{d}</dd></div>
        ))}
      </dl>
    </section>
  );
}
