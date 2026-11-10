import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/base";
import { LIBELLE, type Statut } from "@/lib/notes";

// Historique d'une note (table check_notes_histo, voir supabase/check-historique.sql) : qui a change quoi, et quand.
export type Evenement = { id: number; user_id: string | null; le: string; champ: string; avant: string | null; apres: string | null };

export function useHistorique(noteId: string, actif: boolean) {
  return useQuery({
    queryKey: ["check", "histo", noteId], enabled: actif, staleTime: 0,
    queryFn: async () => {
      const { data, error } = await db.from("check_notes_histo").select("*").eq("note_id", noteId).order("le", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as Evenement[];
    },
  });
}

const court = (s: string | null, n = 60) => (s == null || s === "" ? "vide" : s.length > n ? s.slice(0, n - 1) + "…" : s);
const jour = (iso: string | null) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("fr-CH", { day: "2-digit", month: "short", year: "numeric" }) : "aucune");

/** Phrase lisible pour un evenement (les noms de personnes et de projets viennent de l'appli). */
export function decrire(e: Evenement, nomPersonne: (id: string | null) => string, nomProjet: (id: string | null) => string): string {
  switch (e.champ) {
    case "statut": return `Statut : ${LIBELLE[e.avant as Statut] ?? e.avant} → ${LIBELLE[e.apres as Statut] ?? e.apres}`;
    case "echeance": return `Échéance : ${jour(e.avant)} → ${jour(e.apres)}`;
    case "pour": return `Confiée à : ${e.avant ? nomPersonne(e.avant) : "personne"} → ${e.apres ? nomPersonne(e.apres) : "personne"}`;
    case "projet": return `Projet : ${nomProjet(e.avant)} → ${nomProjet(e.apres)}`;
    case "texte": return `Texte modifié : « ${court(e.avant)} » → « ${court(e.apres)} »`;
    case "reponse": return e.avant ? `Réponse modifiée : « ${court(e.avant)} » → « ${court(e.apres)} »` : `Réponse ajoutée : « ${court(e.apres)} »`;
    case "archive": return e.apres === "true" ? "Note archivée" : "Note désarchivée";
    case "corbeille": return e.apres === "true" ? "Mise à la corbeille" : "Restaurée de la corbeille";
    default: return e.champ;
  }
}
