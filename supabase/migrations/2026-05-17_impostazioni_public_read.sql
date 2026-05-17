-- =====================================================================
-- Permetti lettura pubblica impostazioni_app (logo + nome azienda)
-- Per mostrare branding su login/signup (non autenticati)
-- =====================================================================

drop policy if exists "impostazioni_select_all" on public.impostazioni_app;
create policy "impostazioni_select_all"
on public.impostazioni_app for select
using (true);
