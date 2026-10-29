import { createClient } from "@supabase/supabase-js";

// Check range ses notes dans le projet Supabase d'INDEX : memes comptes, meme validation.
// Cle publique (« anon ») : elle ne donne que les droits prevus par les regles de la base.
export const BASE_URL = "https://ngfzwfbraqkdcocdcmib.supabase.co";
export const BASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nZnp3ZmJyYXFrZGNvY2RjbWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2Mzg2NTcsImV4cCI6MjA5NTIxNDY1N30.Ikovcm4eWkLvPO_PvkI8C8DJebBT011Rz87k_EYFdbU";
export const INDEX_URL = "https://index-hn.lovable.app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = createClient(BASE_URL, BASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "check-session", storage: typeof window !== "undefined" ? localStorage : undefined },
});
