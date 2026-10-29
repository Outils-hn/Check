import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useActions, useDonnees } from "@/lib/donnees";
import { choixParDefaut, type Choix, type NoteAImporter } from "@/lib/reprise";

export type PlanReprise = { titre: string; categories: string[]; notes: NoteAImporter[]; apres?: () => void };

/** Import de notes (ancien navigateur ou fichier) : chaque categorie devient un projet ou reste perso. */
export function RepriseDialog({ plan, onClose }: { plan: PlanReprise | null; onClose: () => void }) {
  const { projets } = useDonnees();
  const { creerProjet, ajouterNotes } = useActions();
  const [choix, setChoix] = useState<Choix>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (plan) setChoix(choixParDefaut(plan.categories)); }, [plan]);
  if (!plan) return null;
  const nb = (c: string | null) => plan.notes.filter((n) => n.projet === c).length;

  const lancer = async () => {
    setBusy(true);
    try {
      // Projets : reutilises s'ils existent deja (meme nom), crees sinon
      const ids = new Map(projets.map((p) => [p.nom.trim().toLowerCase(), p.id]));
      const projetDe = new Map<string, string | null>();
      for (const c of plan.categories) {
        const ch = choix[c];
        if (!ch || ch.mode === "perso") { projetDe.set(c, null); continue; }
        const cle = ch.nom.trim().toLowerCase();
        if (!ids.has(cle)) {
          const p = await creerProjet(ch.nom, "");
          if (!p) return;
          ids.set(cle, p.id);
        }
        projetDe.set(c, ids.get(cle)!);
      }
      const lignes = plan.notes.map((n, i) => ({
        projet_id: n.projet ? projetDe.get(n.projet) ?? null : null, texte: n.texte, statut: n.statut, echeance: n.echeance,
        flash: n.flash, archive: n.archive, created_at: n.created_at, ordre: i,
      }));
      for (let i = 0; i < lignes.length; i += 200) if (!(await ajouterNotes(lignes.slice(i, i + 200)))) return;
      toast.success(`${lignes.length} note(s) importée(s).`);
      plan.apres?.();
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan.titre}</DialogTitle>
          <DialogDescription>{plan.notes.length} note(s). Choisissez où ranger chaque catégorie. Un projet existant du même nom est réutilisé.</DialogDescription>
        </DialogHeader>
        <ul className="max-h-[50vh] divide-y divide-border overflow-auto rounded-lg border border-border text-sm">
          {nb(null) > 0 && <li className="flex items-center justify-between p-2.5"><span>Sans catégorie · {nb(null)}</span><span className="text-muted-foreground">Perso</span></li>}
          {plan.categories.map((c) => {
            const ch = choix[c];
            return (
              <li key={c} className="flex items-center justify-between gap-3 p-2.5">
                <span className="min-w-0 truncate">{c} <span className="text-muted-foreground">· {nb(c)}</span></span>
                <select className="field w-56" aria-label={`Destination de ${c}`} value={ch?.mode === "projet" ? "projet" : "perso"}
                  onChange={(e) => setChoix({ ...choix, [c]: e.target.value === "perso" ? { mode: "perso" } : { mode: "projet", nom: c } })}>
                  <option value="perso">Notes perso</option>
                  <option value="projet">Projet « {c} »</option>
                </select>
              </li>
            );
          })}
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Plus tard</Button>
          <Button onClick={lancer} disabled={busy}>{busy ? "Import…" : "Importer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
