begin;

-- Add variant snapshots and stock-restoration tracking to historical orders.
alter table public.order_items
  add column if not exists variant_id uuid,
  add column if not exists variant_name text,
  add column if not exists variant_color text,
  add column if not exists variant_size text,
  add column if not exists variant_attributes jsonb,
  add column if not exists variant_image_url text,
  add column if not exists stock_restored boolean not null default false;

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
  end if;
end;
$$;

create index if not exists order_items_variant_id_idx
  on public.order_items(variant_id);

create index if not exists order_items_variant_stock_restored_idx
  on public.order_items(order_id, variant_id, stock_restored)
  where variant_id is not null;

-- Validate and deduct variant stock when an order item is inserted.
-- The enclosing create_store_order call provides transaction/rollback semantics.
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
  if new.quantity is null or new.quantity < 1 then
    raise exception 'Quantity must be at least 1.';
  end if;

  -- NULL variant_id preserves the legacy base-product checkout path.
  if new.variant_id is null then
    select *
    into selected_product
    from public.products
    where id = new.product_id
    for update;

    if not found then
      raise exception 'A product in your cart is unavailable.';
    end if;

    if selected_product.is_available is not true then
      raise exception 'A product in your cart is unavailable.';
    end if;

    if selected_product.price is null or selected_product.price < 0 then
      raise exception 'This product has an invalid price.';
    end if;

    new.product_id := selected_product.id;
    new.product_name := selected_product.name;
    new.unit_price := selected_product.price;
    new.line_total := selected_product.price * new.quantity;
    new.variant_name := null;
    new.variant_color := null;
    new.variant_size := null;
    new.variant_attributes := null;
    new.variant_image_url := null;
    new.stock_restored := false;

    return new;
  end if;

  -- Lock the variant row to serialize concurrent purchases.
  select *
  into selected_variant
  from public.product_variants
  where id = new.variant_id
  for update;

  if not found then
    raise exception 'A selected variant no longer exists.';
  end if;

  if selected_variant.is_active is not true then
    raise exception 'A selected variant is unavailable.';
  end if;

  if selected_variant.stock_quantity is null
     or selected_variant.stock_quantity < new.quantity then
    raise exception 'Insufficient stock for a selected variant.';
  end if;

  select *
  into selected_product
  from public.products
  where id = coalesce(new.product_id, selected_variant.product_id)
  for update;

  if not found then
    raise exception 'A product in your cart is unavailable.';
  end if;

  if selected_variant.product_id <> selected_product.id then
    raise exception 'A selected variant does not belong to the selected product.';
  end if;

  if selected_product.is_available is not true then
    raise exception 'A product in your cart is unavailable.';
  end if;

  if selected_variant.price is not null
     and selected_variant.price < 0 then
    raise exception 'This variant has an invalid price.';
  end if;

  if selected_variant.price is null
     and (selected_product.price is null or selected_product.price < 0) then
    raise exception 'This product has an invalid price.';
  end if;

  -- Conditional update reinforces the row lock and stock check.
  update public.product_variants
  set stock_quantity = stock_quantity - new.quantity,
      updated_at = now()
  where id = selected_variant.id
    and is_active is true
    and stock_quantity >= new.quantity;

  if not found then
    raise exception 'Insufficient stock for a selected variant.';
  end if;

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
  new.stock_restored := false;

  return new;
end;
$$;

revoke all on function public.validate_variant_order_item() from public;
grant execute on function public.validate_variant_order_item() to service_role;

drop trigger if exists validate_variant_order_item_trigger
  on public.order_items;

create trigger validate_variant_order_item_trigger
before insert on public.order_items
for each row
execute function public.validate_variant_order_item();

-- Automatically restore variant stock exactly once for a cancelled order.
create or replace function public.restore_variant_stock_on_cancellation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  order_item record;
begin
  if old.status is not distinct from new.status
     or new.status::text <> 'cancelled'
     or old.status::text = 'cancelled' then
    return new;
  end if;

  for order_item in
    select oi.id,
           oi.variant_id,
           oi.quantity,
           oi.stock_restored
    from public.order_items oi
    where oi.order_id = new.id
      and oi.variant_id is not null
      and oi.stock_restored is false
    for update
  loop
    update public.product_variants
    set stock_quantity =
          stock_quantity + coalesce(order_item.quantity, 0),
        updated_at = now()
    where id = order_item.variant_id;

    update public.order_items
    set stock_restored = true
    where id = order_item.id
      and stock_restored is false;
  end loop;

  return new;
end;
$$;

revoke all on function public.restore_variant_stock_on_cancellation() from public;
grant execute on function public.restore_variant_stock_on_cancellation() to service_role;

drop trigger if exists restore_variant_stock_on_cancellation_trigger
  on public.orders;

create trigger restore_variant_stock_on_cancellation_trigger
after update of status on public.orders
for each row
execute function public.restore_variant_stock_on_cancellation();

