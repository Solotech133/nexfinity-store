begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'store-assets',
  'store-assets',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]::text[]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]::text[];

drop policy if exists "Public can view store assets" on storage.objects;
create policy "Public can view store assets"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'store-assets');

drop policy if exists "Vendors can upload store assets" on storage.objects;
create policy "Vendors can upload store assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'store-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.vendors v
    where v.id::text = (storage.foldername(name))[2]
      and v.auth_user_id = auth.uid()
  )
);

drop policy if exists "Vendors can update store assets" on storage.objects;
create policy "Vendors can update store assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'store-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.vendors v
    where v.id::text = (storage.foldername(name))[2]
      and v.auth_user_id = auth.uid()
  )
)
with check (
  bucket_id = 'store-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.vendors v
    where v.id::text = (storage.foldername(name))[2]
      and v.auth_user_id = auth.uid()
  )
);

drop policy if exists "Vendors can delete store assets" on storage.objects;
create policy "Vendors can delete store assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'store-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.vendors v
    where v.id::text = (storage.foldername(name))[2]
      and v.auth_user_id = auth.uid()
  )
);

commit;
