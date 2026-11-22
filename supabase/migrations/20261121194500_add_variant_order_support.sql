begin;

alter table public.order_items
  add column if not exists variant_id uuid,
  add column if not exists variant_name text,
  add column if not exists variant_color text,
  add column if not exists variant_size text,
  add column if not exists variant_attributes jsonb,
  add column if not exists variant_image_url text,
  add column if not exists stock_restored boolean not null default false;

do $$
declare
  existing_fk_name text;
begin
  for existing_fk_name in
    select con.conname
    from pg_catalog.pg_constraint con
    where con.conrelid = 'public.order_items'::regclass
      and con.contype = 'f'
      and con.confrelid = 'public.product_variants'::regclass
      and pg_catalog.cardinality(con.conkey) = 1
      and pg_catalog.cardinality(con.confkey) = 1
      and con.conkey[1] = (
        select att.attnum
        from pg_catalog.pg_attribute att
        where att.attrelid = 'public.order_items'::regclass
          and att.attname = 'variant_id'
          and not att.attisdropped
      )
      and con.confkey[1] = (
        select att.attnum
        from pg_catalog.pg_attribute att
        where att.attrelid = 'public.product_variants'::regclass
          and att.attname = 'id'
          and not att.attisdropped
      )
  loop
    if (
      select con.confdeltype
      from pg_catalog.pg_constraint con
      where con.conrelid = 'public.order_items'::regclass
        and con.conname = existing_fk_name
    ) <> 'r'
    then
      execute pg_catalog.format(
        'alter table public.order_items drop constraint %I',
        existing_fk_name
      );
    end if;
  end loop;

  if not exists (
    select 1
    from pg_catalog.pg_constraint con
    where con.conrelid = 'public.order_items'::regclass
      and con.contype = 'f'
      and con.confdeltype = 'r'
      and con.confrelid = 'public.product_variants'::regclass
      and pg_catalog.cardinality(con.conkey) = 1
      and pg_catalog.cardinality(con.confkey) = 1
      and con.conkey[1] = (
        select att.attnum
        from pg_catalog.pg_attribute att
        where att.attrelid = 'public.order_items'::regclass
          and att.attname = 'variant_id'
          and not att.attisdropped
      )
      and con.confkey[1] = (
        select att.attnum
        from pg_catalog.pg_attribute att
        where att.attrelid = 'public.product_variants'::regclass
          and att.attname = 'id'
          and not att.attisdropped
      )
  ) then
    alter table public.order_items
      add constraint order_items_variant_id_fkey
      foreign key (variant_id)
      references public.product_variants(id)
      on delete restrict;
  end if;
end;
$$;

create index if not exists order_items_variant_id_idx
  on public.order_items(variant_id);

create index if not exists order_items_variant_stock_restored_idx
  on public.order_items(order_id, variant_id, stock_restored)
  where variant_id is not null;

create or replace function public.validate_variant_order_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_variant public.product_variants%rowtype;
  selected_product public.products%rowtype;
begin
  if new.quantity is null or new.quantity < 1 then
    raise exception 'Quantity must be at least 1.';
  end if;

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

  select *
  into selected_product
  from public.products
  where id = COALESCE(new.product_id, (
    select pv.product_id
    from public.product_variants pv
    where pv.id = new.variant_id
  ))
  for update;

  if not found then
    raise exception 'A product in your cart is unavailable.';
  end if;

  select *
  into selected_variant
  from public.product_variants
  where id = new.variant_id
  for update;

  if not found then
    raise exception 'A selected variant no longer exists.';
  end if;

  if selected_variant.product_id <> selected_product.id then
    raise exception 'A selected variant does not belong to the selected product.';
  end if;

  if selected_variant.is_active is not true then
    raise exception 'A selected variant is unavailable.';
  end if;

  if selected_variant.stock_quantity is null
     or selected_variant.stock_quantity < new.quantity then
    raise exception 'Insufficient stock for a selected variant.';
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

  update public.product_variants
  set stock_quantity = stock_quantity - new.quantity,
      updated_at = pg_catalog.now()
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
    COALESCE(selected_variant.price, selected_product.price);
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

create or replace function public.restore_variant_stock_on_cancellation()
returns trigger
language plpgsql
security definer
set search_path = ''
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
    order by oi.variant_id, oi.id
    for update
  loop
    if order_item.quantity is null
       or order_item.quantity < 1 then
      raise exception
        'Cannot restore stock for an invalid order item quantity.';
    end if;

    update public.product_variants
    set stock_quantity =
          stock_quantity + order_item.quantity,
        updated_at = pg_catalog.now()
    where id = order_item.variant_id;

    if not found then
      raise exception
        'Cannot restore stock because a variant no longer exists.';
    end if;

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
set search_path to ''
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
  v_seen_combinations text[] := ARRAY[]::text[];
  v_combination text;
  v_product_ids uuid[] := ARRAY[]::uuid[];
  v_variant_ids uuid[] := ARRAY[]::uuid[];
  v_locked_id uuid;
