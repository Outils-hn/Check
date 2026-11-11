import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BUCKET, extension } from "@/lib/images";
import { toast } from "sonner";
import { db } from "@/lib/base";
import { useCompte } from "@/lib/compte";
import type { Compte, Membre, Note, Projet } from "@/lib/notes";

const COPIE = "check-copie-locale";
type Donnees = { projets: Projet[]; membres: Membre[]; notes: Note[]; horsLigne?: string };
const vide: Donnees = { projets: [], membres: [], notes: [] };

async function charger(uid: string): Promise<Donnees> {
  try {
    const [p, m, n] = await Promise.all([
      db.from("check_projets").select("id,nom,numero,cree_par,archive").order("nom"),
      db.from("check_membres").select("projet_id,user_id"),
      db.from("check_notes").select("*"),
    ]);
    const err = p.error || m.error || n.error;
    if (err) throw err;
    const d: Donnees = { projets: p.data ?? [], membres: m.data ?? [], notes: n.data ?? [] };
    // Copie locale pour le hors-ligne, propre a ce compte
    try { localStorage.setItem(COPIE, JSON.stringify({ uid, ...d, le: new Date().toISOString() })); } catch { /* stockage plein */ }
    return d;
  } catch (e) {
    try {
      const c = JSON.parse(localStorage.getItem(COPIE) ?? "null");
      if (c && c.uid === uid) return { projets: c.projets, membres: c.membres, notes: c.notes, horsLigne: c.le };
    } catch { /* copie illisible */ }
    throw e;
  }
}

/** Projets, equipes et notes du compte connecte (filtres par la base). */
export function useDonnees() {
  const { uid, valide } = useCompte();
  const q = useQuery({ queryKey: ["check", "donnees", uid], enabled: valide && !!uid, queryFn: () => charger(uid!), staleTime: 15_000, retry: 1 });

  return { ...(q.data ?? vide), chargement: q.isLoading, erreur: q.error as Error | null, recharger: () => q.refetch() };
}

/** Mises a jour en direct : a appeler UNE seule fois (dans le carnet). Ce qu'un collegue ajoute,
 *  regle ou supprime apparait sans recharger. */
export function useDirect() {
  const { uid, valide } = useCompte();
  const qc = useQueryClient();
  useEffect(() => {
    if (!valide || !uid) return;
    let attente: ReturnType<typeof setTimeout> | null = null;
    const recharger = () => { if (attente) clearTimeout(attente); attente = setTimeout(() => qc.invalidateQueries({ queryKey: ["check", "donnees"] }), 300); };
    const canal = db.channel("check-direct")
      .on("postgres_changes", { event: "*", schema: "public", table: "check_notes" }, recharger)
      .on("postgres_changes", { event: "*", schema: "public", table: "check_membres" }, recharger)
      .subscribe();
    return () => { if (attente) clearTimeout(attente); db.removeChannel(canal); };
  }, [valide, uid, qc]);

}

/** Comptes valides (nom + email), pour les equipes et « Pour : … ». */
export function useComptes() {
  const { valide } = useCompte();
  const q = useQuery({
    queryKey: ["check", "comptes"], enabled: valide, staleTime: 5 * 60_000,
    queryFn: async () => { const { data, error } = await db.rpc("check_comptes"); if (error) throw error; return (data ?? []) as Compte[]; },
  });
  return q.data ?? [];
}

/** Efface des fichiers du stockage (sans bruit si ca echoue : ils resteront simplement orphelins). */
async function effacerFichiers(chemins: string[]) {
  if (!chemins.length) return;
  try { await db.storage.from(BUCKET).remove(chemins); } catch { /* reseau */ }
}
const OFFLINE = "Base injoignable : vérifiez la connexion, rien n'a été enregistré.";
function message(e: { message?: string; code?: string }) {
  if (/fetch|network|Load failed/i.test(e.message ?? "")) return OFFLINE;
  if (e.code === "42501" || /row-level security/i.test(e.message ?? "")) return "Action refusée : vous n'êtes pas (ou plus) membre de ce projet.";
  if (e.code === "23505") return "Déjà présent.";
  if (e.code === "P0001") return e.message ?? "Refusé.";
  if (e.code === "23514") return "Valeur refusée : texte vide ou trop long.";
  return "Erreur : " + (e.message ?? "inconnue");
}

