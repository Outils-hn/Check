-- « Questions Tâches » (Check 3.31) : questions a poser a l'atelier ou aux monteurs, rangees par numero de tache dans un projet.
-- A coller UNE FOIS dans Supabase > projet d'Index > SQL Editor > New query > Run. Relancer le script ne casse rien.
-- Une question = une note de projet marquee « atelier », avec le numero de tache ; elle garde la reponse,
-- l'equipe du projet, la corbeille et l'historique comme toute note. Aucune nouvelle table, aucune regle d'acces modifiee.

alter table public.check_notes add column if not exists atelier boolean not null default false;
alter table public.check_notes add column if not exists tache text;
alter table public.check_notes drop constraint if exists check_notes_tache_longueur;
alter table public.check_notes add constraint check_notes_tache_longueur check (tache is null or length(tache) <= 60);
create index if not exists check_notes_atelier on public.check_notes (projet_id) where atelier;
