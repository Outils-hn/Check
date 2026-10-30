import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDonnees } from "@/lib/donnees";
import { useCompte } from "@/lib/compte";
import { exporter, planImport } from "@/lib/reprise";
import { RepriseDialog, type PlanReprise } from "./RepriseDialog";

export function SauvegardeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { valide } = useCompte();
  const { projets, notes } = useDonnees();
  const input = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<PlanReprise | null>(null);

  const telecharger = () => {
    const blob = new Blob([JSON.stringify(exporter(projets, notes), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `check-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const lire = async (f: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!f) return;
    try {
      const p = planImport(JSON.parse(await f.text()), notes);
      if (p.erreur) return toast.error(p.erreur);
      if (!p.notes.length) return toast.info("Rien de nouveau dans ce fichier : toutes ses notes sont déjà là.");
      onOpenChange(false);
      setPlan({ titre: "Importer une sauvegarde", categories: p.projets, notes: p.notes });
    } catch { toast.error("Fichier illisible : ce n'est pas un fichier JSON."); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md text-left">
          <DialogHeader>
            <DialogTitle>Sauvegarde</DialogTitle>
            <DialogDescription>Vos notes perso et celles de vos projets. L'import ajoute les notes absentes, sans rien écraser.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-1.5" disabled={!valide || !notes.length} onClick={telecharger}><Download className="size-4" /> Télécharger</Button>
            <Button variant="outline" className="flex-1 gap-1.5" disabled={!valide} onClick={() => input.current?.click()}><Upload className="size-4" /> Importer…</Button>
            <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={(e) => lire(e.target.files?.[0])} />
          </div>
        </DialogContent>
      </Dialog>
      <RepriseDialog plan={plan} onClose={() => setPlan(null)} />
    </>
  );
}
