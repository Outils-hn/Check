-- Images dans les notes de Check (3.15) : photos et captures d'ecran, compressees dans le navigateur avant l'envoi
-- (WebP ~1600 px, quelques centaines de Ko). A coller UNE FOIS dans Supabase > projet d'Index > SQL Editor > New query > Run.
-- Relancer le script ne casse rien.
--
-- - 3 images au plus par note ; une image est visible et modifiable par ceux qui voient la note (perso = son auteur, projet = l'equipe).
-- - Stockage PRIVE : l'appli affiche les images par des liens temporaires.

alter table public.check_notes add column if not exists images text[] not null default '{}';
alter table public.check_notes drop constraint if exists check_notes_images_max;
alter table public.check_notes add constraint check_notes_images_max check (coalesce(array_length(images, 1), 0) <= 3);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('check-images', 'check-images', false, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = 1048576, allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

-- Les fichiers sont rangés dans un dossier portant l'identifiant de la note : « <note>/<fichier>.webp »
drop policy if exists "check images lecture" on storage.objects;
drop policy if exists "check images ajout" on storage.objects;
drop policy if exists "check images suppression" on storage.objects;

create policy "check images lecture" on storage.objects for select to authenticated
  using (bucket_id = 'check-images' and public.is_approved()
         and exists (select 1 from public.check_notes n where n.id::text = (storage.foldername(name))[1]));
create policy "check images ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'check-images' and public.is_approved()
         and exists (select 1 from public.check_notes n where n.id::text = (storage.foldername(name))[1]));
create policy "check images suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'check-images' and public.is_approved()
         and exists (select 1 from public.check_notes n where n.id::text = (storage.foldername(name))[1]));
