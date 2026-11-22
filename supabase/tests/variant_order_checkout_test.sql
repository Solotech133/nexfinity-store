-- Comprehensive disposable SQL checkout tests.
-- Execute in a test/preview database or inside a transaction where ROLLBACK
-- remains the final operation. This script does not use existing customer
-- orders and restores all inserted test records through ROLLBACK.
-- Run the entire script in Supabase SQL Editor. Do not execute only individual
-- sections, because ROLLBACK must remain the final statement.

begin;

do $$
declare
  v_vendor_id uuid := pg_catalog.gen_random_uuid();
  v_base_product_id uuid := pg_catalog.gen_random_uuid();
  v_variant_product_id uuid := pg_catalog.gen_random_uuid();
  v_variant_1_id uuid := pg_catalog.gen_random_uuid();
  v_variant_2_id uuid := pg_catalog.gen_random_uuid();
  v_variant_low_id uuid := pg_catalog.gen_random_uuid();
  v_result jsonb;
  v_order_id uuid;
  v_items_total numeric(12, 2);
  v_order_total numeric(12, 2);
  v_stock_before integer;
  v_variant_1_stock integer;
  v_variant_2_stock integer;
  v_count integer;
  v_orders_before integer;
  v_order_items_before integer;
  v_snapshot record;
