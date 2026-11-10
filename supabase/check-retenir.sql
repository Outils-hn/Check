-- « À retenir » (Check 3.14) : retours de l'atelier et bonnes pratiques, visibles par TOUT LE BUREAU
-- (tout compte valide dans Index), meme hors des projets. A coller UNE FOIS dans
-- Supabase > projet d'Index > SQL Editor > New query > Run. Relancer le script ne casse rien.
-- Chacun ajoute ; seul l'auteur modifie ou supprime sa propre fiche.

create table if not exists public.check_retenir (
  id uuid primary key default gen_random_uuid(),
  auteur uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titre text not null check (length(trim(titre)) between 1 and 120),
  detail text not null default '' check (length(detail) <= 1500),
  sujet text not null default '' check (length(sujet) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.check_retenir enable row level security;
revoke all on public.check_retenir from anon;
grant select, insert, update, delete on public.check_retenir to authenticated;

do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'check_retenir' loop
    execute format('drop policy %I on public.check_retenir', r.policyname);
  end loop;
end $$;

create policy "retenir lecture" on public.check_retenir for select to authenticated
  using (public.is_approved());
create policy "retenir creation" on public.check_retenir for insert to authenticated
  with check (public.is_approved() and auteur = auth.uid());
create policy "retenir modif" on public.check_retenir for update to authenticated
  using (public.is_approved() and auteur = auth.uid()) with check (public.is_approved() and auteur = auth.uid());
create policy "retenir suppression" on public.check_retenir for delete to authenticated
  using (public.is_approved() and auteur = auth.uid());

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'check_retenir') then
    alter publication supabase_realtime add table public.check_retenir;
  end if;
end $$;
