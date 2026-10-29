import { useEffect, useState, type ReactNode } from "react";
import { LogIn, Moon, Sun } from "lucide-react";
import { deconnexion, useCompte } from "@/lib/compte";
import { useDonnees } from "@/lib/donnees";
import { SelecteurApplis } from "./SelecteurApplis";
import { CheckMark } from "./CheckMark";
import { AppFooter } from "./AppFooter";
import { ConnexionDialog } from "./ConnexionDialog";

const THEME_KEY = "check-theme";

/** Theme clair / sombre retenu sur l'ordinateur ; la classe est posee avant l'affichage (voir __root.tsx). */
function useTheme() {
  const [dark, setDarkState] = useState(false);
  useEffect(() => {
    let d = false;
    try { d = localStorage.getItem(THEME_KEY) === "dark"; } catch { /* stockage bloque */ }
    document.documentElement.classList.toggle("dark", d);
    setDarkState(d);
  }, []);
  const toggle = () => setDarkState((d) => {
    const next = !d;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch { /* stockage bloque */ }
    return next;
  });
  return [dark, toggle] as const;
}

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString("fr-CH", { dateStyle: "short", timeStyle: "short" }) : "");

export function Shell({ children }: { children: ReactNode }) {
  const { pret, uid, email, valide, enAttente } = useCompte();
  const { horsLigne } = useDonnees();
  const [connexion, setConnexion] = useState(false);
  const [dark, setDark] = useTheme();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center gap-x-6 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <CheckMark />
            <SelecteurApplis />
            <span className="sr-only">Notes et tâches</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs">
            {pret && !uid && (
              <>
                <span className="status">Lecture seule</span>
                <button className="btn btn-sm" onClick={() => setConnexion(true)}><LogIn className="size-3.5" /> Se connecter</button>
              </>
            )}
            {uid && (
              <>
                {valide && <span className="status status-open" title={email}>{email}</span>}
                {enAttente && <span className="status" title={email}>Compte en attente de validation</span>}
                <button className="btn btn-sm" onClick={() => deconnexion()}>Déconnexion</button>
              </>
            )}
            <button onClick={setDark} className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Basculer le thème">
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </div>
      </header>
      {horsLigne && (
        <div role="status" className="border-b border-border bg-muted px-4 py-2 text-center text-xs text-foreground">
          Base de données injoignable : affichage de la copie locale du {fmtDate(horsLigne)}, en lecture seule.
        </div>
      )}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      <AppFooter />
      <ConnexionDialog open={connexion} onOpenChange={setConnexion} />
    </div>
  );
}
