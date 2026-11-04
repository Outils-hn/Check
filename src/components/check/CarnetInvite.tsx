import { useState } from "react";
import { LogIn, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApercuExemple } from "@/components/check/ApercuExemple";
import { LIBELLE, suivant, type Statut } from "@/lib/notes";
import {
  CLE_INVITE, MAX_INVITE, MAX_TEXTE_INVITE, ajouterInvite, changerStatutInvite, lireInvite, modifierTexteInvite, peutAjouter, supprimerInvite, type NoteInvite,
} from "@/lib/notes-invite";

const DOT: Record<Statut, string> = { todo: "var(--st-todo)", in_progress: "var(--st-progress)", waiting: "var(--st-waiting)", done: "var(--st-done)" };

/** Carnet d'essai sans compte : 5 notes perso gardees sur ce poste. Se connecter donne le carnet complet. */
export function CarnetInvite({ onConnexion }: { onConnexion: () => void }) {
  const [notes, setNotes] = useState<NoteInvite[]>(() => { try { return lireInvite(localStorage.getItem(CLE_INVITE)); } catch { return []; } });
  const [texte, setTexte] = useState("");
  const [edition, setEdition] = useState<{ id: string; texte: string } | null>(null);
  const maj = (n: NoteInvite[]) => { setNotes(n); try { localStorage.setItem(CLE_INVITE, JSON.stringify(n)); } catch { /* stockage bloque */ } };
  const complet = !peutAjouter(notes);
  const ajouter = () => { if (!texte.trim() || complet) return; maj(ajouterInvite(notes, texte)); setTexte(""); };
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="panel p-5">
        <h2 className="text-base font-semibold">Essayez Check sans compte</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gardez jusqu'à {MAX_INVITE} notes perso sur ce poste. Avec votre compte Index : notes illimitées, retrouvées sur tous vos postes, projets partagés avec l'équipe — et ces notes seront reprises.
        </p>
        <Button className="mt-3 gap-1.5" onClick={onConnexion}><LogIn className="size-4" /> Se connecter</Button>
      </section>
      <ApercuExemple />
      <section className="panel space-y-3 p-4">
        <h2 className="text-base font-semibold">À vous d'essayer, sans compte</h2>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); ajouter(); }}>
          <Textarea rows={3} className="resize-none" aria-label="Texte de la note" disabled={complet} maxLength={MAX_TEXTE_INVITE}
            placeholder={complet ? `Limite de ${MAX_INVITE} notes atteinte : connectez-vous pour en ajouter.` : "Écrivez votre note, Entrée pour ajouter…"}
            value={texte} onChange={(e) => setTexte(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ajouter(); } }} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">{notes.length} / {MAX_INVITE} notes</span>
            <Button type="submit" disabled={!texte.trim() || complet}>Ajouter</Button>
          </div>
        </form>
      </section>
      <ul className="space-y-2" aria-label="Notes d'essai">
        {notes.length === 0 && <li className="panel p-4 text-center text-sm text-muted-foreground">Aucune note pour l'instant.</li>}
        {notes.map((n) => (
          <li key={n.id} data-note={n.id} className="panel flex items-start gap-3 p-3">
            <button className="mt-0.5 flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground" aria-label={`Statut : ${LIBELLE[n.status]}. Cliquer pour changer`}
              onClick={() => maj(changerStatutInvite(notes, n.id, suivant(n.status)))}>
              <span className="size-2 rounded-full" style={{ background: DOT[n.status] }} />{LIBELLE[n.status]}
            </button>
            {edition?.id === n.id ? (
              <div className="min-w-0 flex-1 space-y-2">
                <Textarea rows={3} aria-label="Modifier la note" autoFocus maxLength={MAX_TEXTE_INVITE} value={edition.texte} onChange={(e) => setEdition({ id: n.id, texte: e.target.value })} />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEdition(null)}>Annuler</Button>
                  <Button size="sm" disabled={!edition.texte.trim()} onClick={() => { maj(modifierTexteInvite(notes, n.id, edition.texte)); setEdition(null); }}>Enregistrer</Button>
                </div>
              </div>
            ) : (
              <p className={`min-w-0 flex-1 whitespace-pre-wrap break-words text-sm ${n.status === "done" ? "text-muted-foreground line-through" : ""}`}>{n.text}</p>
            )}
            {edition?.id !== n.id && (
              <span className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" className="size-9" aria-label="Modifier la note" onClick={() => setEdition({ id: n.id, texte: n.text })}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="size-9" aria-label="Supprimer la note" onClick={() => maj(supprimerInvite(notes, n.id))}><Trash2 className="size-4" /></Button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
