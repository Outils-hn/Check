import { createClient } from "@supabase/supabase-js";

// Check range ses notes dans le projet Supabase d'INDEX : memes comptes, meme validation.
// Cle publique (« anon ») : elle ne donne que les droits prevus par les regles de la base.
export const BASE_URL = "https://dtxgvwaqjmmffiiohika.supabase.co";
export const BASE_KEY =
  "sb_publishable_yEWGxFFSLTE1lJRXnFUmpg_dMwa6LxW";
export const INDEX_URL = "https://outils-hn.github.io/Index";

// La cle « sb_publishable_ » n'est pas un jeton : on ne l'envoie jamais dans l'en-tete Authorization (seul le jeton du compte y va).
const fetchSansCleBearer: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  if (headers.get("Authorization") === `Bearer ${BASE_KEY}`) headers.delete("Authorization");
  return fetch(input, { ...init, headers });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = createClient(BASE_URL, BASE_KEY, {
  global: { fetch: fetchSansCleBearer },
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "sb-dtxgvwaqjmmffiiohika-auth-token", storage: typeof window !== "undefined" ? localStorage : undefined },
});
