-- =====================================================================
-- Nuovo ruolo "compagnia": vede solo movimenti+report dei propri veicoli
-- =====================================================================

-- Step 1: enum value + colonna compagnia_id
alter type public.ruolo_utente add value if not exists 'compagnia';

alter table public.profili
  add column if not exists compagnia_id uuid
    references public.compagnie(id) on delete set null;

create index if not exists profili_compagnia_id_idx on public.profili(compagnia_id);

-- Step 2: helpers SQL
create or replace function public.is_compagnia()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.profili where id = auth.uid() and ruolo = 'compagnia');
$$;

create or replace function public.compagnia_id_di_auth()
returns uuid
language sql stable security definer set search_path = public
as $$
  select compagnia_id from public.profili where id = auth.uid();
$$;

-- Step 3: RLS aggiornate

drop policy if exists "movimenti_select_propri_o_titolare" on public.movimenti;
create policy "movimenti_select_propri_o_titolare"
on public.movimenti for select to authenticated
using (
  public.is_titolare()
  or assegnato_a = auth.uid()
  or creato_da = auth.uid()
  or exists (
    select 1 from public.veicoli v
    where v.id = movimenti.veicolo_id
      and v.compagnia_id = public.compagnia_id_di_auth()
  )
);

drop policy if exists "veicoli_select_autenticati" on public.veicoli;
create policy "veicoli_select"
on public.veicoli for select to authenticated
using (
  public.is_titolare()
  or (not public.is_compagnia())
  or compagnia_id = public.compagnia_id_di_auth()
);

drop policy if exists "compagnie_select_autenticati" on public.compagnie;
create policy "compagnie_select"
on public.compagnie for select to authenticated
using (
  public.is_titolare()
  or (not public.is_compagnia())
  or id = public.compagnia_id_di_auth()
);

drop policy if exists "tariffe_select_autenticati" on public.tariffe;
create policy "tariffe_select"
on public.tariffe for select to authenticated
using (
  public.is_titolare()
  or (not public.is_compagnia())
  or compagnia_id = public.compagnia_id_di_auth()
);
