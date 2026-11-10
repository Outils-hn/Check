-- Historique des changements d'une note (Check 3.17) : qui a change quoi, et quand. A coller UNE FOIS dans
-- Supabase > projet d'Index > SQL Editor > New query > Run. Relancer le script ne casse rien.
--
-- - Chaque changement de texte, statut, echeance, personne (« Pour »), projet, reponse, archivage ou corbeille est note.
-- - Visible par ceux qui voient la note (perso = son auteur, projet = l'equipe). Personne ne peut modifier l'historique :
--   il est ecrit uniquement par la base elle-meme.
-- - Il disparait avec la note supprimee definitivement.

create table if not exists public.check_notes_histo (
  id bigint generated always as identity primary key,
  note_id uuid not null references public.check_notes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  le timestamptz not null default now(),
  champ text not null,
  avant text,
  apres text
);
create index if not exists check_notes_histo_note on public.check_notes_histo (note_id, le desc);

alter table public.check_notes_histo enable row level security;
revoke all on public.check_notes_histo from anon;
revoke insert, update, delete on public.check_notes_histo from authenticated;
grant select on public.check_notes_histo to authenticated;
drop policy if exists "histo lecture" on public.check_notes_histo;
create policy "histo lecture" on public.check_notes_histo for select to authenticated
  using (public.is_approved() and exists (select 1 from public.check_notes n where n.id = note_id));

create or replace function public.check_notes_histo_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare qui uuid := auth.uid();
begin
  if new.texte is distinct from old.texte then insert into public.check_notes_histo (note_id, user_id, champ, avant, apres) values (new.id, qui, 'texte', left(old.texte, 300), left(new.texte, 300)); end if;
  if new.statut is distinct from old.statut then insert into public.check_notes_histo (note_id, user_id, champ, avant, apres) values (new.id, qui, 'statut', old.statut, new.statut); end if;
  if new.echeance is distinct from old.echeance then insert into public.check_notes_histo (note_id, user_id, champ, avant, apres) values (new.id, qui, 'echeance', old.echeance::text, new.echeance::text); end if;
  if new.pour is distinct from old.pour then insert into public.check_notes_histo (note_id, user_id, champ, avant, apres) values (new.id, qui, 'pour', old.pour::text, new.pour::text); end if;
  if new.projet_id is distinct from old.projet_id then insert into public.check_notes_histo (note_id, user_id, champ, avant, apres) values (new.id, qui, 'projet', old.projet_id::text, new.projet_id::text); end if;
  if new.reponse is distinct from old.reponse then insert into public.check_notes_histo (note_id, user_id, champ, avant, apres) values (new.id, qui, 'reponse', left(old.reponse, 300), left(new.reponse, 300)); end if;
  if new.archive is distinct from old.archive then insert into public.check_notes_histo (note_id, user_id, champ, avant, apres) values (new.id, qui, 'archive', old.archive::text, new.archive::text); end if;
  if (new.supprime_le is null) is distinct from (old.supprime_le is null) then insert into public.check_notes_histo (note_id, user_id, champ, avant, apres) values (new.id, qui, 'corbeille', (old.supprime_le is not null)::text, (new.supprime_le is not null)::text); end if;
  return new;
end $$;
drop trigger if exists check_notes_histo_trg on public.check_notes;
create trigger check_notes_histo_trg after update on public.check_notes
  for each row execute function public.check_notes_histo_log();
