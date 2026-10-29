import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { INDEX_URL } from "@/lib/base";
import { connexion } from "@/lib/compte";

/** Connexion avec le compte Index. Creation de compte et mot de passe oublie : dans Index. */
export function ConnexionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const valider = async () => {
    setBusy(true); setErreur(null);
    const e = await connexion(email, mdp);
    setBusy(false);
    if (e) setErreur(e); else { setMdp(""); onOpenChange(false); }
  };
  const lien = "underline underline-offset-2 hover:text-foreground";
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); setErreur(null); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Connexion</DialogTitle>
          <DialogDescription>Avec votre compte Index : mêmes email et mot de passe.</DialogDescription>
        </DialogHeader>
        <form id="form-connexion" className="space-y-3" onSubmit={(e) => { e.preventDefault(); valider(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-mdp">Mot de passe</Label>
            <Input id="c-mdp" type="password" autoComplete="current-password" value={mdp} onChange={(e) => setMdp(e.target.value)} />
          </div>
          {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
        </form>
        <p className="text-xs text-muted-foreground">
          Pas encore de compte ? <a className={lien} href={`${INDEX_URL}/auth`} target="_blank" rel="noopener noreferrer">Créer un compte dans Index</a>.
          Mot de passe oublié : <a className={lien} href={`${INDEX_URL}/auth`} target="_blank" rel="noopener noreferrer">depuis Index</a>.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="submit" form="form-connexion" disabled={busy || !email || !mdp}>{busy ? "Connexion…" : "Se connecter"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
