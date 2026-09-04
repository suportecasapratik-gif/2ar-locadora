-- ============================================================
-- ATUALIZAÇÃO 6 — PASTAS E DOCUMENTOS (organização manual)
-- Rode isso depois da Atualização 5.
-- ============================================================

create table if not exists pastas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  pasta_pai_id uuid references pastas(id) on delete cascade,
  cliente_id uuid references clientes(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table pastas enable row level security;
drop policy if exists "logado pode tudo em pastas" on pastas;
create policy "logado pode tudo em pastas" on pastas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create table if not exists documentos (
  id uuid primary key default gen_random_uuid(),
  pasta_id uuid references pastas(id) on delete cascade,
  nome_arquivo text not null,
  caminho text not null,      -- caminho dentro do armazenamento (storage)
  tamanho_kb numeric,
  created_at timestamptz not null default now()
);

alter table documentos enable row level security;
drop policy if exists "logado pode tudo em documentos" on documentos;
create policy "logado pode tudo em documentos" on documentos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- reaproveita o mesmo espaço de armazenamento já criado na Atualização 4
insert into storage.buckets (id, name, public)
values ('documentos-clientes', 'documentos-clientes', false)
on conflict (id) do nothing;
