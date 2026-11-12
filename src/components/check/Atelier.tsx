import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, FileDown, ListChecks, MessageSquareText, Pencil, PencilLine, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DESTS, LIBELLE_DEST, destDe, etiquetteDest, filtrerDest, groupesAtelier, nomProjet, sansAccents, type Dest, type GroupeAtelier, type Note, type Projet } from "@/lib/notes";

const CLE_REPLIS = "check:taches-ouvertes";
const libelleTache = (t: string) => (t ? `Tâche ${t}` : "Sans numéro de tâche");
const titreTache = (g: { tache: string; nom: string }) => libelleTache(g.tache) + (g.nom ? ` · ${g.nom}` : "");
const plur = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const lireEtat = (): Record<string, boolean> => { try { return JSON.parse(localStorage.getItem(CLE_REPLIS) ?? "{}") ?? {}; } catch { return {}; } };

/** Page « Questions Tâches » : les questions a poser a l'atelier ou aux monteurs, par projet et par tache, avec export PDF. */
export function Atelier({ notes, projets, projetInitial, nomDe, auteur, onAjouter, onRepondre, onRouvrir, onPosee, onSupprimer, onSupprimerTache, onRenommerTache }: {
  notes: Note[]; projets: Projet[]; projetInitial: string; nomDe: (id: string | null) => string; auteur?: string;
  onAjouter: (q: { texte: string; projet_id: string; tache: string; tache_nom: string; destinataire: Dest; fournisseur: string }) => Promise<boolean>;
  onRepondre: (n: Note) => void; onRouvrir: (n: Note) => void; onPosee: (n: Note) => void; onSupprimer: (n: Note) => void; onSupprimerTache: (g: GroupeAtelier) => Promise<void>; onRenommerTache: (g: GroupeAtelier, c: { tache: string; nom: string }) => Promise<void>;
}) {
  const [projet, setProjet] = useState(projets.some((p) => p.id === projetInitial) ? projetInitial : projets[0]?.id ?? "");
  const [tache, setTache] = useState("");
  const [texte, setTexte] = useState("");
  const [nom, setNom] = useState("");
  const [dest, setDest] = useState<Dest>("atelier");
  const [fournisseur, setFournisseur] = useState("");
  const [filtreDest, setFiltreDest] = useState<Dest | "tous">("tous");
  const [aRenommer, setARenommer] = useState<GroupeAtelier | null>(null);
  const [nomSaisi, setNomSaisi] = useState("");
  const [numeroSaisi, setNumeroSaisi] = useState("");
  const [ouverts, setOuverts] = useState<Record<string, boolean>>(lireEtat);
  const [aSupprimer, setASupprimer] = useState<GroupeAtelier | null>(null);
  const [q, setQ] = useState("");
  const recherche = useRef<HTMLInputElement>(null);
  const toutes = useMemo(() => groupesAtelier(notes, nomDe), [notes, nomDe]); // toutes les questions
  const tous = useMemo(() => filtrerDest(toutes, filtreDest), [toutes, filtreDest]); // apres le filtre de destinataire
  // Recherche : numero de tache, projet, questions et reponses (sans accents) ; la tache est montree entiere des qu'un mot s'y trouve
  const groupes = useMemo(() => {
    const mots = sansAccents(q).split(/\s+/).filter(Boolean);
    if (!mots.length) return tous;
    return tous.filter((g) => {
      const t = sansAccents([titreTache(g), nomDe(g.projet_id), ...[...g.enAttente, ...g.reglees].flatMap((n) => [n.texte, n.reponse ?? ""])].join(" "));
      return mots.every((m) => t.includes(m));
    });
  }, [tous, q, nomDe]);
  // « / » : place le curseur dans la recherche
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault(); recherche.current?.focus();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  const tachesConnues = useMemo(() => [...new Set(toutes.filter((g) => g.projet_id === projet && g.tache).map((g) => g.tache))], [toutes, projet]);
  // Tache deja connue dans ce projet (meme numero) : on reprend son nom, sans le redemander
  const existante = tache.trim() ? toutes.find((g) => g.projet_id === projet && sansAccents(g.tache) === sansAccents(tache.trim())) : undefined;
  // PDF global : seulement les questions a poser sur place (atelier, montage) ; celles des fournisseurs se reglent par telephone ou mail
  const enAttente = filtrerDest(toutes, "tous").map((g) => ({ ...g, enAttente: g.enAttente.filter((n) => destDe(n) !== "fournisseur") })).filter((g) => g.enAttente.length);
  // Ouverte par defaut tant qu'il reste des questions sans reponse, repliee quand tout est regle ; le choix de chacun est retenu sur ce poste
  const ouvert = (g: GroupeAtelier) => (q.trim() ? true : ouverts[g.cle] ?? g.enAttente.length > 0);
  const regler = (etat: Record<string, boolean>) => { setOuverts(etat); try { localStorage.setItem(CLE_REPLIS, JSON.stringify(etat)); } catch { /* stockage bloque */ } };
  const basculer = (g: GroupeAtelier) => regler({ ...ouverts, [g.cle]: !ouvert(g) });
  const toutOuvrir = (o: boolean) => regler(Object.fromEntries(toutes.map((g) => [g.cle, o])));

  const ajouter = async () => {
    if (!texte.trim() || !projet) return;
    if (await onAjouter({ texte: texte.trim(), projet_id: projet, tache: tache.trim(), tache_nom: existante ? existante.nom : nom.trim(), destinataire: dest, fournisseur: dest === "fournisseur" ? fournisseur.trim() : "" })) setTexte(""); // projet et tache restent : on enchaine les questions
  };

  /** « Tout » : seulement les questions en attente, a emporter. Une tache seule : toutes ses questions, les reglees avec leur reponse. */
  const pdf = async (liste: GroupeAtelier[], avecReglees = false) => {
    if (!liste.length) return toast.error("Aucune question à exporter.");
    try {
      const { exportQuestionsPdf } = await import("@/lib/pdf-export");
      await exportQuestionsPdf(liste.map((g) => ({ projet: nomDe(g.projet_id), tache: g.tache, nom: g.nom, questions: g.enAttente.map((n) => ({ texte: n.texte, dest: etiquetteDest(n) })),
        reglees: avecReglees ? g.reglees.map((n) => ({ question: `${n.texte}  (${etiquetteDest(n)})`, reponse: n.reponse ?? "" })) : [] })), { auteur });
    } catch { toast.error("Le PDF n'a pas pu être créé (polices non chargées)."); }
  };

  return (
    <section className="min-w-0 space-y-4 max-lg:order-2" aria-label="Questions Tâches">
      <div className="panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="card-title flex items-center gap-1.5"><ListChecks className="size-4" aria-hidden="true" />Questions Tâches</h2>
            <p className="mt-1 text-xs text-muted-foreground">Questions pour l'atelier, les monteurs ou un fournisseur, par tâche. Exportez en PDF, cochez la case une fois la question posée, puis saisissez la réponse.</p>
          </div>
          <Button size="sm" className="gap-1.5" disabled={!enAttente.length} title="Questions en attente pour l'atelier et le montage" onClick={() => void pdf(enAttente)}><FileDown className="size-4" aria-hidden="true" />PDF</Button>
        </div>
        {projets.length === 0 ? (
          <p className="note-check mt-3">Créez d'abord un projet (« + Nouveau projet ») : les questions sont rangées par projet et par tâche.</p>
        ) : (
          <form className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)]" onSubmit={(e) => { e.preventDefault(); void ajouter(); }}>
            <select className="field" aria-label="Projet" value={projet} onChange={(e) => setProjet(e.target.value)}>
              {projets.map((p) => <option key={p.id} value={p.id}>{nomProjet(p)}</option>)}
            </select>
            <Input value={tache} maxLength={60} onChange={(e) => setTache(e.target.value)} placeholder="N° tâche" aria-label="Numéro de tâche" />
            {existante ? (
              <p className="self-center truncate text-xs text-muted-foreground" title="La question s'ajoute à cette tâche">Tâche existante{existante.nom ? <> : <strong className="text-foreground">{existante.nom}</strong></> : ""}</p>
            ) : (
              <Input value={nom} maxLength={80} onChange={(e) => setNom(e.target.value)} placeholder="Nom (facultatif)" aria-label="Nom de la tâche" />
            )}
            {tachesConnues.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs sm:col-span-3" aria-label="Tâches de ce projet">
                <span className="text-muted-foreground">Tâches du projet :</span>
                {tachesConnues.map((t) => (
                  <button key={t} type="button" aria-pressed={tache === t} onClick={() => setTache(t)}
                    className={`min-h-8 rounded-full border border-border px-3 hover:bg-muted ${tache === t ? "bg-muted font-medium" : ""}`}>{t}</button>
                ))}
              </div>
            )}
            <div className="grid gap-2 sm:col-span-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <select className="field" aria-label="Destinataire" value={dest} onChange={(e) => setDest(e.target.value as Dest)}>
                {DESTS.map((d) => <option key={d} value={d}>{LIBELLE_DEST[d]}</option>)}
              </select>
              {dest === "fournisseur"
                ? <Input value={fournisseur} maxLength={60} onChange={(e) => setFournisseur(e.target.value)} placeholder="Chez qui ? (ex. Schüco)" aria-label="Nom du fournisseur" />
                : <p className="self-center text-xs text-muted-foreground">{dest === "atelier" ? "À demander à l'atelier" : "À demander aux monteurs"}</p>}
            </div>
            <div className="flex gap-2 sm:col-span-3">
              <Input className="min-w-0 flex-1" value={texte} maxLength={500} onChange={(e) => setTexte(e.target.value)} placeholder="Votre question, Entrée pour ajouter" aria-label="Votre question" />
              <Button type="submit" disabled={!texte.trim()}>Ajouter la question</Button>
            </div>
          </form>
        )}
      </div>

      {toutes.length > 0 && (
        <div className="panel flex flex-wrap items-center gap-2 p-3">
          <div className="flex flex-wrap items-center gap-1.5 text-sm" role="group" aria-label="Filtrer par destinataire">
            {(["tous", ...DESTS] as const).map((d) => (
              <button key={d} type="button" aria-pressed={filtreDest === d} onClick={() => setFiltreDest(d)}
                className={`min-h-9 rounded-full border border-border px-3 hover:bg-muted ${filtreDest === d ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}>{d === "tous" ? "Tous" : LIBELLE_DEST[d]}</button>
            ))}
          </div>
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input ref={recherche} className="pl-9 pr-8" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setQ("")}
              placeholder="Rechercher une tâche, une question…" aria-label="Rechercher une tâche" />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground">/</kbd>
          </div>
        </div>
      )}

      {groupes.length > 1 && !q.trim() && (
        <div className="flex justify-end gap-3 text-xs text-muted-foreground">
          <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => toutOuvrir(true)}>Tout déplier</button>
          <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => toutOuvrir(false)}>Tout replier</button>
        </div>
      )}

      {groupes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <MessageSquareText className="mx-auto mb-2 size-7 opacity-50" aria-hidden="true" />{q.trim() ? `Aucune tâche ne correspond à « ${q.trim()} ».` : "Aucune question pour le moment."}
        </div>
      ) : groupes.map((g) => {
        const o = ouvert(g);
        const corps = `corps-${g.cle.replace(/[^a-z0-9]/gi, "")}`;
        return (
          <section key={g.cle} className="panel overflow-hidden" data-tache={g.tache} aria-label={`${nomDe(g.projet_id)} · ${titreTache(g)}`}>
            <header className="flex items-center gap-1 px-2 py-1.5">
              <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted" aria-expanded={o} aria-controls={corps} onClick={() => basculer(g)}>
                {o ? <ChevronDown className="size-4 shrink-0" aria-hidden="true" /> : <ChevronRight className="size-4 shrink-0" aria-hidden="true" />}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{titreTache(g)} <span className="font-normal text-muted-foreground">· {nomDe(g.projet_id)}</span></span>
                  <span className="block text-xs text-muted-foreground">{g.enAttente.length ? `${plur(g.enAttente.length, "question")} en attente${g.enAttente.some((n) => n.statut === "in_progress") ? ` (dont ${g.enAttente.filter((n) => n.statut === "in_progress").length} posée${g.enAttente.filter((n) => n.statut === "in_progress").length > 1 ? "s" : ""})` : ""}` : "Tout est réglé"}{g.reglees.length ? ` · ${plur(g.reglees.length, "réglée")}` : ""}</span>
                </span>
              </button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void pdf([g], true)} aria-label={`PDF de ${libelleTache(g.tache)}`}><FileDown className="size-3.5" aria-hidden="true" />PDF</Button>
              <button type="button" className="inline-flex size-10 shrink-0 md:size-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => { setARenommer(g); setNomSaisi(g.nom); setNumeroSaisi(g.tache); }} aria-label={`Modifier ${libelleTache(g.tache)}`} title="Modifier le numéro ou le nom de la tâche"><PencilLine className="size-3.5" /></button>
              <button type="button" className="inline-flex size-10 shrink-0 md:size-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive" onClick={() => setASupprimer(g)} aria-label={`Supprimer ${libelleTache(g.tache)} et ses questions`} title="Supprimer la tâche et ses questions"><Trash2 className="size-3.5" /></button>
            </header>
            {o && (
              <ul id={corps} className="divide-y divide-border border-t border-border">
                {g.enAttente.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 px-4 py-2.5 text-sm" data-question={n.id}>
                    <button type="button" aria-pressed={n.statut === "in_progress"} onClick={() => onPosee(n)} aria-label={n.statut === "in_progress" ? "Question posée, j'attends la réponse (cliquer pour annuler)" : "Marquer la question comme posée"}
                      title={n.statut === "in_progress" ? "Posée : j'attends la réponse" : "Marquer comme posée (j'attends la réponse)"}
                      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded border ${n.statut === "in_progress" ? "border-[var(--st-progress)] bg-[var(--st-progress)] text-white" : "border-border hover:bg-muted"}`}>
                      {n.statut === "in_progress" && <Check className="size-4" aria-hidden="true" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <span className={`mb-0.5 inline-block rounded-full border px-2 text-xs font-medium uppercase tracking-wide ${destDe(n) === "fournisseur" ? "border-[var(--st-waiting)]/40 text-[var(--st-waiting)]" : destDe(n) === "montage" ? "border-[var(--st-progress)]/40 text-[var(--st-progress)]" : "border-border text-muted-foreground"}`} data-dest={destDe(n)}>{etiquetteDest(n)}</span>
                      <p className="whitespace-pre-wrap break-words">{n.texte}</p>
                      {n.statut === "in_progress" && <p className="text-xs text-muted-foreground">Posée · j'attends la réponse</p>}
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => onRepondre(n)}><Check className="size-3.5" aria-hidden="true" />Répondre</Button>
                    <button type="button" className="inline-flex size-10 shrink-0 md:size-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive" onClick={() => onSupprimer(n)} aria-label="Supprimer la question" title="Supprimer la question"><Trash2 className="size-3.5" /></button>
                  </li>
                ))}
                {g.reglees.map((n) => (
                  <li key={n.id} className="px-4 py-2.5 text-sm" data-reglee={n.id}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1"><span className="mb-0.5 inline-block rounded-full border border-border px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{etiquetteDest(n)}</span><p className="whitespace-pre-wrap break-words text-muted-foreground line-through">{n.texte}</p></div>
                      <button type="button" className="inline-flex size-10 shrink-0 md:size-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => onRepondre(n)} aria-label="Modifier la réponse" title="Modifier la réponse"><Pencil className="size-3.5" /></button>
                      <button type="button" className="inline-flex size-10 shrink-0 md:size-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => onRouvrir(n)} aria-label="Rouvrir la question" title="Rouvrir : la question repasse en attente"><RotateCcw className="size-3.5" /></button>
                      <button type="button" className="inline-flex size-10 shrink-0 md:size-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive" onClick={() => onSupprimer(n)} aria-label="Supprimer la question" title="Supprimer la question"><Trash2 className="size-3.5" /></button>
                    </div>
                    {n.reponse?.trim() && (
                      <p className="mt-1 flex items-start gap-1.5 rounded-md border border-[var(--st-done)]/30 bg-[color-mix(in_oklab,var(--st-done)_8%,transparent)] px-2 py-1 text-[13px]" data-reponse>
                        <span className="mt-px shrink-0 text-xs font-semibold uppercase tracking-wide text-[var(--app-ink)]">Réponse</span>
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

      <Dialog open={!!aRenommer} onOpenChange={(o) => !o && setARenommer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifier {aRenommer ? libelleTache(aRenommer.tache).toLowerCase() : ""}</DialogTitle>
            <DialogDescription>Le numéro et le nom (facultatif) changent sur toutes les questions de la tâche, et sur le PDF.</DialogDescription>
          </DialogHeader>
          <form id="form-nom-tache" className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const g = aRenommer; setARenommer(null); if (g) await onRenommerTache(g, { tache: numeroSaisi.trim(), nom: nomSaisi.trim() }); }}>
            <div className="space-y-1.5"><Label htmlFor="m-numero">Numéro de tâche</Label>
              <Input id="m-numero" autoFocus value={numeroSaisi} maxLength={60} onChange={(e) => setNumeroSaisi(e.target.value)} placeholder="Ex. 1234" /></div>
            <div className="space-y-1.5"><Label htmlFor="m-nom">Nom de la tâche <span className="font-normal text-muted-foreground">(facultatif)</span></Label>
              <Input id="m-nom" value={nomSaisi} maxLength={80} onChange={(e) => setNomSaisi(e.target.value)} placeholder="Ex. Façade nord" /></div>
            {aRenommer && numeroSaisi.trim() && sansAccents(numeroSaisi.trim()) !== sansAccents(aRenommer.tache) && toutes.some((x) => x.projet_id === aRenommer.projet_id && sansAccents(x.tache) === sansAccents(numeroSaisi.trim())) && (
              <p className="note-check">Ce numéro existe déjà dans ce projet : les questions seront regroupées avec cette tâche.</p>
            )}
          </form>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setARenommer(null)}>Annuler</Button>
            <Button type="submit" form="form-nom-tache">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
