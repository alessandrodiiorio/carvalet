-- =====================================================================
-- Anagrafica azienda (singleton impostazioni_app)
-- =====================================================================

alter table public.impostazioni_app
  add column if not exists nome_azienda text,
  add column if not exists ragione_sociale text,
  add column if not exists partita_iva text,
  add column if not exists codice_fiscale text,
  add column if not exists indirizzo text,
  add column if not exists citta text,
  add column if not exists cap text,
  add column if not exists provincia text,
  add column if not exists telefono text,
  add column if not exists email_contatto text;
