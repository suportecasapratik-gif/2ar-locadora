-- ============================================================
-- ATUALIZAÇÃO 4 — FOTOS E DOCUMENTOS DO CLIENTE
-- Rode isso no SQL Editor do Supabase (depois dos outros scripts).
-- ============================================================

-- ---------- colunas novas em clientes (guardam o "caminho" do arquivo) ----------
alter table clientes add column if not exists foto_path text;
alter table clientes add column if not exists doc_frente_path text;
alter table clientes add column if not exists doc_verso_path text;
alter table clientes add column if not exists comprovante_path text;

-- ---------- espaço de armazenamento PRIVADO (ninguém de fora acessa) ----------
insert into storage.buckets (id, name, public)
values ('documentos-clientes', 'documentos-clientes', false)
on conflict (id) do nothing;

-- só quem estiver logado no seu sistema pode enviar, ver, trocar ou apagar
drop policy if exists "logado envia arquivos de clientes" on storage.objects;
create policy "logado envia arquivos de clientes"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos-clientes');

drop policy if exists "logado ve arquivos de clientes" on storage.objects;
create policy "logado ve arquivos de clientes"
  on storage.objects for select to authenticated
  using (bucket_id = 'documentos-clientes');

drop policy if exists "logado atualiza arquivos de clientes" on storage.objects;
create policy "logado atualiza arquivos de clientes"
  on storage.objects for update to authenticated
  using (bucket_id = 'documentos-clientes');

drop policy if exists "logado apaga arquivos de clientes" on storage.objects;
create policy "logado apaga arquivos de clientes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documentos-clientes');
