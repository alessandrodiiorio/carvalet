-- =====================================================================
-- Secondo veicolo per movimenti ritiro+consegna con 2 veicoli diversi
-- =====================================================================

alter table public.movimenti
  add column if not exists veicolo_consegna_id uuid
    references public.veicoli(id) on delete restrict;

create index if not exists movimenti_veicolo_consegna_id_idx
  on public.movimenti(veicolo_consegna_id);