-- Replace the existing RPC while preserving its response shape.
create or replace function public.create_store_order(
  p_vendor_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_customer_note text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_order_id uuid;
  v_order_reference text;
  v_product record;
  v_variant record;
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_product_id_text text;
  v_variant_id_text text;
  v_quantity_text text;
  v_quantity integer;
  v_unit_price numeric(12, 2);
  v_total numeric(12, 2) := 0;
  v_seen_combinations text[] := array[]::text[];
  v_combination text;
begin
  if p_vendor_id is null then
    raise exception 'Invalid store.';
  end if;

  if nullif(btrim(p_customer_name), '') is null
     or nullif(btrim(p_customer_phone), '') is null
     or nullif(btrim(p_delivery_address), '') is null then
    raise exception 'Please provide your name, phone number and delivery address.';
  end if;

  if char_length(btrim(p_customer_name)) > 150
     or char_length(btrim(p_customer_phone)) > 30
     or char_length(btrim(p_delivery_address)) > 1000
     or char_length(coalesce(p_customer_note, '')) > 1000 then
    raise exception 'One or more customer details are too long.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'Too many different products in one order.';
  end if;

  if not exists (
    select 1
    from public.vendors v
    where v.id = p_vendor_id
      and v.is_store_published = true
      and v.approval_status = 'approved'
  ) then
    raise exception 'This store is currently unavailable.';
  end if;

  v_order_reference :=
    'NXS-' ||
    upper(
      substring(
        replace(gen_random_uuid()::text, '-', ''),
        1,
        10
      )
    );

  insert into public.orders (
    vendor_id,
    order_reference,
    customer_name,
    customer_phone,
    delivery_address,
    customer_note
  )
  values (
    p_vendor_id,
    v_order_reference,
    btrim(p_customer_name),
    btrim(p_customer_phone),
    btrim(p_delivery_address),
    nullif(btrim(coalesce(p_customer_note, '')), '')
  )
  returning id into v_order_id;

  for v_item in
    select item.value
    from jsonb_array_elements(p_items) item(value)
  loop
    if jsonb_typeof(v_item) is distinct from 'object' then
      raise exception 'Invalid product information in your cart.';
    end if;

    if jsonb_typeof(v_item -> 'product_id') is distinct from 'string' then
      raise exception 'Invalid product ID.';
    end if;

    v_product_id_text := v_item ->> 'product_id';

    if v_product_id_text !~
       '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
      raise exception 'Invalid product ID.';
    end if;

    v_product_id := v_product_id_text::uuid;

    v_variant_id := null;
    v_variant_id_text := v_item ->> 'variant_id';

    if v_variant_id_text is not null
       and btrim(v_variant_id_text) <> '' then
      if v_variant_id_text !~
         '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
        raise exception 'Invalid variant ID.';
      end if;

      v_variant_id := v_variant_id_text::uuid;
    end if;

    v_combination :=
      v_product_id::text || ':' ||
      coalesce(v_variant_id::text, 'base');

    if v_combination = any(v_seen_combinations) then
      raise exception 'The same product and variant appears more than once in your cart.';
    end if;

    v_seen_combinations :=
      array_append(v_seen_combinations, v_combination);

    if jsonb_typeof(v_item -> 'quantity') is distinct from 'number' then
      raise exception 'Invalid product quantity.';
    end if;

    v_quantity_text := v_item ->> 'quantity';

    if v_quantity_text !~ '^[0-9]+$'
       or char_length(v_quantity_text) > 2 then
      raise exception 'Invalid product quantity.';
    end if;

    v_quantity := v_quantity_text::integer;

    if v_quantity < 1 or v_quantity > 99 then
      raise exception 'Invalid product quantity.';
    end if;

    select p.id,
           p.name,
           p.price
    into v_product
    from public.products p
    where p.id = v_product_id
      and p.vendor_id = p_vendor_id
      and p.is_available = true;

    if not found then
      raise exception 'A product in your cart is unavailable.';
    end if;

    if v_variant_id is null then
      v_unit_price := v_product.price;

      if v_unit_price is null or v_unit_price < 0 then
        raise exception 'This product has an invalid price.';
      end if;

      insert into public.order_items (
        order_id,
        product_id,
        variant_id,
        quantity
      )
      values (
        v_order_id,
        v_product.id,
        null,
        v_quantity
      );
    else
      select pv.id,
             pv.product_id,
             pv.price
      into v_variant
      from public.product_variants pv
      where pv.id = v_variant_id
        and pv.product_id = v_product.id
        and pv.is_active = true;

      if not found then
        raise exception 'A selected variant is unavailable.';
      end if;

      v_unit_price :=
        coalesce(v_variant.price, v_product.price);

      if v_unit_price is null or v_unit_price < 0 then
        raise exception 'This variant has an invalid price.';
      end if;

      insert into public.order_items (
        order_id,
        product_id,
        variant_id,
        quantity
      )
      values (
        v_order_id,
        v_product.id,
        v_variant.id,
        v_quantity
      );
    end if;

    v_total := v_total + (v_unit_price * v_quantity);
  end loop;

  update public.orders
  set total_amount = v_total,
      updated_at = now()
  where id = v_order_id;

  return jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_reference', v_order_reference,
    'total_amount', v_total,
    'message', 'Your order has been received.'
  );
end;
$function$;

revoke all on function public.create_store_order(uuid, text, text, text, text, jsonb)
  from public;
grant execute on function public.create_store_order(
  uuid,
  text,
  text,
  text,
  text,
  jsonb
) to anon, authenticated;

commit;
