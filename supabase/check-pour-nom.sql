-- Check 3.66 : « Pour » peut aussi etre un collegue sans compte (nom libre).
-- A coller une fois dans Supabase > SQL Editor. Sans danger si relance.
alter table public.check_notes add column if not exists pour_nom text;
alter table public.check_notes drop constraint if exists check_notes_pour_nom_longueur;
alter table public.check_notes add constraint check_notes_pour_nom_longueur check (pour_nom is null or length(trim(pour_nom)) between 1 and 60);
