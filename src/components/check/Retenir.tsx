import { useState } from "react";
import { Pin, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { filtrerFiches, useRetenir } from "@/lib/retenir";
import type { Compte } from "@/lib/notes";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-CH", { day: "2-digit", month: "short", year: "numeric" });

/** Page « À retenir » : ce que tout le bureau doit savoir (retours de l'atelier, « faire plutôt autrement »). */
export function Retenir({ moi, comptes }: { moi: string; comptes: Compte[] }) {
  const { fiches, chargement, erreur, ajouter, supprimer } = useRetenir();
  const [titre, setTitre] = useState(""), [detail, setDetail] = useState(""), [sujet, setSujet] = useState(""), [q, setQ] = useState("");
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  const nomDe = (id: string) => comptes.find((c) => c.id === id)?.nom || "Un collègue";
  const liste = filtrerFiches(fiches, q);

  const envoyer = async () => {
    if (!titre.trim()) return;
    if (await ajouter({ titre, detail, sujet })) { setTitre(""); setDetail(""); setSujet(""); }
  };

  return (
    <section className="min-w-0 space-y-4 max-lg:order-2" aria-label="À retenir">
      <div className="panel p-4">
        <h2 className="card-title flex items-center gap-1.5"><Pin className="size-4" aria-hidden="true" />À retenir</h2>
        <p className="mt-1 text-sm text-muted-foreground">Ce que tout le bureau doit savoir : retours de l'atelier, « à faire plutôt autrement ». Visible par tous les comptes validés.</p>
        <div className="mt-3 grid gap-2">
          <Input value={titre} maxLength={120} onChange={(e) => setTitre(e.target.value)} placeholder="L'essentiel en une phrase (ex. Coller le joint avant la pose du capot)" aria-label="L'essentiel en une phrase"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void envoyer(); } }} />
          <Textarea value={detail} maxLength={1500} onChange={(e) => setDetail(e.target.value)} placeholder="Détail ou pourquoi (facultatif)" aria-label="Détail" rows={2} />
          <div className="flex flex-wrap gap-2">
            <Input className="min-w-[160px] flex-1" value={sujet} maxLength={60} onChange={(e) => setSujet(e.target.value)} placeholder="Sujet (ex. Étanchéité, Atelier, Isolation)" aria-label="Sujet" />
            <Button onClick={() => void envoyer()} disabled={!titre.trim()}>Ajouter</Button>
          </div>
        </div>
      </div>

      <div className="panel p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans « À retenir »" aria-label="Rechercher dans À retenir" />
        </div>
      </div>

      {erreur ? (
        <p className="note-check" role="status">La page « À retenir » n'est pas encore activée : le script SQL « check-retenir.sql » doit être lancé une fois dans Supabase.</p>
      ) : chargement ? null : liste.length === 0 ? (
        <p className="panel p-6 text-center text-sm text-muted-foreground">{fiches.length ? "Aucun résultat." : "Rien pour l'instant. Ajoutez le premier retour : tout le bureau le verra."}</p>
      ) : (
        <ul className="space-y-2">
          {liste.map((f) => (
            <li key={f.id} className="panel p-4" data-retenir>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{f.titre}</p>
                  {f.detail && <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">{f.detail}</p>}
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {f.sujet && <span className="rounded-full border border-border px-2 py-0.5">{f.sujet}</span>}
                    <span>par {nomDe(f.auteur)} · {fmtDate(f.created_at)}</span>
                  </p>
                </div>
                {f.auteur === moi && (aSupprimer === f.id ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="destructive" onClick={() => { void supprimer(f.id); setASupprimer(null); }}>Supprimer</Button>
                    <Button size="sm" variant="ghost" onClick={() => setASupprimer(null)}>Non</Button>
                  </div>
                ) : (
                  <Button size="icon" variant="ghost" className="size-11 md:size-8" aria-label={`Supprimer « ${f.titre} »`} onClick={() => setASupprimer(f.id)}><Trash2 className="size-4" /></Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
