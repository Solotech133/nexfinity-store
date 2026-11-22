begin;

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

drop policy if exists "Public can view available products in public stores"
on public.products;

create policy "Public can view available products in public stores"
on public.products
for select
to anon, authenticated
using (
  is_available is true
  and public.is_public_store(vendor_id)
);

commit;
