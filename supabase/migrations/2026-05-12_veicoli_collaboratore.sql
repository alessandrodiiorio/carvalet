-- =====================================================================
-- Collaboratore puo creare/aggiornare veicoli (delete riservato a titolare)
-- =====================================================================

drop policy if exists "veicoli_write_titolare" on public.veicoli;

create policy "veicoli_insert_autenticati"
on public.veicoli for insert to authenticated
with check (true);

create policy "veicoli_update_autenticati"
on public.veicoli for update to authenticated
using (true)
with check (true);

create policy "veicoli_delete_titolare"
on public.veicoli for delete to authenticated
using (public.is_titolare());
