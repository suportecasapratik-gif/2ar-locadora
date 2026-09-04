-- ============================================================
-- ATUALIZAÇÃO 19 — HISTÓRICO DE ALTERAÇÕES (desfazer)
-- Rode isso depois da Atualização 18.
-- ============================================================

create table if not exists historico_alteracoes (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  registro_id uuid not null,
  operacao text not null check (operacao in ('insert','update','delete')),
  dados_antes jsonb,
  dados_depois jsonb,
  created_at timestamptz not null default now()
);

alter table historico_alteracoes enable row level security;
drop policy if exists "logado pode tudo em historico" on historico_alteracoes;
create policy "logado pode tudo em historico" on historico_alteracoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create or replace function registrar_historico()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into historico_alteracoes(tabela, registro_id, operacao, dados_depois)
      values (tg_table_name, new.id, 'insert', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into historico_alteracoes(tabela, registro_id, operacao, dados_antes, dados_depois)
      values (tg_table_name, new.id, 'update', to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into historico_alteracoes(tabela, registro_id, operacao, dados_antes)
      values (tg_table_name, old.id, 'delete', to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_historico_clientes on clientes;
create trigger trg_historico_clientes after insert or update or delete on clientes
  for each row execute function registrar_historico();

drop trigger if exists trg_historico_contratos on contratos;
create trigger trg_historico_contratos after insert or update or delete on contratos
  for each row execute function registrar_historico();

drop trigger if exists trg_historico_produtos on produtos;
create trigger trg_historico_produtos after insert or update or delete on produtos
  for each row execute function registrar_historico();

drop trigger if exists trg_historico_acordos on acordos;
create trigger trg_historico_acordos after insert or update or delete on acordos
  for each row execute function registrar_historico();
