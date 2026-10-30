-- Check dans le projet Supabase d'INDEX (memes comptes que Index et Access) : a coller UNE FOIS dans
-- Supabase > projet d'Index > SQL Editor > New query > Run. Relancer le script ne casse rien.
--
-- - « check_projets » : les projets de Check, chacun avec son equipe (« check_membres »).
--   On entre dans une equipe sur invitation d'un membre ; le createur est le premier membre.
-- - « check_notes » : une note sans projet est PERSO (visible par son auteur seul) ;
--   une note de projet est visible et modifiable par toute l'equipe du projet.
--   « pour » = la personne a qui la note est confiee (membre du projet).
-- - Tout est reserve aux comptes VALIDES dans Index. Corbeille videe apres 30 jours.

create table if not exists public.check_projets (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(trim(nom)) between 1 and 80),
  numero text not null default '' check (length(numero) <= 30),
  cree_par uuid not null default auth.uid() references auth.users(id) on delete set null,
  archive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.check_projets alter column cree_par drop not null;

create table if not exists public.check_membres (
  projet_id uuid not null references public.check_projets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ajoute_par uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (projet_id, user_id)
);

create table if not exists public.check_notes (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid references public.check_projets(id) on delete cascade,
  auteur uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pour uuid references auth.users(id) on delete set null,
  texte text not null check (length(trim(texte)) between 1 and 4000),
  statut text not null default 'todo' check (statut in ('todo', 'in_progress', 'waiting', 'done')),
  echeance date,
  flash boolean not null default false,
  archive boolean not null default false,
  ordre double precision not null default 0,
  regle_le timestamptz,
  supprime_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists check_notes_projet on public.check_notes (projet_id);
create index if not exists check_notes_pour on public.check_notes (pour);

-- Membre d'un projet ? (SECURITY DEFINER : evite que les regles se lisent elles-memes en boucle)
create or replace function public.check_est_membre(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.check_membres where projet_id = p and user_id = auth.uid())
$$;
revoke all on function public.check_est_membre(uuid) from public;
grant execute on function public.check_est_membre(uuid) to authenticated;

-- Comptes valides proposes a l'invitation (nom lisible, jamais rien d'autre que nom + email)
create or replace function public.check_comptes() returns table (id uuid, nom text, email text)
language sql stable security definer set search_path = public as $$
  select p.id,
         coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), nullif(p.display_name, ''), p.email),
         p.email
  from public.profiles p
  where p.approved and public.is_approved()
  order by 2
$$;
revoke all on function public.check_comptes() from public;
grant execute on function public.check_comptes() to authenticated;

-- Le createur d'un projet en devient automatiquement membre
create or replace function public.check_projet_createur() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.check_membres (projet_id, user_id, ajoute_par) values (new.id, auth.uid(), auth.uid())
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists check_projet_createur on public.check_projets;
create trigger check_projet_createur after insert on public.check_projets
  for each row execute function public.check_projet_createur();

-- Note : « pour » doit etre membre du projet (ou soi-meme pour une note perso), dates tenues a jour
create or replace function public.check_note_controle() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pour is not null then
    if new.projet_id is null and new.pour <> new.auteur then
      raise exception 'Une note perso ne peut pas être confiée à quelqu''un d''autre';
    end if;
    if new.projet_id is not null and not exists (select 1 from public.check_membres where projet_id = new.projet_id and user_id = new.pour) then
      raise exception 'La personne choisie ne fait pas partie de l''équipe du projet';
    end if;
  end if;
  if tg_op = 'UPDATE' then
    new.auteur := old.auteur; -- l'auteur ne change jamais
    new.updated_at := now();
  end if;
  if new.statut = 'done' and (tg_op = 'INSERT' or old.statut <> 'done') then new.regle_le := now(); end if;
  if new.statut <> 'done' then new.regle_le := null; end if;
  return new;
end $$;
drop trigger if exists check_note_controle on public.check_notes;
create trigger check_note_controle before insert or update on public.check_notes
  for each row execute function public.check_note_controle();

alter table public.check_projets enable row level security;
alter table public.check_membres enable row level security;
alter table public.check_notes enable row level security;
revoke all on public.check_projets, public.check_membres, public.check_notes from anon;
grant select, insert, update, delete on public.check_projets, public.check_membres, public.check_notes to authenticated;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and tablename in ('check_projets', 'check_membres', 'check_notes') loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Projets : visibles et modifiables par l'equipe ; creation par tout compte valide ; suppression par le createur
create policy "projets lecture" on public.check_projets for select to authenticated
  using (public.is_approved() and (public.check_est_membre(id) or cree_par = auth.uid()));
create policy "projets creation" on public.check_projets for insert to authenticated
  with check (public.is_approved() and cree_par = auth.uid());
create policy "projets modif" on public.check_projets for update to authenticated
  using (public.is_approved() and public.check_est_membre(id)) with check (public.is_approved() and public.check_est_membre(id));
create policy "projets suppression" on public.check_projets for delete to authenticated
  using (public.is_approved() and cree_par = auth.uid());

-- Equipes : un membre voit l'equipe, invite un compte valide, retire quelqu'un ou quitte le projet
create policy "membres lecture" on public.check_membres for select to authenticated
  using (public.is_approved() and public.check_est_membre(projet_id));
create policy "membres invitation" on public.check_membres for insert to authenticated
  with check (public.is_approved() and public.check_est_membre(projet_id) and ajoute_par = auth.uid()
              and exists (select 1 from public.profiles p where p.id = user_id and p.approved));
create policy "membres retrait" on public.check_membres for delete to authenticated
  using (public.is_approved() and public.check_est_membre(projet_id));

-- Notes : perso = son auteur ; projet = l'equipe
create policy "notes lecture" on public.check_notes for select to authenticated
  using (public.is_approved() and ((projet_id is null and auteur = auth.uid()) or public.check_est_membre(projet_id)));
create policy "notes creation" on public.check_notes for insert to authenticated
  with check (public.is_approved() and auteur = auth.uid() and (projet_id is null or public.check_est_membre(projet_id)));
create policy "notes modif" on public.check_notes for update to authenticated
  using (public.is_approved() and ((projet_id is null and auteur = auth.uid()) or public.check_est_membre(projet_id)))
  with check (public.is_approved() and ((projet_id is null and auteur = auth.uid()) or public.check_est_membre(projet_id)));
create policy "notes suppression" on public.check_notes for delete to authenticated
  using (public.is_approved() and ((projet_id is null and auteur = auth.uid()) or public.check_est_membre(projet_id)));

-- Corbeille videe apres 30 jours (appelee par l'appli a l'ouverture)
create or replace function public.check_vider_corbeille() returns void
language sql security definer set search_path = public as $$
  delete from public.check_notes where supprime_le < now() - interval '30 days'
    and ((projet_id is null and auteur = auth.uid()) or public.check_est_membre(projet_id))
$$;
revoke all on function public.check_vider_corbeille() from public;
grant execute on function public.check_vider_corbeille() to authenticated;

-- Mises a jour en direct : ce qu'un collegue change apparait sans recharger (les regles ci-dessus s'appliquent)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'check_notes') then
    alter publication supabase_realtime add table public.check_notes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'check_membres') then
    alter publication supabase_realtime add table public.check_membres;
  end if;
end $$;
