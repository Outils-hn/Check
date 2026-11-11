import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, MessageSquareText, Printer, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { groupesAtelier, nomProjet, type GroupeAtelier, type Note, type Projet } from "@/lib/notes";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-CH", { day: "2-digit", month: "short", year: "numeric" });
const libelleTache = (t: string) => (t ? `Tâche ${t}` : "Sans numéro de tâche");

/** Page « Atelier / Montage » : les questions a poser aux gars de l'atelier et aux monteurs, par projet et par tache, avec la feuille a imprimer. */
export function Atelier({ notes, projets, projetInitial, nomDe, onAjouter, onRepondre, onSupprimer }: {
  notes: Note[]; projets: Projet[]; projetInitial: string; nomDe: (id: string | null) => string;
  onAjouter: (q: { texte: string; projet_id: string; tache: string }) => Promise<boolean>;
  onRepondre: (n: Note) => void; onSupprimer: (n: Note) => void;
}) {
  const [projet, setProjet] = useState(projets.some((p) => p.id === projetInitial) ? projetInitial : projets[0]?.id ?? "");
  const [tache, setTache] = useState("");
  const [texte, setTexte] = useState("");
  const [impression, setImpression] = useState<GroupeAtelier[] | null>(null);
  const groupes = useMemo(() => groupesAtelier(notes, nomDe), [notes, nomDe]);
  const tachesConnues = useMemo(() => [...new Set(groupes.filter((g) => g.projet_id === projet && g.tache).map((g) => g.tache))], [groupes, projet]);
  const enAttente = groupes.filter((g) => g.enAttente.length);

  const ajouter = async () => {
    if (!texte.trim() || !projet) return;
    if (await onAjouter({ texte: texte.trim(), projet_id: projet, tache: tache.trim() })) setTexte(""); // projet et tache restent : on enchaine les questions
  };

  // Impression : la feuille est dans la page (cachee a l'ecran) ; on lance l'impression du navigateur puis on la retire
  useEffect(() => {
    if (!impression) return;
    const fin = () => { document.body.classList.remove("impression-atelier"); setImpression(null); };
    window.addEventListener("afterprint", fin, { once: true });
    document.body.classList.add("impression-atelier");
    const t = setTimeout(() => window.print(), 50);
    return () => { clearTimeout(t); window.removeEventListener("afterprint", fin); document.body.classList.remove("impression-atelier"); };
  }, [impression]);

  return (
    <section className="min-w-0 space-y-4 max-lg:order-2" aria-label="Atelier / Montage">
      <div className="panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="card-title flex items-center gap-1.5"><Wrench className="size-4" aria-hidden="true" />À demander à l'atelier / au montage</h2>
            <p className="mt-1 text-sm text-muted-foreground">Notez vos questions en dessinant (atelier ou monteurs), imprimez la feuille, puis saisissez les réponses à votre retour.</p>
          </div>
          <Button size="sm" className="gap-1.5" disabled={!enAttente.length} onClick={() => setImpression(enAttente)}><Printer className="size-4" aria-hidden="true" />Tout imprimer</Button>
        </div>
        {projets.length === 0 ? (
          <p className="note-check mt-3">Créez d'abord un projet (« + Nouveau projet ») : les questions atelier / montage sont rangées par projet et par tâche.</p>
        ) : (
          <form className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]" onSubmit={(e) => { e.preventDefault(); void ajouter(); }}>
            <select className="field" aria-label="Projet" value={projet} onChange={(e) => setProjet(e.target.value)}>
              {projets.map((p) => <option key={p.id} value={p.id}>{nomProjet(p)}</option>)}
            </select>
            <Input value={tache} maxLength={60} list="taches-connues" onChange={(e) => setTache(e.target.value)} placeholder="N° de tâche" aria-label="Numéro de tâche" />
            <datalist id="taches-connues">{tachesConnues.map((t) => <option key={t} value={t} />)}</datalist>
            <Input className="sm:col-span-2" value={texte} maxLength={500} onChange={(e) => setTexte(e.target.value)} placeholder="Votre question pour l'atelier ou le montage, Entrée pour ajouter" aria-label="Question pour l'atelier ou le montage" />
            <Button type="submit" className="sm:col-span-2" disabled={!texte.trim()}>Ajouter la question</Button>
          </form>
        )}
      </div>

      {groupes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <MessageSquareText className="mx-auto mb-2 size-7 opacity-50" aria-hidden="true" />Aucune question pour l'atelier ou le montage.
        </div>
      ) : groupes.map((g) => (
        <section key={g.cle} className="panel overflow-hidden" data-tache={g.tache} aria-label={`${nomDe(g.projet_id)} · ${libelleTache(g.tache)}`}>
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <h3 className="text-sm font-semibold">{libelleTache(g.tache)} <span className="font-normal text-muted-foreground">· {nomDe(g.projet_id)}</span></h3>
            <Button size="sm" variant="outline" className="gap-1.5" disabled={!g.enAttente.length} onClick={() => setImpression([g])}><Printer className="size-3.5" aria-hidden="true" />Imprimer</Button>
          </header>
          <ul className="divide-y divide-border">
            {g.enAttente.map((n) => (
              <li key={n.id} className="flex items-start gap-3 px-4 py-2.5 text-sm" data-question={n.id}>
                <span className="mt-0.5 size-4 shrink-0 rounded border border-border" aria-hidden="true" />
                <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">{n.texte}</p>
                <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => onRepondre(n)}><Check className="size-3.5" aria-hidden="true" />Répondre</Button>
                <button type="button" className="inline-flex size-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive" onClick={() => onSupprimer(n)} aria-label="Supprimer la question" title="Corbeille"><Trash2 className="size-3.5" /></button>
              </li>
            ))}
            {g.reglees.map((n) => (
              <li key={n.id} className="px-4 py-2.5 text-sm" data-reglee={n.id}>
                <p className="whitespace-pre-wrap break-words text-muted-foreground line-through">{n.texte}</p>
                {n.reponse?.trim() && (
                  <p className="mt-1 flex items-start gap-1.5 rounded-md border border-[var(--st-done)]/30 bg-[color-mix(in_oklab,var(--st-done)_8%,transparent)] px-2 py-1 text-[13px]" data-reponse>
                    <span className="mt-px shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--app-ink)]">Réponse</span>
                    <span className="whitespace-pre-wrap break-words">{n.reponse.trim()}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {impression && createPortal(<FeuilleAtelier groupes={impression} nomDe={nomDe} />, document.body)}
    </section>
  );
}

/** Feuille A4 pour l'atelier et le montage : cachee a l'ecran, seule visible a l'impression. Une case a cocher et des lignes pour ecrire la reponse. */
function FeuilleAtelier({ groupes, nomDe }: { groupes: GroupeAtelier[]; nomDe: (id: string | null) => string }) {
  return (
    <div id="feuille-atelier" data-feuille-atelier>
      <h1>À demander à l'atelier / au montage</h1>
      <p className="feuille-date">Imprimé le {fmtDate(new Date().toISOString())}</p>
      {groupes.map((g) => (
        <section key={g.cle}>
          <h2>{libelleTache(g.tache)} <span>· {nomDe(g.projet_id)}</span></h2>
          <ol>
            {g.enAttente.map((n) => (
              <li key={n.id}>
                <span className="feuille-case" />
                <div><p>{n.texte}</p><i /><i /></div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
