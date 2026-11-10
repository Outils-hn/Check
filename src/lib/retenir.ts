import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { db } from "@/lib/base";
import { useCompte } from "@/lib/compte";
import { sansAccents } from "@/lib/notes";

// « À retenir » : retours de l'atelier visibles par tout le bureau (table check_retenir, voir supabase/check-retenir.sql).
export type Fiche = { id: string; auteur: string; titre: string; detail: string; sujet: string; created_at: string };

/** Recherche sans accents dans le titre, le detail et le sujet ; les plus recentes d'abord. */
export function filtrerFiches(fiches: Fiche[], q: string): Fiche[] {
  const mots = sansAccents(q).split(/\s+/).filter(Boolean);
  return fiches
    .filter((f) => { const t = sansAccents(`${f.titre} ${f.detail} ${f.sujet}`); return mots.every((m) => t.includes(m)); })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function useRetenir() {
  const { valide, uid } = useCompte();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["check", "retenir"], enabled: valide, staleTime: 60_000, refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await db.from("check_retenir").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Fiche[];
    },
  });
  const run = async (p: Promise<{ error: { message?: string; code?: string } | null }>) => {
    const { error } = await p;
    await qc.invalidateQueries({ queryKey: ["check", "retenir"] });
    if (error) {
      toast.error(error.code === "42P01" ? "La page « À retenir » n'est pas encore activée dans la base (script SQL à lancer)." : /fetch|network|Load failed/i.test(error.message ?? "") ? "Base injoignable : rien n'a été enregistré." : "Refusé : " + (error.message ?? "erreur"));
      return false;
    }
    return true;
  };
  return {
    fiches: q.data ?? [], chargement: q.isLoading, erreur: q.isError,
    ajouter: (f: { titre: string; detail: string; sujet: string }) => run(db.from("check_retenir").insert({ ...f, titre: f.titre.trim(), detail: f.detail.trim(), sujet: f.sujet.trim(), auteur: uid })),
    supprimer: (id: string) => run(db.from("check_retenir").delete().eq("id", id)),
  };
}
