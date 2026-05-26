-- =====================================================================
-- Foto aggiuntive: array invece di 4 colonne fisse
-- =====================================================================

alter table public.veicoli
  add column if not exists foto_aggiuntive_urls text[] default '{}';

-- Backfill da colonne esistenti se presenti
update public.veicoli
set foto_aggiuntive_urls = array_remove(
  array[
    foto_fianco_dx_url,
    foto_fianco_sx_url,
    foto_anteriore_url,
    foto_posteriore_url
  ],
  null
)
where (foto_aggiuntive_urls is null or foto_aggiuntive_urls = '{}'::text[])
  and (
    foto_fianco_dx_url is not null
    or foto_fianco_sx_url is not null
    or foto_anteriore_url is not null
    or foto_posteriore_url is not null
  );
