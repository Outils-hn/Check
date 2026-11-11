import { useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const RACCOURCIS: { touches: string[]; texte: string }[] = [
  { touches: ["n"], texte: "Nouvelle note (place le curseur dans la saisie)" },
  { touches: ["/"], texte: "Rechercher une note (ou une tâche dans Questions Tâches)" },
  { touches: ["Échap"], texte: "Vider la recherche" },
  { touches: ["Entrée"], texte: "Ajouter la note" },
  { touches: ["Maj", "Entrée"], texte: "Aller à la ligne dans la note" },
  { touches: ["Ctrl", "clic"], texte: "Choisir plusieurs projets à la fois" },
  { touches: ["Ctrl", "V"], texte: "Coller une capture d'écran dans la note" },
  { touches: ["Ctrl", "K"], texte: "Rechercher dans toutes les applis" },
  { touches: ["?"], texte: "Afficher cette liste" },
];

/** Liste des raccourcis clavier ; « ? » l'ouvre depuis n'importe où (hors champ de saisie). */
export function RaccourcisDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "?") { e.preventDefault(); onOpenChange(true); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onOpenChange]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-left">
        <DialogHeader className="text-left">
          <DialogTitle className="text-sm font-semibold text-foreground">Raccourcis clavier</DialogTitle>
          <DialogDescription className="sr-only">Liste des raccourcis clavier de Check</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border text-sm">
          {RACCOURCIS.map((r) => (
            <li key={r.texte} className="flex items-center justify-between gap-4 py-2">
              <span className="text-foreground">{r.texte}</span>
              <span className="flex shrink-0 gap-1">
                {r.touches.map((t) => <kbd key={t} className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{t}</kbd>)}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
