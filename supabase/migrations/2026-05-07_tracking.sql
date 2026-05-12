-- =====================================================================
-- Tracking percorso e tempi trasfer
-- =====================================================================

alter table public.movimenti
  add column if not exists inizio_at timestamptz,
  add column if not exists fine_at timestamptz,
  add column if not exists traccia jsonb,
  add column if not exists distanza_km numeric(10, 2);

create index if not exists movimenti_inizio_at_idx on public.movimenti(inizio_at);
create index if not exists movimenti_fine_at_idx on public.movimenti(fine_at);
