import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, FileDown, ListChecks, MessageSquareText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { groupesAtelier, nomProjet, type GroupeAtelier, type Note, type Projet } from "@/lib/notes";

const CLE_REPLIS = "check:taches-ouvertes";
const libelleTache = (t: string) => (t ? `Tâche ${t}` : "Sans numéro de tâche");
const plur = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const lireEtat = (): Record<string, boolean> => { try { return JSON.parse(localStorage.getItem(CLE_REPLIS) ?? "{}") ?? {}; } catch { return {}; } };

/** Page « Questions Tâches » : les questions a poser a l'atelier ou aux monteurs, par projet et par tache, avec export PDF. */
export function Atelier({ notes, projets, projetInitial, nomDe, auteur, onAjouter, onRepondre, onSupprimer, onSupprimerTache }: {
  notes: Note[]; projets: Projet[]; projetInitial: string; nomDe: (id: string | null) => string; auteur?: string;
  onAjouter: (q: { texte: string; projet_id: string; tache: string }) => Promise<boolean>;
  onRepondre: (n: Note) => void; onSupprimer: (n: Note) => void; onSupprimerTache: (g: GroupeAtelier) => Promise<void>;
}) {
  const [projet, setProjet] = useState(projets.some((p) => p.id === projetInitial) ? projetInitial : projets[0]?.id ?? "");
  const [tache, setTache] = useState("");
  const [texte, setTexte] = useState("");
  const [ouverts, setOuverts] = useState<Record<string, boolean>>(lireEtat);
  const [aSupprimer, setASupprimer] = useState<GroupeAtelier | null>(null);
  const groupes = useMemo(() => groupesAtelier(notes, nomDe), [notes, nomDe]);
  const tachesConnues = useMemo(() => [...new Set(groupes.filter((g) => g.projet_id === projet && g.tache).map((g) => g.tache))], [groupes, projet]);
  const enAttente = groupes.filter((g) => g.enAttente.length);
  // Ouverte par defaut tant qu'il reste des questions sans reponse, repliee quand tout est regle ; le choix de chacun est retenu sur ce poste
  const ouvert = (g: GroupeAtelier) => ouverts[g.cle] ?? g.enAttente.length > 0;
  const regler = (etat: Record<string, boolean>) => { setOuverts(etat); try { localStorage.setItem(CLE_REPLIS, JSON.stringify(etat)); } catch { /* stockage bloque */ } };
  const basculer = (g: GroupeAtelier) => regler({ ...ouverts, [g.cle]: !ouvert(g) });
  const toutOuvrir = (o: boolean) => regler(Object.fromEntries(groupes.map((g) => [g.cle, o])));

  const ajouter = async () => {
    if (!texte.trim() || !projet) return;
    if (await onAjouter({ texte: texte.trim(), projet_id: projet, tache: tache.trim() })) setTexte(""); // projet et tache restent : on enchaine les questions
  };

  const pdf = async (liste: GroupeAtelier[]) => {
    if (!liste.length) return toast.error("Aucune question en attente à exporter.");
    try {
      const { exportQuestionsPdf } = await import("@/lib/pdf-export");
      await exportQuestionsPdf(liste.map((g) => ({ projet: nomDe(g.projet_id), tache: g.tache, questions: g.enAttente.map((n) => n.texte) })), { auteur });
    } catch { toast.error("Le PDF n'a pas pu être créé (polices non chargées)."); }
  };

  return (
    <section className="min-w-0 space-y-4 max-lg:order-2" aria-label="Questions Tâches">
      <div className="panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="card-title flex items-center gap-1.5"><ListChecks className="size-4" aria-hidden="true" />Questions Tâches</h2>
            <p className="mt-1 text-sm text-muted-foreground">Vos questions pour l'atelier ou les monteurs, rangées par tâche. Exportez la feuille en PDF, puis saisissez les réponses à votre retour.</p>
          </div>
          <Button size="sm" className="gap-1.5" disabled={!enAttente.length} onClick={() => void pdf(enAttente)}><FileDown className="size-4" aria-hidden="true" />PDF</Button>
        </div>
        {projets.length === 0 ? (
          <p className="note-check mt-3">Créez d'abord un projet (« + Nouveau projet ») : les questions sont rangées par projet et par tâche.</p>
        ) : (
          <form className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]" onSubmit={(e) => { e.preventDefault(); void ajouter(); }}>
            <select className="field" aria-label="Projet" value={projet} onChange={(e) => setProjet(e.target.value)}>
              {projets.map((p) => <option key={p.id} value={p.id}>{nomProjet(p)}</option>)}
            </select>
            <Input value={tache} maxLength={60} list="taches-connues" onChange={(e) => setTache(e.target.value)} placeholder="N° de tâche" aria-label="Numéro de tâche" />
            <datalist id="taches-connues">{tachesConnues.map((t) => <option key={t} value={t} />)}</datalist>
            <Input className="sm:col-span-2" value={texte} maxLength={500} onChange={(e) => setTexte(e.target.value)} placeholder="Votre question, Entrée pour ajouter" aria-label="Votre question" />
            <Button type="submit" className="sm:col-span-2" disabled={!texte.trim()}>Ajouter la question</Button>
          </form>
        )}
      </div>

      {groupes.length > 1 && (
        <div className="flex justify-end gap-3 text-xs text-muted-foreground">
          <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => toutOuvrir(true)}>Tout déplier</button>
          <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => toutOuvrir(false)}>Tout replier</button>
        </div>
      )}

      {groupes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <MessageSquareText className="mx-auto mb-2 size-7 opacity-50" aria-hidden="true" />Aucune question pour le moment.
        </div>
      ) : groupes.map((g) => {
        const o = ouvert(g);
        const corps = `corps-${g.cle.replace(/[^a-z0-9]/gi, "")}`;
        return (
          <section key={g.cle} className="panel overflow-hidden" data-tache={g.tache} aria-label={`${nomDe(g.projet_id)} · ${libelleTache(g.tache)}`}>
            <header className="flex items-center gap-1 px-2 py-1.5">
              <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted" aria-expanded={o} aria-controls={corps} onClick={() => basculer(g)}>
                {o ? <ChevronDown className="size-4 shrink-0" aria-hidden="true" /> : <ChevronRight className="size-4 shrink-0" aria-hidden="true" />}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{libelleTache(g.tache)} <span className="font-normal text-muted-foreground">· {nomDe(g.projet_id)}</span></span>
                  <span className="block text-[11px] text-muted-foreground">{g.enAttente.length ? `${plur(g.enAttente.length, "question")} en attente` : "Tout est réglé"}{g.reglees.length ? ` · ${plur(g.reglees.length, "réglée")}` : ""}</span>
                </span>
              </button>
              <Button size="sm" variant="outline" className="gap-1.5" disabled={!g.enAttente.length} onClick={() => void pdf([g])} aria-label={`PDF de ${libelleTache(g.tache)}`}><FileDown className="size-3.5" aria-hidden="true" />PDF</Button>
              <button type="button" className="inline-flex size-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive" onClick={() => setASupprimer(g)} aria-label={`Supprimer ${libelleTache(g.tache)} et ses questions`} title="Supprimer la tâche et ses questions"><Trash2 className="size-3.5" /></button>
            </header>
            {o && (
              <ul id={corps} className="divide-y divide-border border-t border-border">
                {g.enAttente.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 px-4 py-2.5 text-sm" data-question={n.id}>
                    <span className="mt-0.5 size-4 shrink-0 rounded border border-border" aria-hidden="true" />
                    <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">{n.texte}</p>
                    <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => onRepondre(n)}><Check className="size-3.5" aria-hidden="true" />Répondre</Button>
                    <button type="button" className="inline-flex size-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive" onClick={() => onSupprimer(n)} aria-label="Supprimer la question" title="Supprimer la question"><Trash2 className="size-3.5" /></button>
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
            )}
          </section>
        );
      })}

      <Dialog open={!!aSupprimer} onOpenChange={(o) => !o && setASupprimer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer {aSupprimer ? libelleTache(aSupprimer.tache).toLowerCase() : ""} ?</DialogTitle>
            <DialogDescription>
              {aSupprimer && <>
                {plur(aSupprimer.enAttente.length + aSupprimer.reglees.length, "question")} et leurs réponses seront supprimées pour toute l'équipe du projet. C'est définitif.
                {aSupprimer.enAttente.length > 0 && <strong className="mt-2 block text-foreground">{plur(aSupprimer.enAttente.length, "question")} n'{aSupprimer.enAttente.length > 1 ? "ont" : "a"} pas encore de réponse.</strong>}
              </>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setASupprimer(null)}>Annuler</Button>
            <Button variant="destructive" onClick={async () => { const g = aSupprimer; setASupprimer(null); if (g) await onSupprimerTache(g); }}>Supprimer la tâche</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
