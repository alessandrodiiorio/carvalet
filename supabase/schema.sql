-- =====================================================================
-- Car Valet — schema iniziale del database
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- =====================================================================

-- ----- Tipi enum --------------------------------------------------------
create type tipo_movimento as enum ('ritiro', 'consegna', 'ritiro_consegna');
create type stato_movimento as enum ('programmato', 'completato', 'annullato');
create type ruolo_utente as enum ('titolare', 'collaboratore');

-- ----- Tabella profili (estensione di auth.users) -----------------------
create table public.profili (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  ruolo ruolo_utente not null default 'collaboratore',
  created_at timestamptz not null default now()
);

-- ----- Tabella compagnie (anagrafica clienti) ---------------------------
create table public.compagnie (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  partita_iva text,
  referente text,
  email text,
  telefono text,
  indirizzo text,
  note text,
  created_at timestamptz not null default now()
);

-- ----- Tabella veicoli --------------------------------------------------
create table public.veicoli (
  id uuid primary key default gen_random_uuid(),
  compagnia_id uuid not null references public.compagnie(id) on delete restrict,
  targa text not null,
  modello text not null,
  note text,
  created_at timestamptz not null default now()
);

create index veicoli_compagnia_id_idx on public.veicoli(compagnia_id);
create index veicoli_targa_idx on public.veicoli(targa);

-- ----- Tabella movimenti (= appuntamenti) -------------------------------
create table public.movimenti (
  id uuid primary key default gen_random_uuid(),
  veicolo_id uuid not null references public.veicoli(id) on delete restrict,
  tipo tipo_movimento not null,
  stato stato_movimento not null default 'programmato',
  data_ora timestamptz not null,
  luogo_ritiro text,
  luogo_consegna text,
  note text,
  assegnato_a uuid references public.profili(id) on delete set null,
  creato_da uuid references public.profili(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index movimenti_data_ora_idx on public.movimenti(data_ora);
create index movimenti_assegnato_a_idx on public.movimenti(assegnato_a);
create index movimenti_veicolo_id_idx on public.movimenti(veicolo_id);

-- ----- Trigger: aggiorna automaticamente updated_at ---------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger movimenti_set_updated_at
before update on public.movimenti
for each row execute function public.set_updated_at();

-- ----- Trigger: alla registrazione, crea il profilo ---------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profili (id, nome, ruolo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    'collaboratore'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ----- Helper: l'utente corrente è titolare? ----------------------------
create or replace function public.is_titolare()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profili
    where id = auth.uid() and ruolo = 'titolare'
  );
$$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

alter table public.profili enable row level security;
alter table public.compagnie enable row level security;
alter table public.veicoli enable row level security;
alter table public.movimenti enable row level security;

-- ----- Profili ----------------------------------------------------------
create policy "profili_select"
on public.profili for select to authenticated
using (id = auth.uid() or public.is_titolare());

create policy "profili_update_self_o_titolare"
on public.profili for update to authenticated
using (id = auth.uid() or public.is_titolare())
with check (id = auth.uid() or public.is_titolare());

create policy "profili_delete_titolare"
on public.profili for delete to authenticated
using (public.is_titolare());

-- ----- Compagnie --------------------------------------------------------
create policy "compagnie_select_autenticati"
on public.compagnie for select to authenticated
using (true);

create policy "compagnie_write_titolare"
on public.compagnie for all to authenticated
using (public.is_titolare())
with check (public.is_titolare());

-- ----- Veicoli ----------------------------------------------------------
create policy "veicoli_select_autenticati"
on public.veicoli for select to authenticated
using (true);

create policy "veicoli_write_titolare"
on public.veicoli for all to authenticated
using (public.is_titolare())
with check (public.is_titolare());

-- ----- Movimenti --------------------------------------------------------
create policy "movimenti_select_propri_o_titolare"
on public.movimenti for select to authenticated
using (public.is_titolare() or assegnato_a = auth.uid());

create policy "movimenti_insert_titolare"
on public.movimenti for insert to authenticated
with check (public.is_titolare());

create policy "movimenti_update_propri_o_titolare"
on public.movimenti for update to authenticated
using (public.is_titolare() or assegnato_a = auth.uid())
with check (public.is_titolare() or assegnato_a = auth.uid());

create policy "movimenti_delete_titolare"
on public.movimenti for delete to authenticated
using (public.is_titolare());

-- =====================================================================
-- TARIFFE (per compagnia + tipo movimento)
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
