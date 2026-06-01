-- =====================================================================
-- Spese: collegamento a dipendente per "Spesa giornaliera dipendente"
-- =====================================================================

alter table public.spese
  add column if not exists dipendente_id uuid
    references public.profili(id) on delete set null;

create index if not exists spese_dipendente_id_idx on public.spese(dipendente_id);
