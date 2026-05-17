-- =====================================================================
-- 4 foto aggiuntive per veicolo (fianchi, anteriore, posteriore)
-- =====================================================================

alter table public.veicoli
  add column if not exists foto_fianco_dx_url text,
  add column if not exists foto_fianco_sx_url text,
  add column if not exists foto_anteriore_url text,
  add column if not exists foto_posteriore_url text;