begin
  -- Isolated vendor fixture.
  insert into public.vendors (
    id,
    email,
    full_name,
    business_name,
    store_name,
    store_slug,
    approval_status,
    is_store_published
  )
  values (
    v_vendor_id,
    'disposable-' || v_vendor_id::text || '@example.invalid',
    'Disposable Test Vendor',
    'Disposable Test Business',
    'Disposable Test Store',
    'disposable-' || replace(v_vendor_id::text, '-', ''),
    'approved',
    true
  );

  -- Isolated legacy product fixture.
  insert into public.products (
    id,
    vendor_id,
    name,
    price,
    is_available,
    is_featured,
    created_at,
    updated_at
  )
  values (
    v_base_product_id,
    v_vendor_id,
    'Disposable Legacy Product',
    1000.00,
    true,
    false,
    now(),
    now()
  );

  -- Isolated variant product fixture.
  insert into public.products (
    id,
    vendor_id,
    name,
    price,
    is_available,
    is_featured,
    created_at,
    updated_at
  )
  values (
    v_variant_product_id,
    v_vendor_id,
    'Disposable Variant Product',
    2000.00,
    true,
    false,
    now(),
    now()
  );

  insert into public.product_variants (
    id,
    product_id,
    variant_name,
    color,
    size,
    sku,
    attributes,
    price,
    stock_quantity,
    image_url,
    is_active,
    sort_order,
    created_at,
    updated_at
  )
  values
    (
      v_variant_1_id,
      v_variant_product_id,
      'Midnight Small',
      'Black',
      'Small',
      'DISP-BLK-S',
      '{"material":"Cotton","style":"Oversized","fit":"regular"}'::jsonb,
      2500.00,
      5,
      'https://example.invalid/variant-1.jpg',
      true,
      1,
      now(),
      now()
    ),
    (
      v_variant_2_id,
      v_variant_product_id,
      'Cloud Large',
      'White',
      'Large',
      'DISP-WHT-L',
      '{"material":"Linen","style":"Relaxed","fit":"loose"}'::jsonb,
      3000.00,
      3,
      'https://example.invalid/variant-2.jpg',
      true,
      2,
      now(),
      now()
    ),
    (
      v_variant_low_id,
      v_variant_product_id,
      'Low Stock Variant',
      'Red',
      'Medium',
      'DISP-RED-M',
      '{"material":"Cotton","test":"low-stock"}'::jsonb,
      2750.00,
      1,
      'https://example.invalid/variant-low.jpg',
      true,
      3,
      now(),
      now()
    );

  -- 1. Legacy product checkout without variant_id.
  v_result := public.create_store_order(
    v_vendor_id,
    'Disposable Legacy Checkout',
    '08000000000',
    'Disposable Address',
    null,
    jsonb_build_array(
      jsonb_build_object(
        'product_id', v_base_product_id,
        'variant_id', null,
        'quantity', 2
      )
    )
  );

  v_order_id := (v_result ->> 'order_id')::uuid;

  if (v_result ->> 'success')::boolean is distinct from true
     or (v_result ->> 'order_id')::uuid is distinct from v_order_id
     or (v_result ->> 'order_reference') is null
     or (v_result ->> 'total_amount')::numeric is distinct from 2000.00
     or (v_result ->> 'message') is distinct from 'Your order has been received.' then
    raise exception 'Legacy checkout response is incorrect';
  end if;

  select sum(oi.line_total)
  into v_items_total
  from public.order_items oi
  where oi.order_id = v_order_id;

  select o.total_amount
  into v_order_total
  from public.orders o
  where o.id = v_order_id;

  if v_order_total is distinct from v_items_total
     or v_order_total <> 2000.00 then
    raise exception
      'Legacy checkout total mismatch: order=%, items=%, expected=2000',
      v_order_total,
      v_items_total;
  end if;

  select oi.variant_id,
         oi.variant_name,
         oi.variant_color,
         oi.variant_size,
         oi.variant_attributes,
         oi.variant_image_url
  into v_snapshot
  from public.order_items oi
  where oi.order_id = v_order_id;

  if v_snapshot.variant_id is not null
     or v_snapshot.variant_name is not null
     or v_snapshot.variant_color is not null
     or v_snapshot.variant_size is not null
     or v_snapshot.variant_attributes is not null
     or v_snapshot.variant_image_url is not null then
    raise exception 'Legacy order item contains variant snapshot data';
  end if;

  raise notice 'PASS: legacy product checkout';

  -- 2. Variant checkout with stock deduction and snapshots.
  select pv.stock_quantity
  into v_variant_1_stock
  from public.product_variants pv
  where pv.id = v_variant_1_id;

  v_result := public.create_store_order(
    v_vendor_id,
    'Disposable Variant Checkout',
    '08000000000',
    'Disposable Address',
    null,
    jsonb_build_array(
      jsonb_build_object(
        'product_id', v_variant_product_id,
        'variant_id', v_variant_1_id,
        'quantity', 2
      )
    )
  );

  v_order_id := (v_result ->> 'order_id')::uuid;

  if (v_result ->> 'success')::boolean is distinct from true
     or (v_result ->> 'order_id')::uuid is distinct from v_order_id
     or (v_result ->> 'order_reference') is null
     or (v_result ->> 'total_amount')::numeric is distinct from 5000.00
     or (v_result ->> 'message') is distinct from 'Your order has been received.' then
    raise exception 'Variant checkout response is incorrect';
  end if;

  select pv.stock_quantity
  into v_stock_before
  from public.product_variants pv
  where pv.id = v_variant_1_id;

  if v_stock_before <> v_variant_1_stock - 2 then
    raise exception
      'Variant stock deduction mismatch: before=%, after=%',
      v_variant_1_stock,
      v_stock_before;
  end if;

  select oi.variant_id,
         oi.variant_name,
         oi.variant_color,
         oi.variant_size,
         oi.variant_attributes,
         oi.variant_image_url,
         oi.unit_price,
         oi.quantity,
         oi.line_total
  into v_snapshot
  from public.order_items oi
  where oi.order_id = v_order_id;

  if v_snapshot.variant_id <> v_variant_1_id
     or v_snapshot.variant_name <> 'Midnight Small'
     or v_snapshot.variant_color <> 'Black'
     or v_snapshot.variant_size <> 'Small'
     or v_snapshot.variant_attributes
        <> '{"material":"Cotton","style":"Oversized","fit":"regular"}'::jsonb
     or v_snapshot.variant_image_url
        <> 'https://example.invalid/variant-1.jpg'
     or v_snapshot.unit_price <> 2500.00
     or v_snapshot.quantity <> 2
     or v_snapshot.line_total <> 5000.00 then
    raise exception 'Variant order snapshot is incorrect';
  end if;

  select sum(oi.line_total)
  into v_items_total
  from public.order_items oi
  where oi.order_id = v_order_id;

  select o.total_amount
  into v_order_total
  from public.orders o
  where o.id = v_order_id;

  if v_order_total is distinct from v_items_total
     or v_order_total <> 5000.00 then
    raise exception
      'Variant order total mismatch: order=%, items=%',
      v_order_total,
      v_items_total;
  end if;

  raise notice 'PASS: variant stock deduction and snapshots';

  -- 3. Two different variants of the same product in one order.
  select pv.stock_quantity
  into v_variant_1_stock
  from public.product_variants pv
  where pv.id = v_variant_1_id;

  select pv.stock_quantity
  into v_variant_2_stock
  from public.product_variants pv
  where pv.id = v_variant_2_id;

  v_result := public.create_store_order(
    v_vendor_id,
    'Disposable Two Variant Checkout',
    '08000000000',
    'Disposable Address',
    null,
    jsonb_build_array(
      jsonb_build_object(
        'product_id', v_variant_product_id,
        'variant_id', v_variant_1_id,
        'quantity', 1
      ),
      jsonb_build_object(
        'product_id', v_variant_product_id,
        'variant_id', v_variant_2_id,
        'quantity', 1
      )
    )
  );

  v_order_id := (v_result ->> 'order_id')::uuid;

  select pv.stock_quantity
  into v_stock_before
  from public.product_variants pv
  where pv.id = v_variant_1_id;

  if v_stock_before <> v_variant_1_stock - 1 then
    raise exception
      'First variant stock deduction mismatch: before=%, after=%',
      v_variant_1_stock,
      v_stock_before;
  end if;

  select pv.stock_quantity
  into v_stock_before
  from public.product_variants pv
  where pv.id = v_variant_2_id;

  if v_stock_before <> v_variant_2_stock - 1 then
    raise exception
      'Second variant stock deduction mismatch: before=%, after=%',
      v_variant_2_stock,
      v_stock_before;
  end if;

  select count(*)
  into v_count
  from public.order_items oi
  where oi.order_id = v_order_id;

  if v_count <> 2 then
    raise exception
      'Two-variant order should contain 2 items, found %',
      v_count;
  end if;

  select sum(oi.line_total)
  into v_items_total
  from public.order_items oi
  where oi.order_id = v_order_id;

  select o.total_amount
  into v_order_total
  from public.orders o
  where o.id = v_order_id;

  if v_items_total <> 5500.00
     or v_order_total is distinct from v_items_total then
    raise exception
      'Two-variant total mismatch: order=%, items=%',
      v_order_total,
      v_items_total;
  end if;

  raise notice 'PASS: two variants in one order';

  -- 4. Duplicate product-and-variant combination is rejected.
  select count(*)
  into v_orders_before
  from public.orders
  where vendor_id = v_vendor_id;

  select count(*)
  into v_order_items_before
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.vendor_id = v_vendor_id;

  begin
    perform public.create_store_order(
      v_vendor_id,
      'Disposable Duplicate Variant',
      '08000000000',
      'Disposable Address',
      null,
      jsonb_build_array(
        jsonb_build_object(
          'product_id', v_variant_product_id,
          'variant_id', v_variant_1_id,
          'quantity', 1
        ),
        jsonb_build_object(
          'product_id', v_variant_product_id,
          'variant_id', v_variant_1_id,
          'quantity', 1
        )
      )
    );

    raise exception 'Duplicate product-and-variant combination was accepted';
  exception
    when others then
      if sqlerrm
         <> 'The same product and variant appears more than once in your cart.' then
        raise;
      end if;
  end;

  select count(*)
  into v_count
  from public.orders
  where vendor_id = v_vendor_id;

  if v_count <> v_orders_before then
    raise exception
      'Duplicate-variant checkout created an order';
  end if;

  select count(*)
  into v_count
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.vendor_id = v_vendor_id;

  if v_count <> v_order_items_before then
    raise exception
      'Duplicate-variant checkout created order items';
  end if;

  raise notice 'PASS: duplicate product-and-variant rejected';

  -- 5. Insufficient stock rejects the order and rolls back completely.
  select pv.stock_quantity
  into v_variant_1_stock
  from public.product_variants pv
  where pv.id = v_variant_1_id;

  select count(*)
  into v_orders_before
  from public.orders
  where vendor_id = v_vendor_id;

  select count(*)
  into v_order_items_before
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.vendor_id = v_vendor_id;

  begin
    perform public.create_store_order(
      v_vendor_id,
      'Disposable Insufficient Stock',
      '08000000000',
      'Disposable Address',
      null,
      jsonb_build_array(
        jsonb_build_object(
          'product_id', v_variant_product_id,
          'variant_id', v_variant_1_id,
          'quantity', v_variant_1_stock + 1
        )
      )
    );

    raise exception 'Insufficient-stock checkout was accepted';
  exception
    when others then
      if sqlerrm not like '%Insufficient stock%' then
        raise;
      end if;
  end;

  select pv.stock_quantity
  into v_stock_before
  from public.product_variants pv
  where pv.id = v_variant_1_id;

  if v_stock_before <> v_variant_1_stock then
    raise exception
      'Insufficient-stock checkout changed stock: before=%, after=%',
      v_variant_1_stock,
      v_stock_before;
  end if;

  select count(*)
  into v_count
  from public.orders
  where vendor_id = v_vendor_id;

  if v_count <> v_orders_before then
    raise exception
      'Insufficient-stock checkout created an order';
  end if;

  select count(*)
  into v_count
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.vendor_id = v_vendor_id;

  if v_count <> v_order_items_before then
    raise exception
      'Insufficient-stock checkout created order items';
  end if;

  raise notice 'PASS: insufficient stock rollback';

  -- 6. Cancellation restores stock exactly once.
  v_result := public.create_store_order(
    v_vendor_id,
    'Disposable Cancellation Test',
    '08000000000',
    'Disposable Address',
    null,
    jsonb_build_array(
      jsonb_build_object(
        'product_id', v_variant_product_id,
        'variant_id', v_variant_low_id,
        'quantity', 1
      )
    )
  );

  v_order_id := (v_result ->> 'order_id')::uuid;

  select pv.stock_quantity
  into v_stock_before
  from public.product_variants pv
  where pv.id = v_variant_low_id;

  if v_stock_before <> 0 then
    raise exception
      'Cancellation setup did not deduct low-stock variant';
  end if;

  update public.orders
  set status = 'cancelled',
      updated_at = pg_catalog.now()
  where id = v_order_id;

  select pv.stock_quantity
  into v_variant_1_stock
  from public.product_variants pv
  where pv.id = v_variant_low_id;

  if v_variant_1_stock <> 1 then
    raise exception
      'Cancellation did not restore low-stock variant to 1';
  end if;

  update public.orders
  set status = 'cancelled',
      updated_at = pg_catalog.now()
  where id = v_order_id;

  select pv.stock_quantity
  into v_variant_2_stock
  from public.product_variants pv
  where pv.id = v_variant_low_id;

  if v_variant_2_stock <> 1 then
    raise exception
      'Repeated cancellation changed stock: stock=%',
      v_variant_2_stock;
  end if;

  raise notice 'PASS: repeated cancellation restores stock once';

  -- 7. Stock is never negative across all disposable variants.
  select count(*)
  into v_count
  from public.product_variants pv
  where pv.id in (
    v_variant_1_id,
    v_variant_2_id,
    v_variant_low_id
  )
  and pv.stock_quantity < 0;

  if v_count <> 0 then
    raise exception
      'Negative variant stock detected';
  end if;

  raise notice 'PASS: no variant stock is negative';
end;
$$;

rollback;
