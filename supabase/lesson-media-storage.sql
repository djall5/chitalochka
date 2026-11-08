-- Lesson images, colouring maps and warm-up videos are stored outside the
-- teacher_workspaces JSON document. Run once in the Supabase SQL Editor.
-- Files are public only for viewing: uploading, replacing and deleting remains
-- restricted to the signed-in teacher and that teacher's own folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-media',
  'lesson-media',
  true,
  12582912,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Everyone can view lesson media" on storage.objects;
create policy "Everyone can view lesson media"
  on storage.objects for select
  using (bucket_id = 'lesson-media');

drop policy if exists "Teachers can upload their lesson media" on storage.objects;
create policy "Teachers can upload their lesson media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lesson-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Teachers can update their lesson media" on storage.objects;
create policy "Teachers can update their lesson media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'lesson-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'lesson-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Teachers can delete their lesson media" on storage.objects;
create policy "Teachers can delete their lesson media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'lesson-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
