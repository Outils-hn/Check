import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { APP_AUTHOR, APP_NAME, APP_TAGLINE, APP_UPDATED, APP_VERSION, APP_YEAR } from "@/lib/version";
import { CheckMark } from "./CheckMark";
import { SauvegardeDialog } from "./SauvegardeDialog";

/** Signature discrete, identique aux autres applis : « Conçu par … » ouvre la fenetre « À propos ». */
export function AppFooter() {
  const [open, setOpen] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const lien = "text-inherit underline-offset-2 transition-colors hover:text-foreground hover:underline";
  return (
    <footer className="py-4 text-center">
      <p className="inline-block rounded-md bg-background px-2 py-0.5 text-xs text-muted-foreground">
        {APP_NAME} v{APP_VERSION} ·{" "}
        <button type="button" onClick={() => setOpen(true)} className={lien}>Conçu par {APP_AUTHOR}</button>{" "}
        · {APP_YEAR} ·{" "}
        <button type="button" onClick={() => setSauvegarde(true)} className={lien}>Sauvegarde</button>
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm text-left">
          <DialogHeader className="text-left">
            <DialogTitle className="mb-1 text-sm font-semibold text-foreground">À propos</DialogTitle>
            <DialogDescription className="sr-only">À propos de {APP_NAME}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <CheckMark size={40} />
            <div>
              <p className="text-lg font-bold leading-tight text-foreground">{APP_NAME}</p>
              <p className="text-xs text-muted-foreground">Version {APP_VERSION}</p>
            </div>
          </div>
          <p className="text-sm text-foreground">Conçu et développé par {APP_AUTHOR}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{APP_TAGLINE}</p>
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">Dernière mise à jour : {APP_UPDATED}</p>
        </DialogContent>
      </Dialog>
      <SauvegardeDialog open={sauvegarde} onOpenChange={setSauvegarde} />
    </footer>
  );
}
