create or replace function public.is_public_store(vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.vendors v
    where v.id = vendor_id
      and v.approval_status::text = 'approved'
      and v.is_store_published is true
  );
$$;

revoke all on function public.is_public_store(uuid) from public;
grant execute on function public.is_public_store(uuid) to anon, authenticated;

create or replace function public.get_public_store_by_slug(p_store_slug text)
returns table (
  id uuid,
  business_name text,
  business_category text,
  business_description text,
  business_address text,
  city text,
  state text,
  phone text,
  store_name text,
  store_slug text,
  store_url text,
  store_logo_url text,
  store_banner_url text,
  store_brand_color text,
  is_store_published boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    v.id,
    v.business_name,
    v.business_category,
    v.business_description,
    v.business_address,
    v.city,
    v.state,
    v.phone,
    v.store_name,
    v.store_slug,
    v.store_url,
    v.store_logo_url,
    v.store_banner_url,
    v.store_brand_color,
    v.is_store_published
  from public.vendors v
  where v.store_slug = btrim(p_store_slug)
    and v.approval_status::text = 'approved'
    and v.is_store_published is true
  limit 1;
$$;

revoke all on function public.get_public_store_by_slug(text) from public;
grant execute on function public.get_public_store_by_slug(text) to anon, authenticated;

drop policy if exists "Public can view available products in public stores" on public.products;

create policy "Public can view available products in public stores"
on public.products
for select
to anon, authenticated
using (
  is_available is true
  and public.is_public_store(vendor_id)
);
