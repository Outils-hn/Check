-- « Questions Tâches » (Check 3.31) : questions a poser a l'atelier ou aux monteurs, rangees par numero de tache dans un projet.
-- A coller UNE FOIS dans Supabase > projet d'Index > SQL Editor > New query > Run. Relancer le script ne casse rien.
-- Une question = une note de projet marquee « atelier », avec le numero de tache ; elle garde la reponse,
-- l'equipe du projet, la corbeille et l'historique comme toute note. Aucune nouvelle table, aucune regle d'acces modifiee.

alter table public.check_notes add column if not exists atelier boolean not null default false;
alter table public.check_notes add column if not exists tache text;
alter table public.check_notes drop constraint if exists check_notes_tache_longueur;
alter table public.check_notes add constraint check_notes_tache_longueur check (tache is null or length(tache) <= 60);
create index if not exists check_notes_atelier on public.check_notes (projet_id) where atelier;

-- Nom facultatif d'une tache (Check 3.35) : repete sur chaque question de la tache.
alter table public.check_notes add column if not exists tache_nom text;
alter table public.check_notes drop constraint if exists check_notes_tache_nom_longueur;
alter table public.check_notes add constraint check_notes_tache_nom_longueur check (tache_nom is null or length(tache_nom) <= 80);

-- Destinataire d'une question (Check 3.36) : atelier, montage ou fournisseur (avec son nom). Vide = atelier.
alter table public.check_notes add column if not exists destinataire text;
alter table public.check_notes add column if not exists fournisseur text;
alter table public.check_notes drop constraint if exists check_notes_destinataire_valeur;
alter table public.check_notes add constraint check_notes_destinataire_valeur check (destinataire is null or destinataire in ('atelier', 'montage', 'fournisseur'));
alter table public.check_notes drop constraint if exists check_notes_fournisseur_longueur;
alter table public.check_notes add constraint check_notes_fournisseur_longueur check (fournisseur is null or length(fournisseur) <= 60);
