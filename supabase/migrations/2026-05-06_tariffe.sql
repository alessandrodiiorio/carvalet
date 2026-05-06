-- =====================================================================
-- Migrazione: tabella tariffe
-- =====================================================================

create table public.tariffe (
  id uuid primary key default gen_random_uuid(),
  compagnia_id uuid not null references public.compagnie(id) on delete cascade,
  tipo tipo_movimento not null,
  prezzo numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (compagnia_id, tipo)
);

create index tariffe_compagnia_id_idx on public.tariffe(compagnia_id);

create trigger tariffe_set_updated_at
before update on public.tariffe
for each row execute function public.set_updated_at();

alter table public.tariffe enable row level security;

create policy "tariffe_select_autenticati"
on public.tariffe for select to authenticated
using (true);

create policy "tariffe_write_titolare"
on public.tariffe for all to authenticated
using (public.is_titolare())
with check (public.is_titolare());
