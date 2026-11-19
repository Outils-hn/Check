-- « Rappel » (Check 3.79) : une remarque liee a une tache (« Ne pas oublier de commander les vis »), sans reponse attendue.
-- A coller UNE FOIS dans Supabase > projet d'Index > SQL Editor > New query > Run. Relancer le script ne casse rien.
-- Aucune nouvelle table ni colonne : on autorise seulement une valeur de plus pour le destinataire.

alter table public.check_notes drop constraint if exists check_notes_destinataire_valeur;
alter table public.check_notes add constraint check_notes_destinataire_valeur check (destinataire is null or destinataire in ('atelier', 'montage', 'fournisseur', 'rappel'));
