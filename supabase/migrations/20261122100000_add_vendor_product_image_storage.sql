begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
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

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "Vendors can upload product images" on storage.objects;
create policy "Vendors can upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and exists (
    select 1
    from public.vendors v
    where v.id::text = (storage.foldername(name))[1]
      and v.auth_user_id = auth.uid()
  )
);

drop policy if exists "Vendors can update product images" on storage.objects;
create policy "Vendors can update product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and exists (
    select 1
    from public.vendors v
    where v.id::text = (storage.foldername(name))[1]
      and v.auth_user_id = auth.uid()
  )
)
with check (
  bucket_id = 'product-images'
  and exists (
    select 1
    from public.vendors v
    where v.id::text = (storage.foldername(name))[1]
      and v.auth_user_id = auth.uid()
  )
);

drop policy if exists "Vendors can delete product images" on storage.objects;
create policy "Vendors can delete product images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and exists (
    select 1
    from public.vendors v
    where v.id::text = (storage.foldername(name))[1]
      and v.auth_user_id = auth.uid()
  )
);

commit;
