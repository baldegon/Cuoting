create or replace function public.create_purchase_atomic(
  p_name text,
  p_purchase_date date,
  p_total_amount numeric,
  p_card_ids uuid[],
  p_allocation_amounts numeric[],
  p_allocation_installments_counts integer[]
)
returns uuid
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_purchase_id uuid;
  v_allocation_id uuid;
  v_plan_id uuid;
  v_card_id uuid;
  v_amount numeric(12, 2);
  v_installments_count integer;
  v_purchase_installments_count integer;
  v_base_installment numeric(12, 2);
  v_last_adjustment numeric(12, 2);
  v_index integer;
  v_items integer;
  v_sum numeric(12, 2);
  v_valid_cards integer;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  v_items := coalesce(array_length(p_card_ids, 1), 0);
  if v_items = 0 then
    raise exception 'At least one allocation is required';
  end if;

  if v_items <> coalesce(array_length(p_allocation_amounts, 1), 0)
    or v_items <> coalesce(array_length(p_allocation_installments_counts, 1), 0) then
    raise exception 'Allocation arrays length mismatch';
  end if;

  if exists(
    select 1
    from unnest(p_allocation_installments_counts) as installments_count
    where installments_count < 1 or installments_count > 120
  ) then
    raise exception 'Invalid installments count';
  end if;

  select round(coalesce(sum(amount), 0)::numeric, 2)
    into v_sum
  from unnest(p_allocation_amounts) as amount;

  if round(p_total_amount::numeric, 2) <> v_sum then
    raise exception 'Allocations total mismatch';
  end if;

  if exists(select 1 from unnest(p_allocation_amounts) as amount where amount <= 0) then
    raise exception 'Allocation amount must be positive';
  end if;

  select count(*)
    into v_valid_cards
  from unnest(p_card_ids) as c(card_id)
  join public.cards card on card.id = c.card_id
  where card.user_id = v_user_id;

  if v_valid_cards <> v_items then
    raise exception 'Invalid cards for user';
  end if;

  select max(installments_count)
    into v_purchase_installments_count
  from unnest(p_allocation_installments_counts) as installments_count;

  insert into public.purchases (user_id, name, total_amount, purchase_date, installments_count)
  values (v_user_id, p_name, round(p_total_amount::numeric, 2), p_purchase_date, v_purchase_installments_count)
  returning id into v_purchase_id;

  for v_index in 1..v_items loop
    v_card_id := p_card_ids[v_index];
    v_amount := round(p_allocation_amounts[v_index]::numeric, 2);
    v_installments_count := p_allocation_installments_counts[v_index];

    insert into public.purchase_allocations (purchase_id, user_id, card_id, amount)
    values (v_purchase_id, v_user_id, v_card_id, v_amount)
    returning id into v_allocation_id;

    insert into public.installment_plans (allocation_id, user_id, installments_count, frequency, start_date)
    values (v_allocation_id, v_user_id, v_installments_count, 'monthly', p_purchase_date)
    returning id into v_plan_id;

    v_base_installment := floor((v_amount * 100) / v_installments_count) / 100;
    v_last_adjustment := v_amount - round(v_base_installment * v_installments_count, 2);

    insert into public.installments (plan_id, user_id, installment_number, due_date, amount, status)
    select
      v_plan_id,
      v_user_id,
      installment_idx,
      (p_purchase_date + ((installment_idx - 1) || ' month')::interval)::date,
      case
        when installment_idx = v_installments_count then round(v_base_installment + v_last_adjustment, 2)
        else round(v_base_installment, 2)
      end,
      'pending'
    from generate_series(1, v_installments_count) as installment_idx;
  end loop;

  return v_purchase_id;
end;
$$;
