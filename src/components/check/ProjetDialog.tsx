import { useEffect, useState } from "react";
import { LogOut, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompte } from "@/lib/compte";
import { useActions, useComptes, useDonnees } from "@/lib/donnees";
import type { Projet } from "@/lib/notes";

/** Creation d'un projet, ou reglages d'un projet existant : nom, numero, equipe. */
export function ProjetDialog({ open, onOpenChange, projet, onCree }: { open: boolean; onOpenChange: (o: boolean) => void; projet: Projet | null; onCree?: (id: string) => void }) {
  const { uid } = useCompte();
  const { membres, notes } = useDonnees();
  const comptes = useComptes();
  const { creerProjet, modifierProjet, supprimerProjet, inviter, retirer } = useActions();
  const [nom, setNom] = useState("");
  const [numero, setNumero] = useState("");
  const [invite, setInvite] = useState("");
  const [confirmer, setConfirmer] = useState(false);
  useEffect(() => { if (open) { setNom(projet?.nom ?? ""); setNumero(projet?.numero ?? ""); setInvite(""); setConfirmer(false); } }, [open, projet]);

  const equipe = projet ? membres.filter((m) => m.projet_id === projet.id).map((m) => m.user_id) : [];
  const nomDe = (id: string) => comptes.find((c) => c.id === id)?.nom ?? "Compte";
  const invitables = comptes.filter((c) => !equipe.includes(c.id));
  const nbNotes = projet ? notes.filter((n) => n.projet_id === projet.id).length : 0;
  const modifie = !!projet && (nom.trim() !== projet.nom || numero.trim() !== projet.numero);

  const enregistrer = async () => {
    if (!open || !nom.trim()) return;
    if (!projet) {
      const p = await creerProjet(nom, numero);
      if (p) { onCree?.(p.id); onOpenChange(false); }
    } else if (modifie) await modifierProjet(projet.id, { nom: nom.trim(), numero: numero.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{projet ? "Projet et équipe" : "Nouveau projet"}</DialogTitle>
          <DialogDescription>{projet ? "Les notes du projet sont visibles par toute l'équipe." : "Vous en serez le premier membre ; invitez ensuite vos collègues."}</DialogDescription>
        </DialogHeader>
        <form id="form-projet" className="grid grid-cols-[8rem_1fr] gap-3" onSubmit={(e) => { e.preventDefault(); enregistrer(); }}>
          <div className="space-y-1.5"><Label htmlFor="p-num">Numéro</Label><Input id="p-num" placeholder="facultatif" value={numero} onChange={(e) => setNumero(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="p-nom">Nom *</Label><Input id="p-nom" autoFocus={!projet} value={nom} onChange={(e) => setNom(e.target.value)} /></div>
        </form>
        {projet && modifie && <div className="flex justify-end"><Button size="sm" type="submit" form="form-projet">Enregistrer le nom</Button></div>}

        {projet && (
          <section className="space-y-2">
            <h3 className="card-title">Équipe · {equipe.length}</h3>
            <ul className="divide-y divide-border rounded-lg border border-border text-sm">
              {equipe.map((id) => (
                <li key={id} className="flex items-center justify-between px-3 py-2">
                  <span>{nomDe(id)}{id === uid && <span className="text-muted-foreground"> (vous)</span>}</span>
                  {id === uid ? (
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={async () => { if (await retirer(projet.id, id)) onOpenChange(false); }}><LogOut className="size-3.5" /> Quitter</Button>
                  ) : (
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => retirer(projet.id, id)} aria-label={`Retirer ${nomDe(id)} de l'équipe`}><X className="size-3.5" /></Button>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <select className="field flex-1" aria-label="Collègue à inviter" value={invite} onChange={(e) => setInvite(e.target.value)}>
                <option value="">{invitables.length ? "Inviter un collègue…" : "Tous les comptes validés sont déjà membres"}</option>
                {invitables.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <Button variant="outline" className="gap-1.5" disabled={!invite} onClick={async () => { if (await inviter(projet.id, invite)) setInvite(""); }}><UserPlus className="size-4" /> Inviter</Button>
            </div>
            <p className="text-xs text-muted-foreground">Seuls les comptes validés dans Index apparaissent.</p>
          </section>
        )}

        <DialogFooter className="sm:justify-between">
          {projet && projet.cree_par === uid ? (
            confirmer ? (
              <Button variant="ghost" className="gap-1.5 text-destructive hover:text-destructive" onClick={async () => { if (await supprimerProjet(projet.id)) onOpenChange(false); }}>
                <Trash2 className="size-4" /> Confirmer : supprimer avec ses {nbNotes} note(s)
              </Button>
            ) : (
              <Button variant="ghost" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setConfirmer(true)}><Trash2 className="size-4" /> Supprimer le projet</Button>
            )
          ) : <span />}
          <div className="flex gap-2">
            {projet ? <Button variant="outline" onClick={async () => { await modifierProjet(projet.id, { archive: !projet.archive }); onOpenChange(false); }}>{projet.archive ? "Réactiver" : "Archiver le projet"}</Button> : null}
            {!projet && <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>}
            {!projet ? <Button key="creer" type="submit" form="form-projet" disabled={!nom.trim()}>Créer</Button> : <Button key="fermer" type="button" onClick={() => onOpenChange(false)}>Fermer</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
