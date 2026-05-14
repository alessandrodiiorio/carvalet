-- =====================================================================
-- Tabella spese aziendali
-- =====================================================================

create table if not exists public.spese (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  importo numeric(10, 2) not null,
  motivazione text not null,
  creato_da uuid references public.profili(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists spese_data_idx on public.spese(data);
create index if not exists spese_creato_da_idx on public.spese(creato_da);

alter table public.spese enable row level security;

-- Select: titolare vede tutto, collaboratore vede solo proprie
drop policy if exists "spese_select_propri_o_titolare" on public.spese;
create policy "spese_select_propri_o_titolare"
on public.spese for select to authenticated
using (public.is_titolare() or creato_da = auth.uid());

-- Insert: autenticato, creato_da deve essere self
drop policy if exists "spese_insert_autenticati" on public.spese;
create policy "spese_insert_autenticati"
on public.spese for insert to authenticated
with check (creato_da = auth.uid());

-- Update: titolare o proprietario
drop policy if exists "spese_update_propri_o_titolare" on public.spese;
create policy "spese_update_propri_o_titolare"
on public.spese for update to authenticated
using (public.is_titolare() or creato_da = auth.uid())
with check (public.is_titolare() or creato_da = auth.uid());

-- Delete: titolare o proprietario
drop policy if exists "spese_delete_propri_o_titolare" on public.spese;
create policy "spese_delete_propri_o_titolare"
on public.spese for delete to authenticated
using (public.is_titolare() or creato_da = auth.uid());
