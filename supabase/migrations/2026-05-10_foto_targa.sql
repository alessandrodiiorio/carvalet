-- =====================================================================
-- Foto targa: colonna URL + Storage bucket "targhe" pubblico
-- =====================================================================

alter table public.veicoli
  add column if not exists foto_targa_url text;

-- Bucket pubblico per foto targhe
insert into storage.buckets (id, name, public)
values ('targhe', 'targhe', true)
on conflict (id) do update set public = true;

-- Lettura pubblica (immagini accessibili tramite URL)
drop policy if exists "targhe_select_pubblico" on storage.objects;
create policy "targhe_select_pubblico"
on storage.objects for select to public
using (bucket_id = 'targhe');

-- Upload da autenticati
drop policy if exists "targhe_insert_autenticati" on storage.objects;
create policy "targhe_insert_autenticati"
on storage.objects for insert to authenticated
with check (bucket_id = 'targhe');

-- Update propri file
drop policy if exists "targhe_update_autenticati" on storage.objects;
create policy "targhe_update_autenticati"
on storage.objects for update to authenticated
using (bucket_id = 'targhe' and auth.uid()::text = owner_id);

-- Delete propri file
drop policy if exists "targhe_delete_autenticati" on storage.objects;
create policy "targhe_delete_autenticati"
on storage.objects for delete to authenticated
using (bucket_id = 'targhe' and auth.uid()::text = owner_id);