type Champs = Partial<Pick<Note, "images" | "projet_id" | "pour" | "texte" | "statut" | "echeance" | "flash" | "archive" | "ordre" | "atelier" | "tache" | "supprime_le" | "created_at" | "regle_le" | "reponse">>;

export function useActions() {
  const qc = useQueryClient();
  const { uid } = useCompte();
  const cle = ["check", "donnees", uid];
  async function run<T>(p: Promise<{ data: T; error: { message?: string; code?: string } | null }>, silencieux = false): Promise<T | null> {
    const { data, error } = await p;
    if (error) { if (!silencieux) toast.error(message(error)); await qc.invalidateQueries({ queryKey: ["check", "donnees"] }); return null; }
    await qc.invalidateQueries({ queryKey: ["check", "donnees"] });
    return data ?? (true as unknown as T);
  }
  /** Modification affichee tout de suite, puis envoyee (annulee si la base refuse). */
  async function modifier(id: string, champs: Champs) {
    qc.setQueryData<Donnees>(cle, (d) => (d ? { ...d, notes: d.notes.map((n) => (n.id === id ? { ...n, ...champs } : n)) } : d));
    return run(db.from("check_notes").update(champs).eq("id", id));
  }
  return {
    ajouterNote: (n: Champs & { texte: string }) => run<Note>(db.from("check_notes").insert({ ...n, auteur: uid }).select().single()),
    ajouterNotes: (liste: (Champs & { texte: string })[]) => run(db.from("check_notes").insert(liste.map((n) => ({ ...n, auteur: uid })))),
    modifier,
    mettreCorbeille: (id: string) => modifier(id, { supprime_le: new Date().toISOString() }),
    restaurer: (id: string) => modifier(id, { supprime_le: null }),
    supprimerDefinitivement: async (n: Note) => { await effacerFichiers(n.images ?? []); return run(db.from("check_notes").delete().eq("id", n.id)); },
    /** Envoie les images (deja compressees) puis les ajoute a la note. */
    ajouterImages: async (n: Note, blobs: Blob[]) => {
      const chemins: string[] = [];
      for (const b of blobs) {
        const chemin = `${n.id}/${crypto.randomUUID()}.${extension(b)}`;
        const { error } = await db.storage.from(BUCKET).upload(chemin, b, { contentType: b.type, upsert: false });
        if (error) { toast.error("Image non envoyée : " + (error.message ?? "erreur")); break; }
        chemins.push(chemin);
      }
      if (!chemins.length) return false;
      const ok = await modifier(n.id, { images: [...(n.images ?? []), ...chemins] });
      if (!ok) await effacerFichiers(chemins);
      return !!ok;
    },
    retirerImage: async (n: Note, chemin: string) => { const ok = await modifier(n.id, { images: (n.images ?? []).filter((c) => c !== chemin) }); if (ok) await effacerFichiers([chemin]); return !!ok; },
    /** Corbeille de plus de 30 jours : images effacees, puis notes videes par la base. */
    viderCorbeilleAvecImages: async (notes: Note[]) => {
      const vieilles = notes.filter((n) => n.supprime_le && Date.parse(n.supprime_le) < Date.now() - 30 * 86400000);
      await effacerFichiers(vieilles.flatMap((n) => n.images ?? []));
      return run(db.rpc("check_vider_corbeille"), true);
    },
    viderCorbeille: () => run(db.rpc("check_vider_corbeille"), true),
    creerProjet: (nom: string, numero: string) => run<Projet>(db.from("check_projets").insert({ nom: nom.trim(), numero: numero.trim(), cree_par: uid }).select().single()),
    modifierProjet: (id: string, champs: Partial<Pick<Projet, "nom" | "numero" | "archive">>) => run(db.from("check_projets").update({ ...champs, updated_at: new Date().toISOString() }).eq("id", id)),
    supprimerProjet: (id: string) => run(db.from("check_projets").delete().eq("id", id)),
    inviter: (projet_id: string, user_id: string) => run(db.from("check_membres").insert({ projet_id, user_id, ajoute_par: uid })),
    retirer: (projet_id: string, user_id: string) => run(db.from("check_membres").delete().eq("projet_id", projet_id).eq("user_id", user_id)),
  };
}
