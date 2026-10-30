import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { db } from "@/lib/base";

/** Session du compte Index (connexion faite dans Check, comptes crees et valides dans Index). */
export function useCompte() {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [pret, setPret] = useState(false);
  useEffect(() => {
    db.auth.getSession().then(({ data }: { data: { session: Session | null } }) => { setSession(data.session); setPret(true); });
    const { data } = db.auth.onAuthStateChange((_e: string, s: Session | null) => {
      setSession(s);
      qc.invalidateQueries({ queryKey: ["check"] });
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);
  const uid = session?.user?.id ?? null;
  const valide = useQuery({
    queryKey: ["check", "valide", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await db.rpc("is_approved");
      if (error) throw error;
      return !!data;
    },
  });
  return { pret, session, uid, email: session?.user?.email ?? "", valide: !!uid && valide.data === true, enAttente: !!uid && valide.data === false };
}

export async function connexion(email: string, motDePasse: string): Promise<string | null> {
  const { error } = await db.auth.signInWithPassword({ email: email.trim(), password: motDePasse });
  if (!error) return null;
  return /invalid login/i.test(error.message) ? "Email ou mot de passe incorrect." : /confirm/i.test(error.message) ? "Adresse email pas encore confirmée : ouvrez le lien reçu par email." : error.message;
}
export const deconnexion = () => db.auth.signOut();
