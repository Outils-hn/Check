import { useEffect, useState, type ReactNode } from "react";
import { LogIn, LogOut, Moon, Sun } from "lucide-react";
import { deconnexion, useCompte } from "@/lib/compte";
import { useDonnees } from "@/lib/donnees";
import { SelecteurApplis } from "./SelecteurApplis";
import { CheckMark } from "./CheckMark";
import { AppFooter } from "./AppFooter";
import { Bandeau } from "./Bandeau";
import { ConnexionDialog } from "./ConnexionDialog";

const THEME_KEY = "check-theme";
// Reglage commun a toutes les applis (meme site) : le choix clair / sombre suit d\'une appli a l\'autre.
const SHARED_THEME_KEY = "outils-theme";

/** Theme clair / sombre retenu sur l'ordinateur ; la classe est posee avant l'affichage (voir __root.tsx). */
function useTheme() {
  const [dark, setDarkState] = useState(false);
  useEffect(() => {
    let d = false;
    try { d = (localStorage.getItem(SHARED_THEME_KEY) || localStorage.getItem(THEME_KEY)) === "dark"; } catch { /* stockage bloque */ }
    document.documentElement.classList.toggle("dark", d);
    setDarkState(d);
  }, []);
  const toggle = () => setDarkState((d) => {
    const next = !d;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); localStorage.setItem(SHARED_THEME_KEY, next ? "dark" : "light"); } catch { /* stockage bloque */ }
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
      <Bandeau
        marque={<>
          <CheckMark />
          <SelecteurApplis />
          <span className="sr-only">Notes et tâches</span>
        </>}
        statut={<>
          {pret && !uid && (
            <>
              <span className="bandeau-statut">Lecture seule</span>
              <button className="bandeau-btn" onClick={() => setConnexion(true)}><LogIn /> Se connecter</button>
            </>
          )}
          {uid && (
            <>
              {valide && <span className="bandeau-statut ouvert" title={email}>{email}</span>}
              {enAttente && <span className="bandeau-statut" title={email}>Compte en attente de validation</span>}
              <button className="bandeau-btn" onClick={() => deconnexion()}><LogOut /> Déconnexion</button>
            </>
          )}
        </>}
        theme={
          <button onClick={setDark} className="bandeau-icone" aria-label="Basculer le thème">
            {dark ? <Sun /> : <Moon />}
          </button>
        }
      />
      {horsLigne && (
        <div role="status" className="border-b border-border bg-muted px-4 py-2 text-center text-xs text-foreground">
          Base de données injoignable : affichage de la copie locale du {fmtDate(horsLigne)}, en lecture seule.
        </div>
      )}
      <main className="page flex-1 py-6">{children}</main>
      <AppFooter />
      <ConnexionDialog open={connexion} onOpenChange={setConnexion} />
    </div>
  );
}
