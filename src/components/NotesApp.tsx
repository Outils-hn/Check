import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, ArchiveRestore, CalendarDays, Check, FileDown, GripVertical, ListChecks, Palette, ImagePlus, Inbox, LogIn, MessageSquareText, Pencil, Pin, Plus, RotateCcw, Search, Settings2, Sparkles, Trash2, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCompte } from "@/lib/compte";
import { CarnetInvite } from "@/components/check/CarnetInvite";
import { CLE_INVITE, lireInvite } from "@/lib/notes-invite";
import { useActions, useComptes, useDirect, useDonnees } from "@/lib/donnees";
import {
  LIBELLE, PERSO, STATUTS, aNettoyer, nbQuestionsAtelier, pourAujourdhui, projetDepuisTexte, reponseDe, etatEcheance, filtrer, nomProjet, ordreAvant, ordreEnTete, suivant,
  type Filtres, type Note, type Projet, type Statut, type Tri, type Vue,
} from "@/lib/notes";
import { ANCIENNES_NOTES, REPRISE_FAITE, lireAnciennes } from "@/lib/reprise";
import { decrire, useHistorique } from "@/lib/historique";
import { Miniatures } from "@/components/check/Miniatures";
import { MAX_IMAGES, chargerImagesPdf, compresser } from "@/lib/images";
import { Retenir } from "@/components/check/Retenir";
import { Atelier } from "@/components/check/Atelier";
import { useRetenir } from "@/lib/retenir";
import { ProjetDialog } from "@/components/check/ProjetDialog";
import { RepriseDialog, type PlanReprise } from "@/components/check/RepriseDialog";
import { ConnexionDialog } from "@/components/check/ConnexionDialog";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-CH", { day: "2-digit", month: "short", year: "numeric" });
const fmtJour = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("fr-CH", { day: "2-digit", month: "short", year: "numeric" });
const PAGE = 50;
const MAX_NOTE = 4000;
const CLE_NOTER = "check:noter";
const CLE_NOTE_LIEE = "check:note"; // ?note=<id> : lien de la recherche de l'Accueil vers une note precise
const DOT: Record<Statut, string> = { todo: "var(--st-todo)", in_progress: "var(--st-progress)", waiting: "var(--st-waiting)", done: "var(--st-done)" };

export default function NotesApp() {
  const { pret, uid, valide, enAttente } = useCompte();
  const [connexion, setConnexion] = useState(false);
  // Lien « Noter dans Check » des autres applis : ?noter=texte -> texte garde le temps de la connexion, adresse nettoyee
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const t = u.searchParams.get("noter");
      const id = u.searchParams.get("note");
      if (!t && !id) return;
      if (t) sessionStorage.setItem(CLE_NOTER, t.slice(0, 2000));
      if (id) sessionStorage.setItem(CLE_NOTE_LIEE, id.slice(0, 60));
      u.searchParams.delete("noter");
      u.searchParams.delete("note");
      window.history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch { /* stockage bloque */ }
  }, []);
  if (!pret) return null;
  // Sans compte : carnet d'essai (5 notes sur ce poste) ; compte non valide : message d'attente
  if (!uid) return (<><CarnetInvite onConnexion={() => setConnexion(true)} /><ConnexionDialog open={connexion} onOpenChange={setConnexion} /></>);
  if (!valide) {
    return (
      <div className="panel mx-auto mt-16 max-w-md p-6 text-center text-sm">
        <h2 className="text-base font-semibold">{enAttente ? "Compte en attente de validation" : "Vos notes, sur tous vos postes"}</h2>
        <p className="mt-2 text-muted-foreground">
          {enAttente
            ? "Un administrateur doit valider votre compte dans Index → Configuration → Comptes. Vous aurez ensuite accès à vos notes et à celles de vos projets."
            : "Check utilise votre compte Index : notes perso, et notes partagées avec l'équipe de chaque projet."}
        </p>
        {!uid && <Button className="mt-4 gap-1.5" onClick={() => setConnexion(true)}><LogIn className="size-4" /> Se connecter</Button>}
        <ConnexionDialog open={connexion} onOpenChange={setConnexion} />
      </div>
    );
  }
  return <Carnet />;
}

