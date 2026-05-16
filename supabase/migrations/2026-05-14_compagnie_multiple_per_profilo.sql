-- =====================================================================
-- Junction profilo <-> compagnie (many-to-many)
-- Account compagnia puo essere associato a piu compagnie
-- =====================================================================

create table if not exists public.profilo_compagnie (
  profilo_id uuid not null references public.profili(id) on delete cascade,
  compagnia_id uuid not null references public.compagnie(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profilo_id, compagnia_id)
);

create index if not exists profilo_compagnie_compagnia_id_idx
  on public.profilo_compagnie(compagnia_id);

alter table public.profilo_compagnie enable row level security;

drop policy if exists "profilo_compagnie_select" on public.profilo_compagnie;
create policy "profilo_compagnie_select"
on public.profilo_compagnie for select to authenticated
using (public.is_titolare() or profilo_id = auth.uid());

drop policy if exists "profilo_compagnie_write" on public.profilo_compagnie;
create policy "profilo_compagnie_write"
on public.profilo_compagnie for all to authenticated
using (public.is_titolare()) with check (public.is_titolare());

-- Migra dati legacy
insert into public.profilo_compagnie (profilo_id, compagnia_id)
select id, compagnia_id from public.profili
where compagnia_id is not null
on conflict do nothing;

create or replace function public.compagnie_di_auth()
returns table (compagnia_id uuid)
language sql stable security definer set search_path = public
as $$
  select compagnia_id from public.profilo_compagnie where profilo_id = auth.uid()
  union
  select compagnia_id from public.profili
  where id = auth.uid() and compagnia_id is not null;
$$;

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
      and v.compagnia_id in (select compagnia_id from public.compagnie_di_auth())
  )
);

drop policy if exists "veicoli_select" on public.veicoli;
create policy "veicoli_select"
on public.veicoli for select to authenticated
using (
  public.is_titolare()
  or (not public.is_compagnia())
  or compagnia_id in (select compagnia_id from public.compagnie_di_auth())
);

drop policy if exists "compagnie_select" on public.compagnie;
create policy "compagnie_select"
on public.compagnie for select to authenticated
using (
  public.is_titolare()
  or (not public.is_compagnia())
  or id in (select compagnia_id from public.compagnie_di_auth())
);

drop policy if exists "tariffe_select" on public.tariffe;
create policy "tariffe_select"
on public.tariffe for select to authenticated
using (
  public.is_titolare()
  or (not public.is_compagnia())
  or compagnia_id in (select compagnia_id from public.compagnie_di_auth())
);