begin
  if p_vendor_id is null then
    raise exception 'Invalid store.';
  end if;

  if NULLIF(pg_catalog.btrim(p_customer_name), '') is null
     or NULLIF(pg_catalog.btrim(p_customer_phone), '') is null
     or NULLIF(pg_catalog.btrim(p_delivery_address), '') is null then
    raise exception 'Please provide your name, phone number and delivery address.';
  end if;

  if pg_catalog.char_length(pg_catalog.btrim(p_customer_name)) > 150
     or pg_catalog.char_length(pg_catalog.btrim(p_customer_phone)) > 30
     or pg_catalog.char_length(pg_catalog.btrim(p_delivery_address)) > 1000
     or pg_catalog.char_length(COALESCE(p_customer_note, '')) > 1000 then
    raise exception 'One or more customer details are too long.';
  end if;

  if p_items is null
     or pg_catalog.jsonb_typeof(p_items) is distinct from 'array'
     or pg_catalog.jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.';
  end if;

  if pg_catalog.jsonb_array_length(p_items) > 50 then
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

  -- Parse and validate cart combinations before taking row locks.
  for v_item in
    select item.value
    from pg_catalog.jsonb_array_elements(p_items) as item(value)
  loop
    if pg_catalog.jsonb_typeof(v_item) is distinct from 'object' then
      raise exception 'Invalid product information in your cart.';
    end if;

    if pg_catalog.jsonb_typeof(v_item -> 'product_id') is distinct from 'string' then
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
       and pg_catalog.btrim(v_variant_id_text) <> '' then
      if v_variant_id_text !~
         '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
        raise exception 'Invalid variant ID.';
      end if;
      v_variant_id := v_variant_id_text::uuid;
    end if;

    v_combination :=
      v_product_id::text || ':' ||
      COALESCE(v_variant_id::text, 'base');
    if v_combination = any(v_seen_combinations) then
      raise exception 'The same product and variant appears more than once in your cart.';
    end if;
    v_seen_combinations :=
      pg_catalog.array_append(v_seen_combinations, v_combination);

    if pg_catalog.jsonb_typeof(v_item -> 'quantity') is distinct from 'number' then
      raise exception 'Invalid product quantity.';
    end if;
    v_quantity_text := v_item ->> 'quantity';
    if v_quantity_text !~ '^[0-9]+$'
       or pg_catalog.char_length(v_quantity_text) > 2 then
      raise exception 'Invalid product quantity.';
    end if;
    v_quantity := v_quantity_text::integer;
    if v_quantity < 1 or v_quantity > 99 then
      raise exception 'Invalid product quantity.';
    end if;

    if not (v_product_id = any(v_product_ids)) then
      v_product_ids :=
        pg_catalog.array_append(v_product_ids, v_product_id);
    end if;
    if v_variant_id is not null
       and not (v_variant_id = any(v_variant_ids)) then
      v_variant_ids :=
        pg_catalog.array_append(v_variant_ids, v_variant_id);
    end if;
  end loop;

  -- Lock products and variants in sorted order for multi-item deadlock reduction.
  for v_locked_id in
    select product_id
    from pg_catalog.unnest(v_product_ids) as product_id
    order by product_id
  loop
    select *
    into v_product
    from public.products
    where id = v_locked_id
      and vendor_id = p_vendor_id
      and is_available = true
    for update;

    if not found then
      raise exception 'A product in your cart is unavailable.';
    end if;
  end loop;

  for v_locked_id in
    select variant_id
    from pg_catalog.unnest(v_variant_ids) as variant_id
    order by variant_id
  loop
    select *
    into v_variant
    from public.product_variants
    where id = v_locked_id
    for update;

    if not found then
      raise exception 'A selected variant no longer exists.';
    end if;

    if v_variant.is_active is not true then
      raise exception 'A selected variant is unavailable.';
    end if;

    if not (v_variant.product_id = any(v_product_ids)) then
      raise exception 'A selected variant does not belong to the selected store.';
    end if;
  end loop;

  v_order_reference :=
    'NXS-' ||
    pg_catalog.upper(
      pg_catalog.substring(
        pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''),
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
    pg_catalog.btrim(p_customer_name),
    pg_catalog.btrim(p_customer_phone),
    pg_catalog.btrim(p_delivery_address),
    NULLIF(
      pg_catalog.btrim(COALESCE(p_customer_note, '')),
      ''
    )
  )
  returning id into v_order_id;

  for v_item in
    select item.value
    from pg_catalog.jsonb_array_elements(p_items) as item(value)
  loop
    v_product_id :=
      (v_item ->> 'product_id')::uuid;
    v_variant_id := null;

    v_variant_id_text := v_item ->> 'variant_id';
    if v_variant_id_text is not null
       and pg_catalog.btrim(v_variant_id_text) <> '' then
      v_variant_id := v_variant_id_text::uuid;
    end if;

    v_quantity :=
      (v_item ->> 'quantity')::integer;

    if v_variant_id is null then
      insert into public.order_items (
        order_id,
        product_id,
        variant_id,
        quantity
      )
      values (
        v_order_id,
        v_product_id,
        null,
        v_quantity
      );
    else
      insert into public.order_items (
        order_id,
        product_id,
        variant_id,
        quantity
      )
      values (
        v_order_id,
        v_product_id,
        v_variant_id,
        v_quantity
      );
    end if;
  end loop;

  -- Calculate from saved, trigger-calculated order item line totals.
  select COALESCE(
    pg_catalog.sum(line_total),
    0
  )
  into v_total
  from public.order_items
  where order_id = v_order_id;

  update public.orders
  set total_amount = v_total,
      updated_at = pg_catalog.now()
  where id = v_order_id;

  return pg_catalog.jsonb_build_object(
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
