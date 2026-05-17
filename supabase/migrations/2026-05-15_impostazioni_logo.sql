-- =====================================================================
-- Singleton settings con logo URL
-- =====================================================================

create table if not exists public.impostazioni_app (
  id smallint primary key default 1,
  logo_url text,
  updated_at timestamptz default now(),
  constraint impostazioni_singleton check (id = 1)
);

insert into public.impostazioni_app (id) values (1) on conflict do nothing;

alter table public.impostazioni_app enable row level security;

drop policy if exists "impostazioni_select_all" on public.impostazioni_app;
create policy "impostazioni_select_all"
on public.impostazioni_app for select to authenticated
using (true);

drop policy if exists "impostazioni_update_titolare" on public.impostazioni_app;
create policy "impostazioni_update_titolare"
on public.impostazioni_app for update to authenticated
using (public.is_titolare())
with check (public.is_titolare());

-- Bucket logo pubblico
insert into storage.buckets (id, name, public)
values ('logo', 'logo', true)
on conflict (id) do update set public = true;

drop policy if exists "logo_select_pubblico" on storage.objects;
create policy "logo_select_pubblico"
on storage.objects for select to public
using (bucket_id = 'logo');

drop policy if exists "logo_insert_titolare" on storage.objects;
create policy "logo_insert_titolare"
on storage.objects for insert to authenticated
with check (bucket_id = 'logo' and public.is_titolare());

drop policy if exists "logo_update_titolare" on storage.objects;
create policy "logo_update_titolare"
on storage.objects for update to authenticated
using (bucket_id = 'logo' and public.is_titolare());

drop policy if exists "logo_delete_titolare" on storage.objects;
create policy "logo_delete_titolare"
on storage.objects for delete to authenticated
using (bucket_id = 'logo' and public.is_titolare());
