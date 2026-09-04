-- ============================================================
-- ATUALIZAÇÃO 30 — FUNCIONÁRIOS
-- Rode isso depois da Atualização 29.
-- ============================================================

create table if not exists funcionarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  salario numeric(12,2),
  vinculo text check (vinculo in ('clt','informal')) default 'informal',
  data_entrada date default current_date,
  data_saida_prevista date,
  observacoes text,
  excluido boolean not null default false,
  created_at timestamptz not null default now()
);

alter table funcionarios enable row level security;
drop policy if exists "admin tudo em funcionarios" on funcionarios;
create policy "admin tudo em funcionarios" on funcionarios
  for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');
