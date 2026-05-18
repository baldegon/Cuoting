create policy "Users can update own installments"
  on public.installments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status in ('pending', 'paid'));
