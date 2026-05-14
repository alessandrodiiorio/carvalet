-- =====================================================================
-- Collaboratore puo creare movimenti + vede movimenti creati da se stesso
-- =====================================================================

-- Drop policy insert restrittiva
drop policy if exists "movimenti_insert_titolare" on public.movimenti;

-- Insert: qualsiasi autenticato, ma creato_da deve essere se stesso (a meno che titolare)
create policy "movimenti_insert_autenticati"
on public.movimenti for insert to authenticated
with check (creato_da = auth.uid() or public.is_titolare());

-- Select esteso: include anche movimenti creati dall'utente
drop policy if exists "movimenti_select_propri_o_titolare" on public.movimenti;

create policy "movimenti_select_propri_o_titolare"
on public.movimenti for select to authenticated
using (
  public.is_titolare()
  or assegnato_a = auth.uid()
  or creato_da = auth.uid()
);

-- Update: titolare o assegnato o creatore
drop policy if exists "movimenti_update_propri_o_titolare" on public.movimenti;

create policy "movimenti_update_propri_o_titolare"
on public.movimenti for update to authenticated
using (
  public.is_titolare()
  or assegnato_a = auth.uid()
  or creato_da = auth.uid()
)
with check (
  public.is_titolare()
  or assegnato_a = auth.uid()
  or creato_da = auth.uid()
);
