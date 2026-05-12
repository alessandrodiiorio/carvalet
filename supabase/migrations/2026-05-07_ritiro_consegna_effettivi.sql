-- =====================================================================
-- Tracking effettivo: timestamp e luoghi auto-rilevati da GPS
-- =====================================================================

alter table public.movimenti
  add column if not exists ritiro_effettivo_at timestamptz,
  add column if not exists consegna_effettivo_at timestamptz;

create index if not exists movimenti_ritiro_effettivo_at_idx
  on public.movimenti(ritiro_effettivo_at);
create index if not exists movimenti_consegna_effettivo_at_idx
  on public.movimenti(consegna_effettivo_at);