function Carnet() {
  const { uid } = useCompte();
  const moi = uid!;
  const { projets, membres, notes, chargement, erreur, recharger } = useDonnees();
  const comptes = useComptes();
  const act = useActions();
  useDirect();

  // Saisie
  const [texte, setTexte] = useState("");
  const [formProjet, setFormProjet] = useState<string>(PERSO);
  const [formStatut, setFormStatut] = useState<Statut>("todo");
  const [formEcheance, setFormEcheance] = useState("");
  const [formPour, setFormPour] = useState("");
  const saisie = useRef<HTMLTextAreaElement>(null);
  const recherche = useRef<HTMLInputElement>(null);

  // Filtres
  const [f, setF] = useState<Filtres>({ vue: "actives", projets: [], statut: "tous", q: "", tri: "manuel" });
  const maj = (p: Partial<Filtres>) => setF((x) => ({ ...x, ...p }));

  // Fenetres
  const [edition, setEdition] = useState<Note | null>(null);
  // Note designee par un lien (?note=<id>) : on ouvre sa fenetre de modification des que les notes sont arrivees
  useEffect(() => {
    try {
      const id = sessionStorage.getItem(CLE_NOTE_LIEE);
      if (!id || !notes.length) return; // pas encore chargees : on garde le lien en attente
      sessionStorage.removeItem(CLE_NOTE_LIEE);
      const n = notes.find((x) => x.id === id);
      if (n) setEdition(n); else toast.error("Note introuvable : supprimée, ou d'un projet dont vous n'êtes pas membre.");
    } catch { /* stockage bloque */ }
  }, [notes]);
  const [versReponse, setVersReponse] = useState(false);
  // Garde le projet pendant la fermeture : la fenetre ne bascule pas en « Nouveau projet » en se refermant
  const [projetOuvert, setProjetOuvert] = useState<{ p: Projet | null; open: boolean }>({ p: null, open: false });
  const [nettoyer, setNettoyer] = useState(false);
  const [reprise, setReprise] = useState<PlanReprise | null>(null);
  const [glisse, setGlisse] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);
  const [limite, setLimite] = useState(PAGE);
  const [vide, setVide] = useState(false);

  const projetDe = useMemo(() => new Map(projets.map((p) => [p.id, p])), [projets]);
  const nomDe = (id: string | null) => nomProjet(id ? projetDe.get(id) : null);
  const personne = (id: string | null) => (id ? (id === moi ? "moi" : comptes.find((c) => c.id === id)?.nom ?? "un collègue") : null);
  const equipeDe = (pid: string | null) => (pid && pid !== PERSO ? membres.filter((m) => m.projet_id === pid).map((m) => m.user_id) : []);
  const actifs = projets.filter((p) => !p.archive);
  const archives = projets.filter((p) => p.archive);

  // Corbeille de plus de 30 jours videe (images comprises), une fois les notes chargees
  const corbeilleVidee = useRef(false);
  useEffect(() => {
    if (chargement || corbeilleVidee.current) return;
    corbeilleVidee.current = true;
    void act.viderCorbeilleAvecImages(notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargement]);

  // Premiere connexion : reprise des notes restees dans ce navigateur ; corbeille de plus de 30 jours videe
  useEffect(() => {
    try {
      // Notes du carnet d'essai (ecrites sans compte) : proposees en priorite a l'import
      const essai = lireAnciennes(JSON.stringify(lireInvite(localStorage.getItem(CLE_INVITE))));
      if (essai.notes.length) {
        setReprise({ titre: "Reprendre vos notes d'essai", ...essai, apres: () => { try { localStorage.removeItem(CLE_INVITE); } catch { /* bloque */ } } });
        return;
      }
      if (localStorage.getItem(REPRISE_FAITE)) return;
      const a = lireAnciennes(localStorage.getItem(ANCIENNES_NOTES));
      if (a.notes.length) setReprise({ titre: "Reprendre les notes de ce navigateur", ...a, apres: () => { try { localStorage.setItem(REPRISE_FAITE, new Date().toISOString()); } catch { /* bloque */ } } });
    } catch { /* stockage bloque */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // « / » : recherche ; « n » : nouvelle note
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/") { e.preventDefault(); recherche.current?.focus(); }
      if (e.key === "n") { e.preventDefault(); saisie.current?.focus(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  useEffect(() => { setLimite(PAGE); }, [f]);
  /** Clic sur la pastille de statut ; en passant a « Reglé », une notification propose d'ajouter une reponse (facultatif). */
  function statutSuivant(n: Note) {
    const s = suivant(n.statut);
    act.modifier(n.id, { statut: s });
    if (s === "done" && !n.reponse?.trim()) {
      toast("Note réglée", { duration: 6000, action: { label: "Ajouter une réponse", onClick: () => { setVersReponse(true); setEdition({ ...n, statut: "done" }); } } });
    }
  }
  const visibles = useMemo(() => filtrer(notes, f, moi, nomDe), [notes, f, moi, projetDe]); // eslint-disable-line react-hooks/exhaustive-deps
  const affichees = useMemo(() => visibles.slice(0, limite), [visibles, limite]);
  const vivantes = notes.filter((n) => !n.supprime_le && !n.archive && !n.atelier);
  const aujourdhui = vivantes.filter((n) => pourAujourdhui(n, moi)).length;
  const pourMoi = vivantes.filter((n) => n.pour === moi && n.statut !== "done").length;
  const enRetard = vivantes.filter((n) => n.statut !== "done" && etatEcheance(n.echeance) === "retard").length;
  const compte = (s: Statut) => vivantes.filter((n) => n.statut === s).length;
  const nbProjet = (id: string) => vivantes.filter((n) => (n.projet_id ?? PERSO) === id).length;
  const nbCorbeille = notes.filter((n) => n.supprime_le && !n.atelier).length;
  const glisserActif = f.vue === "actives" && f.tri === "manuel" && !f.q.trim() && f.statut === "tous";

  const [formOuvert, setFormOuvert] = useState(false);
  const [retenir, setRetenir] = useState(false);
  const [atelier, setAtelier] = useState(false);
  const [formImages, setFormImages] = useState<{ blob: Blob; url: string }[]>([]);
  const [compression, setCompression] = useState(false);
  const fichierForm = useRef<HTMLInputElement>(null);
  /** Photos ou captures du formulaire : compressees tout de suite, envoyees quand la note est ajoutee. */
  const joindre = async (fichiers: File[]) => {
    const libres = MAX_IMAGES - formImages.length;
    const images = fichiers.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    if (images.length > libres) toast.message(`${MAX_IMAGES} images au plus par note.`);
    setCompression(true);
    try {
      const faites: Blob[] = [];
      for (const f of images.slice(0, Math.max(0, libres))) faites.push(await compresser(f));
      setFormImages((l) => [...l, ...faites.map((blob) => ({ blob, url: URL.createObjectURL(blob) }))]);
    } catch { toast.error("Cette image n'a pas pu être préparée."); }
    finally { setCompression(false); }
  };
  const viderFormImages = () => { formImages.forEach((i) => URL.revokeObjectURL(i.url)); setFormImages([]); };
  const nbRetenir = useRetenir().fiches.length;
  const nbAtelier = nbQuestionsAtelier(notes);
  // Texte venu d'une autre appli (« Noter dans Check ») : on ouvre la saisie, prete a valider
  useEffect(() => {
    try {
      const t = sessionStorage.getItem(CLE_NOTER);
      if (!t) return;
      sessionStorage.removeItem(CLE_NOTER);
      setTexte(t); setFormOuvert(true);
      requestAnimationFrame(() => { saisie.current?.focus(); saisie.current?.setSelectionRange(t.length, t.length); });
    } catch { /* stockage bloque */ }
  }, []);
  // Le dernier projet choisi est retenu sur ce navigateur
  const projetRetabli = useRef(false);
  useEffect(() => {
    if (projetRetabli.current || !actifs.length) return;
    projetRetabli.current = true;
    try { const id = localStorage.getItem("check:dernier-projet"); if (id && actifs.some((p) => p.id === id)) setFormProjet(id); } catch { /* stockage bloque */ }
  }, [actifs]);
  useEffect(() => {
    if (!projetRetabli.current) return;
    try { if (formProjet === PERSO) localStorage.removeItem("check:dernier-projet"); else localStorage.setItem("check:dernier-projet", formProjet); } catch { /* stockage bloque */ }
  }, [formProjet]);
  // Nombre de notes a traiter dans le titre de l'onglet : on le voit sans ouvrir Check
  useEffect(() => {
    document.title = `${aujourdhui ? `(${aujourdhui}) ` : ""}Check`;
  }, [aujourdhui]);
  const ajouter = async () => {
    // « #chantier » dans le texte : choisit le projet et disparait du texte
    const tag = projetDepuisTexte(texte.trim(), actifs);
    const t = tag.texte;
    if (!t) { setVide(true); saisie.current?.focus(); return; }
    const projet_id = tag.projetId ?? (formProjet === PERSO ? null : formProjet);
    if (tag.projetId) setFormProjet(tag.projetId);
    const r = await act.ajouterNote({ texte: t, projet_id, statut: formStatut, echeance: formEcheance || null, pour: projet_id ? formPour || null : null, ordre: ordreEnTete(notes) });
    if (r) { if (formImages.length) { await act.ajouterImages(r, formImages.map((i) => i.blob)); viderFormImages(); } setVide(false); setTexte(""); setFormEcheance(""); setFormStatut("todo"); setFormPour(""); requestAnimationFrame(() => saisie.current?.focus()); if (window.matchMedia("(max-width: 1023px)").matches) setFormOuvert(false); }
  };

  const supprimer = async (n: Note) => {
    if (!(await act.mettreCorbeille(n.id))) return;
    toast("Note mise à la corbeille", { action: { label: "Annuler", onClick: () => act.restaurer(n.id) }, duration: 6000 });
  };

  const cliqueProjet = (id: string, e: React.MouseEvent) => {
    const multi = e.ctrlKey || e.metaKey;
    setF((x) => {
      const p = x.projets;
      const projetsSel = multi ? (p.includes(id) ? p.filter((y) => y !== id) : [...p, id]) : p.length === 1 && p[0] === id ? [] : [id];
      return { ...x, projets: projetsSel };
    });
    if (!multi) { setFormProjet(id); setFormPour(""); }
  };

  const pdf = async (couleur = false) => {
    if (!visibles.length) return toast.error("Aucune note à exporter.");
    const titre = f.projets.length === 1 ? nomDe(f.projets[0] === PERSO ? null : f.projets[0]) : f.vue === "pour-moi" ? "Notes pour moi" : "Rapport de suivi";
    const filtres = [f.projets.length > 1 ? `${f.projets.length} projets` : "", f.vue === "aujourdhui" ? "Aujourd'hui" : f.vue === "archivees" ? "Archivées" : f.vue === "pour-moi" ? "Pour moi" : "", f.statut !== "tous" ? LIBELLE[f.statut] : "", f.q ? `Recherche « ${f.q} »` : ""].filter(Boolean).join(" · ");
    try {
      const { exportNotesPdf } = await import("@/lib/pdf-export");
      const imagesPdf = couleur ? await chargerImagesPdf(visibles.flatMap((n) => n.images ?? [])).catch(() => ({})) : undefined;
      await exportNotesPdf(visibles.map((n) => ({ texte: n.texte, projet: nomDe(n.projet_id), pour: n.pour ? personne(n.pour) : null, statut: n.statut, flash: n.flash, created_at: n.created_at, echeance: n.echeance, regle_le: n.regle_le, reponse: n.reponse, images: n.images })), titre, { couleur, filtres, imagesPdf, auteur: comptes.find((c) => c.id === moi)?.nom });
    } catch { toast.error("Le PDF n'a pas pu être créé (polices non chargées)."); }
  };

  if (chargement) return <p className="py-16 text-center text-sm text-muted-foreground">Chargement…</p>;
  if (erreur) {
    const pasPrete = /check_|schema cache|does not exist|PGRST205|42P01/i.test(erreur.message ?? "");
    return (
      <div className="panel mx-auto mt-10 max-w-lg p-6 text-sm">
        <h2 className="font-semibold">{pasPrete ? "Base pas encore préparée" : "Base injoignable"}</h2>
        <p className="mt-2 text-muted-foreground">{pasPrete ? "Les tables de Check n'existent pas encore dans le projet Supabase d'Index : lancer supabase/check-index.sql dans le SQL Editor." : "Vérifiez la connexion, puis réessayez."}</p>
        {!pasPrete && <Button className="mt-4" onClick={() => recharger()}>Réessayer</Button>}
      </div>
    );
  }

  const equipeForm = equipeDe(formProjet);
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="lg:space-y-4 max-lg:contents">
        <Button type="button" variant="outline" className="w-full gap-1.5 max-lg:order-1 lg:hidden" aria-expanded={formOuvert} onClick={() => setFormOuvert((o) => !o)}>
          {formOuvert ? "Fermer" : <><Plus className="size-4" aria-hidden="true" />Nouvelle note</>}
        </Button>
        <section className={cn("panel p-4 max-lg:order-1", !formOuvert && "max-lg:hidden")}>
          <h2 className="card-title mb-3">Nouvelle note</h2>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); ajouter(); }}>
            <Textarea ref={saisie} rows={3} className="resize-none" autoFocus aria-label="Texte de la note" placeholder="Écrivez votre note, Entrée pour ajouter…" value={texte}
              maxLength={MAX_NOTE} aria-invalid={vide || undefined} aria-describedby="aide-saisie"
              onPaste={(e) => { const f = [...e.clipboardData.files].filter((x) => x.type.startsWith("image/")); if (f.length) { e.preventDefault(); void joindre(f); } }}
              onChange={(e) => { setTexte(e.target.value); if (vide) setVide(false); }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ajouter(); } }} />
            <p id="aide-saisie" role={vide ? "alert" : undefined} className={cn("-mt-1 text-xs", vide ? "text-destructive" : "sr-only")}>
              {vide ? "Écrivez d'abord quelque chose à ajouter." : "Entrée pour ajouter, Maj + Entrée pour un retour à la ligne."}
            </p>
            {texte.length >= MAX_NOTE - 500 && <p className="-mt-1 text-right text-xs tabular-nums text-muted-foreground" aria-live="polite">{texte.length} / {MAX_NOTE}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fichierForm} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-label="Choisir des images" data-fichier-form
                onChange={(e) => { void joindre([...(e.target.files ?? [])]); e.target.value = ""; }} />
              <Button type="button" variant="ghost" size="sm" className="gap-1.5" disabled={formImages.length >= MAX_IMAGES || compression} onClick={() => fichierForm.current?.click()}>
                <ImagePlus className="size-4" aria-hidden="true" />{compression ? "Préparation…" : "Photo ou capture"}
              </Button>
              {formImages.map((i) => (
                <span key={i.url} className="relative" data-form-image>
                  <img src={i.url} alt="Image à joindre" className="h-10 w-auto rounded border border-border object-cover" />
                  <button type="button" className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-border bg-background text-xs leading-none" aria-label="Retirer cette image"
                    onClick={() => { URL.revokeObjectURL(i.url); setFormImages((l) => l.filter((x) => x !== i)); }}>×</button>
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className="field col-span-2" aria-label="Projet de la note" value={formProjet} onChange={(e) => { setFormProjet(e.target.value); setFormPour(""); }}>
                <option value={PERSO}>Perso</option>
                {actifs.map((p) => <option key={p.id} value={p.id}>{nomProjet(p)}</option>)}
              </select>
              <select className="field" aria-label="Statut de la note" value={formStatut} onChange={(e) => setFormStatut(e.target.value as Statut)}>
                {STATUTS.map((s) => <option key={s} value={s}>{LIBELLE[s]}</option>)}
              </select>
              <Input type="date" aria-label="Échéance" value={formEcheance} onChange={(e) => setFormEcheance(e.target.value)} />
              <select className="field col-span-2" aria-label="Pour qui" value={formPour} disabled={formProjet === PERSO} onChange={(e) => setFormPour(e.target.value)}
                title={formProjet === PERSO ? "Une note perso reste pour vous" : undefined}>
                <option value="">Pour : personne</option>
                {equipeForm.map((id) => <option key={id} value={id}>Pour : {personne(id)}</option>)}
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={!texte.trim()}>Ajouter</Button>
          </form>
        </section>

        <Button type="button" variant={atelier ? "default" : "outline"} className="w-full justify-start gap-1.5 max-lg:order-1" aria-pressed={atelier} onClick={() => { setAtelier((a) => !a); setRetenir(false); }}>
          <ListChecks className="size-4" aria-hidden="true" />{atelier ? "Retour à mes notes" : `Questions Tâches${nbAtelier ? ` · ${nbAtelier}` : ""}`}
        </Button>
        <Button type="button" variant={retenir ? "default" : "outline"} className="w-full justify-start gap-1.5 max-lg:order-1" aria-pressed={retenir} onClick={() => { setRetenir((r) => !r); setAtelier(false); }}>
          <Pin className="size-4" aria-hidden="true" />{retenir ? "Retour à mes notes" : `À retenir${nbRetenir ? ` · ${nbRetenir}` : ""}`}
        </Button>

        <section className="panel p-4 max-lg:order-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="card-title">Projets</h2>
            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setProjetOuvert({ p: null, open: true })}>+ Nouveau projet</button>
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">Clic pour filtrer · Ctrl + clic pour en cumuler</p>
          <ul className="space-y-0.5 text-sm">
            <LigneProjet nom="Perso" detail="Visible par vous seul" n={nbProjet(PERSO)} actif={f.projets.includes(PERSO)} onClick={(e) => cliqueProjet(PERSO, e)} />
            {actifs.map((p) => (
              <LigneProjet key={p.id} nom={nomProjet(p)} detail={`${equipeDe(p.id).length} membre${equipeDe(p.id).length > 1 ? "s" : ""}`} n={nbProjet(p.id)}
                actif={f.projets.includes(p.id)} onClick={(e) => cliqueProjet(p.id, e)} onReglages={() => setProjetOuvert({ p, open: true })} />
            ))}
          </ul>
          {archives.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-xs text-muted-foreground">Projets archivés · {archives.length}</summary>
              <ul className="mt-1 space-y-0.5">
                {archives.map((p) => <LigneProjet key={p.id} nom={nomProjet(p)} n={nbProjet(p.id)} actif={f.projets.includes(p.id)} onClick={(e) => cliqueProjet(p.id, e)} onReglages={() => setProjetOuvert({ p, open: true })} />)}
              </ul>
            </details>
          )}
        </section>

        <section className="panel grid grid-cols-3 gap-2 p-3 text-center max-lg:order-4">
          {(["todo", "in_progress", "done"] as Statut[]).map((s) => (
            <button key={s} className={cn("rounded-md border border-border p-2 hover:bg-muted", f.statut === s && "bg-muted")} onClick={() => maj({ statut: f.statut === s ? "tous" : s })} aria-pressed={f.statut === s}>
              <span className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"><span className="size-2 rounded-full" style={{ background: DOT[s] }} />{LIBELLE[s]}</span>
              <span className="text-lg font-semibold tabular-nums">{compte(s)}</span>
            </button>
          ))}
        </section>
      </aside>

      {retenir && <Retenir moi={moi} comptes={comptes} />}
      {atelier && (
        <Atelier notes={notes} projets={actifs} projetInitial={formProjet} nomDe={nomDe} auteur={comptes.find((c) => c.id === moi)?.nom}
          onAjouter={async (q) => !!(await act.ajouterNote({ texte: q.texte, projet_id: q.projet_id, tache: q.tache || null, tache_nom: q.tache_nom || null, destinataire: q.destinataire, fournisseur: q.fournisseur || null, atelier: true, statut: "todo", ordre: ordreEnTete(notes) }))}
          onRepondre={(n) => { setVersReponse(true); setEdition({ ...n, statut: "done" }); }}
          onRouvrir={(n) => void act.modifier(n.id, { statut: "todo" })}
          onSupprimer={async (n) => { if (await act.mettreCorbeille(n.id)) toast("Question supprimée", { action: { label: "Annuler", onClick: () => act.restaurer(n.id) }, duration: 6000 }); }}
          onRenommerTache={async (g, nom) => { for (const n of [...g.enAttente, ...g.reglees]) await act.modifier(n.id, { tache_nom: nom || null }); toast.success(nom ? "Tâche nommée" : "Nom retiré"); }}
          onSupprimerTache={async (g) => { for (const n of [...g.enAttente, ...g.reglees]) await act.supprimerDefinitivement(n); toast.success("Tâche supprimée"); }} />
      )}
      <section className={cn("min-w-0 space-y-4 max-lg:order-2", (retenir || atelier) && "hidden")}>
        <div className="panel flex flex-wrap items-center gap-2 p-3">
          <div role="tablist" aria-label="Vue" className="flex max-w-full overflow-x-auto whitespace-nowrap rounded-md border border-border p-0.5 text-sm">
            {([["aujourdhui", `Aujourd'hui${aujourdhui ? ` · ${aujourdhui}` : ""}`], ["actives", "Actives"], ["pour-moi", `Pour moi${pourMoi ? ` · ${pourMoi}` : ""}`], ["archivees", "Archivées"], ["corbeille", `Corbeille${nbCorbeille ? ` · ${nbCorbeille}` : ""}`]] as [Vue, string][]).map(([v, l]) => (
              <button key={v} role="tab" aria-selected={f.vue === v} data-state={f.vue === v ? "active" : "inactive"} onClick={() => maj({ vue: v })}
                className={cn("rounded px-2 py-2 md:py-1", f.vue === v ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</button>
            ))}
          </div>
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input ref={recherche} className="pl-9 pr-8" placeholder="Rechercher une note…" aria-label="Rechercher une note" value={f.q} onChange={(e) => maj({ q: e.target.value })} onKeyDown={(e) => e.key === "Escape" && maj({ q: "" })} />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground">/</kbd>
          </div>
          <select className="field w-32" aria-label="Filtrer par statut" value={f.statut} onChange={(e) => maj({ statut: e.target.value as Statut | "tous" })}>
            <option value="tous">Tous statuts</option>
            {STATUTS.map((s) => <option key={s} value={s}>{LIBELLE[s]}</option>)}
          </select>
          <button type="button" aria-pressed={!!f.avecReponse} title="Seulement les notes avec une réponse" onClick={() => maj({ avecReponse: !f.avecReponse })}
            className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm hover:bg-muted", f.avecReponse && "bg-muted font-medium text-foreground")}>
            <MessageSquareText className="size-3.5" aria-hidden="true" /><span className="lg:max-2xl:sr-only">Avec réponse</span>
          </button>
          <select className="field w-32" aria-label="Trier" value={f.vue === "pour-moi" || f.vue === "aujourdhui" ? "echeance" : f.tri} disabled={f.vue === "pour-moi" || f.vue === "aujourdhui"} onChange={(e) => maj({ tri: e.target.value as Tri })}>
            <option value="manuel">Tri : manuel</option>
            <option value="recent">Tri : récent</option>
            <option value="echeance">Tri : échéance</option>
          </select>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNettoyer(true)} title="Archiver les notes réglées depuis plus de 7 jours"><Sparkles className="size-4" /><span className="lg:max-2xl:sr-only">Nettoyer</span></Button>
            <Button size="sm" className="gap-1.5" onClick={() => pdf(false)}><FileDown className="size-4" /> PDF</Button>
            <Button size="sm" variant="outline" aria-label="PDF en couleurs" title="PDF en couleurs" onClick={() => pdf(true)}><Palette className="size-4" /></Button>
          </div>
        </div>

        {enRetard > 0 && f.vue === "actives" && (
          <p className="note-check" role="status">{enRetard} note{enRetard > 1 ? "s" : ""} en retard · <button className="underline underline-offset-2" onClick={() => maj({ tri: "echeance" })}>trier par échéance</button></p>
        )}

        {visibles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            <Inbox className="mx-auto mb-2 size-7 opacity-50" />
            {f.vue === "corbeille" ? "La corbeille est vide. Les notes y restent 30 jours." : f.vue === "pour-moi" ? "Aucune note ne vous est confiée." : f.vue === "aujourdhui" ? "Rien d'urgent aujourd'hui : aucune note en retard, du jour ou confiée à vous." : f.vue === "archivees" ? "Aucune note archivée." : f.q ? `Aucune note ne correspond à « ${f.q} ».` : "Aucune note. Écrivez-en une à gauche (raccourci N)."}
          </div>
        ) : (
          <ul className="panel divide-y divide-border overflow-hidden">
            {affichees.map((n) => (
              <LigneNote key={n.id} n={n} projet={nomDe(n.projet_id)} pour={personne(n.pour)} auteur={n.projet_id && n.auteur !== moi ? personne(n.auteur) : null}
                glisser={glisserActif} enGlisse={glisse === n.id} survol={survol === n.id && glisse !== n.id}
                onDragStart={() => setGlisse(n.id)} onDragOver={() => glisse && setSurvol(n.id)} onDragEnd={() => { setGlisse(null); setSurvol(null); }}
                onDrop={() => { if (glisse && glisse !== n.id) act.modifier(glisse, { ordre: ordreAvant(visibles, n.id, glisse) }); setGlisse(null); setSurvol(null); }}
                onStatut={() => statutSuivant(n)}
                onFlash={() => act.modifier(n.id, { flash: !n.flash })}
                onModifier={() => { setVersReponse(false); setEdition(n); }}
                onArchiver={() => act.modifier(n.id, { archive: !n.archive })}
                onSupprimer={() => supprimer(n)}
                onRestaurer={() => act.restaurer(n.id)}
                onDetruire={() => act.supprimerDefinitivement(n)}
                onAjouterImage={async (f) => { const libres = MAX_IMAGES - (n.images?.length ?? 0); const l = f.filter((x) => x.type.startsWith("image/")).slice(0, libres); if (!l.length) return; try { await act.ajouterImages(n, await Promise.all(l.map(compresser))); } catch { toast.error("Cette image n'a pas pu être préparée."); } }}
                onRetirerImage={(c) => act.retirerImage(n, c)} />
            ))}
          </ul>
        )}
        {visibles.length > affichees.length && (
          <div className="text-center">
            <Button variant="outline" onClick={() => setLimite((l) => l + PAGE)}>Afficher la suite ({visibles.length - affichees.length} restante{visibles.length - affichees.length > 1 ? "s" : ""})</Button>
          </div>
        )}
      </section>

      {edition && <EditionDialog note={edition} versReponse={versReponse} projets={actifs} equipeDe={equipeDe} personne={personne} onClose={() => { setEdition(null); setVersReponse(false); }}
        onSave={async (c) => { if (await act.modifier(edition.id, c)) { setEdition(null); setVersReponse(false); } }} />}
      <ProjetDialog open={projetOuvert.open} onOpenChange={(o) => setProjetOuvert((x) => ({ ...x, open: o }))} projet={projetOuvert.p ? projetDe.get(projetOuvert.p.id) ?? null : null}
        onCree={(id) => { setFormProjet(id); setF((x) => ({ ...x, projets: [id] })); }} />
      <RepriseDialog plan={reprise} onClose={() => setReprise(null)} />
      <Dialog open={nettoyer} onOpenChange={setNettoyer}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nettoyer ?</DialogTitle>
            <DialogDescription>{aNettoyer(notes).length} note(s) réglée(s) depuis plus de 7 jours seront archivées. Elles restent dans « Archivées ».</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNettoyer(false)}>Annuler</Button>
            <Button onClick={async () => { const l = aNettoyer(notes); for (const n of l) await act.modifier(n.id, { archive: true }); setNettoyer(false); toast.success(l.length ? `${l.length} note(s) archivée(s)` : "Rien à nettoyer"); }}>Nettoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LigneProjet({ nom, detail, n, actif, onClick, onReglages }: { nom: string; detail?: string; n: number; actif: boolean; onClick: (e: React.MouseEvent) => void; onReglages?: () => void }) {
  return (
    <li className={cn("group flex items-center gap-1 rounded-md", actif ? "bg-muted" : "hover:bg-muted/60")}>
      <button className="flex min-w-0 flex-1 items-center justify-between gap-2 px-2 py-2.5 text-left md:py-1.5" onClick={onClick} aria-pressed={actif}>
        <span className="min-w-0">
          <span className={cn("block truncate", actif && "font-medium")}>{nom}</span>
          {detail && <span className="block text-[11px] text-muted-foreground">{detail}</span>}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{n}</span>
      </button>
      {onReglages && (
        <button className="mr-1 rounded p-3 text-muted-foreground opacity-60 md:p-1 hover:bg-background hover:text-foreground group-hover:opacity-100" onClick={onReglages} aria-label={`Projet et équipe : ${nom}`}>
          <Settings2 className="size-3.5" />
        </button>
      )}
    </li>
  );
}

function LigneNote(props: {
  n: Note; projet: string; pour: string | null; auteur: string | null; glisser: boolean; enGlisse: boolean; survol: boolean;
  onDragStart: () => void; onDragOver: () => void; onDragEnd: () => void; onDrop: () => void;
  onStatut: () => void; onFlash: () => void; onModifier: () => void; onArchiver: () => void; onSupprimer: () => void; onRestaurer: () => void; onDetruire: () => void;
  onAjouterImage: (f: File[]) => void; onRetirerImage: (chemin: string) => void;
}) {
  const fichier = useRef<HTMLInputElement>(null);
  const { n } = props;
  const ech = etatEcheance(n.echeance);
  const retard = ech === "retard" && n.statut !== "done";
  const proche = ech === "proche" && n.statut !== "done";
  const corbeille = !!n.supprime_le;
  const btn = "inline-flex size-11 items-center justify-center rounded md:size-7 text-muted-foreground hover:bg-muted hover:text-foreground";
  return (
    <li data-note={n.id} draggable={props.glisser}
      onDragStart={(e) => { if (!props.glisser) return; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", n.id); props.onDragStart(); }}
      onDragOver={(e) => { if (!props.glisser) return; e.preventDefault(); props.onDragOver(); }}
      onDrop={(e) => { if (!props.glisser) return; e.preventDefault(); props.onDrop(); }}
      onDragEnd={props.onDragEnd}
      className={cn("group grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2.5 text-sm md:grid-cols-[1.25rem_9rem_6.5rem_minmax(0,1fr)_9.5rem_auto] md:py-2",
        retard && "bg-[color-mix(in_oklab,var(--destructive)_5%,transparent)]", props.enGlisse && "opacity-40", props.survol && "shadow-[inset_0_2px_0_var(--app)]",
        n.flash && n.statut !== "done" && !corbeille && "flash-row")}>
      <span className={cn("text-muted-foreground/60", props.glisser ? "cursor-grab hover:text-foreground" : "opacity-30")} title={props.glisser ? "Glisser pour réordonner" : "Vue Actives en tri manuel pour réordonner"} aria-hidden="true">
        <GripVertical className="size-3.5" />
      </span>
      <span className="min-w-0 truncate text-xs text-muted-foreground" title={props.projet}>{props.projet}</span>
      <button onClick={props.onStatut} disabled={corbeille} className="inline-flex min-h-9 w-fit items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs hover:bg-muted md:min-h-0 md:px-2"
        title="Cliquer pour passer au statut suivant" aria-label={`Statut : ${LIBELLE[n.statut]}. Passer au suivant`}>
        <span className="size-2 rounded-full" style={{ background: DOT[n.statut] }} />{LIBELLE[n.statut]}
      </button>
      <div className="col-span-3 min-w-0 md:col-span-1">
        <p className={cn("whitespace-pre-wrap break-words", n.statut === "done" && "text-muted-foreground line-through")}>{n.texte}</p>
        {reponseDe(n) && (
          <p className="mt-1 flex items-start gap-1.5 rounded-md border border-[var(--st-done)]/30 bg-[color-mix(in_oklab,var(--st-done)_8%,transparent)] px-2 py-1 text-[13px] text-foreground" data-reponse>
            <span className="mt-px shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--app-ink)]">Réponse</span>
            <span className="whitespace-pre-wrap break-words">{reponseDe(n)}</span>
          </p>
        )}
        <Miniatures chemins={n.images ?? []} modifiable={!corbeille} onRetirer={props.onRetirerImage} />
        {(props.pour || props.auteur) && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {props.pour && <span className="font-medium text-[var(--app-ink)]">Pour {props.pour}</span>}
            {props.pour && props.auteur && " · "}
            {props.auteur && <>par {props.auteur}</>}
          </p>
        )}
      </div>
      <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs leading-tight tabular-nums text-muted-foreground md:col-span-1 md:flex-col md:items-end md:text-[11px]">
        <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" /> {fmtDate(n.created_at)}</span>
        {n.statut === "done" && n.regle_le ? (
          <span className="inline-flex items-center gap-1" style={{ color: "var(--st-done)" }}><Check className="size-3" /> Réglée le {fmtDate(n.regle_le)}</span>
        ) : n.echeance ? (
          <span className={cn(retard && "font-semibold text-destructive", proche && "text-[var(--st-todo)]")}>Échéance {fmtJour(n.echeance)}</span>
        ) : null}
      </div>
      <div className="flex items-center justify-end opacity-100 transition-opacity md:opacity-60 focus-within:opacity-100 group-hover:opacity-100">
        {corbeille ? (
          <>
            <button className={btn} onClick={props.onRestaurer} aria-label="Restaurer la note" title="Restaurer"><RotateCcw className="size-3.5" /></button>
            <button className={cn(btn, "text-destructive hover:text-destructive")} onClick={props.onDetruire} aria-label="Supprimer définitivement" title="Supprimer définitivement"><Trash2 className="size-3.5" /></button>
          </>
        ) : (
          <>
            <button className={cn(btn, n.flash && "text-[#EA580C] opacity-100")} onClick={props.onFlash} aria-pressed={n.flash} aria-label={n.flash ? "Retirer l'urgence" : "Marquer comme urgent"} title={n.flash ? "Retirer l'urgence" : "Urgent"}>
              <Zap className={cn("size-3.5", n.flash && "fill-current")} />
            </button>
            {(n.images?.length ?? 0) < MAX_IMAGES && (
              <>
                <input ref={fichier} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-label="Ajouter une image à la note" onChange={(e) => { props.onAjouterImage([...(e.target.files ?? [])]); e.target.value = ""; }} />
                <button className={btn} onClick={() => fichier.current?.click()} aria-label="Ajouter une image" title="Ajouter une photo ou une capture"><ImagePlus className="size-3.5" /></button>
              </>
            )}
            <button className={btn} onClick={props.onModifier} aria-label="Modifier la note" title="Modifier"><Pencil className="size-3.5" /></button>
            <button className={btn} onClick={props.onArchiver} aria-label={n.archive ? "Désarchiver" : "Archiver"} title={n.archive ? "Désarchiver" : "Archiver"}>
              {n.archive ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
            </button>
            <button className={cn(btn, "text-destructive hover:text-destructive")} onClick={props.onSupprimer} aria-label="Mettre à la corbeille" title="Corbeille"><Trash2 className="size-3.5" /></button>
          </>
        )}
      </div>
    </li>
  );
}

function EditionDialog({ note, projets, equipeDe, personne, onClose, onSave, versReponse = false }: {
  versReponse?: boolean;
  note: Note; projets: Projet[]; equipeDe: (pid: string | null) => string[]; personne: (id: string | null) => string | null;
  onClose: () => void; onSave: (c: Partial<Note>) => void;
}) {
  const [texte, setTexte] = useState(note.texte);
  const [projet, setProjet] = useState(note.projet_id ?? PERSO);
  const [statut, setStatut] = useState<Statut>(note.statut);
  const [echeance, setEcheance] = useState(note.echeance ?? "");
  const [pour, setPour] = useState(note.pour ?? "");
  const [reponse, setReponse] = useState(note.reponse ?? "");
  const equipe = equipeDe(projet);
  const [voirHisto, setVoirHisto] = useState(false);
  const histo = useHistorique(note.id, voirHisto);
  const nomPersonne = (id: string | null) => personne(id) ?? "Un collègue";
  const nomDuProjet = (id: string | null) => { const p = projets.find((x) => x.id === id); return id ? (p ? nomProjet(p) : "un projet") : "Perso"; };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier la note</DialogTitle>
          <DialogDescription className="sr-only">Texte, projet, statut, échéance et personne</DialogDescription>
        </DialogHeader>
        <form id="form-note" className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (texte.trim()) onSave({ texte: texte.trim(), projet_id: projet === PERSO ? null : projet, statut, echeance: echeance || null, pour: projet === PERSO ? null : pour || null, reponse: reponse.trim() || null }); }}>
          <Textarea rows={4} aria-label="Texte de la note" value={texte} onChange={(e) => setTexte(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="e-projet">Projet</Label>
              <select id="e-projet" className="field" value={projet} onChange={(e) => { setProjet(e.target.value); setPour(""); }}>
                <option value={PERSO}>Perso</option>
                {projets.map((p) => <option key={p.id} value={p.id}>{nomProjet(p)}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="e-statut">Statut</Label>
              <select id="e-statut" className="field" value={statut} onChange={(e) => setStatut(e.target.value as Statut)}>
                {STATUTS.map((s) => <option key={s} value={s}>{LIBELLE[s]}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="e-ech">Échéance</Label><Input id="e-ech" type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="e-pour">Pour</Label>
              <select id="e-pour" className="field" value={pour} disabled={projet === PERSO} onChange={(e) => setPour(e.target.value)}>
                <option value="">Personne</option>
                {equipe.map((id) => <option key={id} value={id}>{personne(id)}</option>)}
              </select>
            </div>
          </div>
          {statut === "done" && (
            <div className="space-y-1.5">
              <Label htmlFor="e-reponse">Réponse <span className="font-normal text-muted-foreground">(facultatif)</span></Label>
              <Textarea id="e-reponse" rows={2} maxLength={500} autoFocus={versReponse} placeholder="Ce qu'il faut retenir, pour l'équipe"
                value={reponse} onChange={(e) => setReponse(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">{reponse.length} / 500 · visible par ceux qui voient la note.</p>
            </div>
          )}
          {projet !== (note.projet_id ?? PERSO) && <p className="note-check">{projet === PERSO ? "La note deviendra perso : l'équipe ne la verra plus." : "La note sera visible par l'équipe de ce projet."}</p>}
        </form>
        <div className="text-sm">
          <button type="button" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground" aria-expanded={voirHisto} onClick={() => setVoirHisto((v) => !v)}>
            {voirHisto ? "Masquer l'historique" : "Voir l'historique des changements"}
          </button>
          {voirHisto && (
            <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-border p-2" data-histo>
              {histo.isLoading ? <p className="text-xs text-muted-foreground">Chargement…</p>
                : histo.isError ? <p className="text-xs text-muted-foreground">L'historique n'est pas encore activé (script SQL « check-historique.sql » à lancer une fois).</p>
                : !histo.data?.length ? <p className="text-xs text-muted-foreground">Aucun changement depuis la création.</p>
                : <ul className="space-y-1.5 text-xs">{histo.data.map((e) => (
                    <li key={e.id}><span className="font-medium">{nomPersonne(e.user_id)}</span> · <span className="tabular-nums text-muted-foreground">{new Date(e.le).toLocaleString("fr-CH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span><br />{decrire(e, nomPersonne, nomDuProjet)}</li>
                  ))}</ul>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="submit" form="form-note" disabled={!texte.trim()}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
