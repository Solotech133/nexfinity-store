alter table public.order_items
  add column if not exists variant_id uuid,
  add column if not exists variant_name text,
  add column if not exists variant_color text,
  add column if not exists variant_size text,
  add column if not exists variant_attributes jsonb,
  add column if not exists variant_image_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_variant_id_fkey'
      and conrelid = 'public.order_items'::regclass
  ) then
    alter table public.order_items
      add constraint order_items_variant_id_fkey
      foreign key (variant_id)
      references public.product_variants(id)
      on delete set null;
  end;
end
$$;

create index if not exists order_items_variant_id_idx
  on public.order_items(variant_id);

create or replace function public.validate_variant_order_item()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_variant public.product_variants%rowtype;
  selected_product public.products%rowtype;
begin
  if new.variant_id is null then
    return new;
  end;

  if new.quantity is null or new.quantity < 1 then
    raise exception 'Variant quantity must be at least 1';
  end;

  select *
  into selected_variant
  from public.product_variants
  where id = new.variant_id
  for update;

  if not found then
    raise exception 'Selected variant no longer exists';
  end;

  if selected_variant.is_active is not true then
    raise exception 'Selected variant is unavailable';
  end;

  if selected_variant.stock_quantity < new.quantity then
    raise exception 'Insufficient variant stock';
  end;

  select *
  into selected_product
  from public.products
  where id = coalesce(new.product_id, selected_variant.product_id);

  if not found or selected_product.id <> selected_variant.product_id then
    raise exception 'Selected variant does not belong to this product';
  end;

  if selected_product.is_available is not true then
    raise exception 'Selected product is unavailable';
  end;

  new.product_id := selected_variant.product_id;
  new.product_name := selected_product.name;
  new.variant_name := selected_variant.variant_name;
  new.variant_color := selected_variant.color;
  new.variant_size := selected_variant.size;
  new.variant_attributes := selected_variant.attributes;
  new.variant_image_url := selected_variant.image_url;
  new.unit_price :=
    coalesce(selected_variant.price, selected_product.price);
  new.line_total := new.unit_price * new.quantity;

  update public.product_variants
  set stock_quantity = stock_quantity - new.quantity,
      updated_at = now()
  where id = selected_variant.id;

  return new;
end;
$$;

revoke all on function public.validate_variant_order_item() from public;

drop trigger if exists validate_variant_order_item_trigger
  on public.order_items;

create trigger validate_variant_order_item_trigger
before insert on public.order_items
for each row
execute function public.validate_variant_order_item();
