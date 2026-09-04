-- ============================================================
-- ATUALIZAÇÃO 12 — PF/PJ, ID DA VENDA, ENCERRAMENTO AUTOMÁTICO
-- Rode isso depois da Atualização 11.
-- ============================================================

-- ---------- PF / MEI / PJ ----------
create table if not exists entidades (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('pf','mei','pj')) default 'pf',
  nome_identificacao text not null,   -- como você quer chamar (ex: "Eu - PF", "Loja Fulano - MEI")
  documento text,                     -- CPF ou CNPJ
  cnae text,
  created_at timestamptz not null default now()
);

alter table entidades enable row level security;
drop policy if exists "logado pode tudo em entidades" on entidades;
create policy "logado pode tudo em entidades" on entidades
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------- campos novos na operação ----------
alter table contratos add column if not exists entidade_id uuid references entidades(id);
alter table contratos add column if not exists numero_venda text;
alter table contratos add column if not exists comprovante_path text;
alter table contratos add column if not exists nota_fiscal_path text;

create sequence if not exists contratos_numero_venda_seq start 1;
alter table contratos alter column numero_venda
  set default ('VND-' || lpad(nextval('contratos_numero_venda_seq')::text, 4, '0'));

update contratos set numero_venda = 'VND-' || lpad(nextval('contratos_numero_venda_seq')::text, 4, '0')
where numero_venda is null;

-- ---------- parcela ganha o status "cancelada" ----------
alter table parcelas drop constraint if exists parcelas_status_check;
alter table parcelas add constraint parcelas_status_check
  check (status in ('pendente','pago','cancelada'));

-- ---------- ao cancelar ou fazer acordo, as parcelas que restavam encerram sozinhas ----------
create or replace function encerrar_parcelas_restantes()
returns trigger as $$
begin
  if new.status in ('cancelado','acordo_feito') and (old.status is distinct from new.status) then
    update parcelas set status = 'cancelada'
      where contrato_id = new.id and status = 'pendente';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_encerrar_parcelas on contratos;
create trigger trg_encerrar_parcelas
  after update on contratos
  for each row execute function encerrar_parcelas_restantes();

-- ---------- financeiro: hora, conta e entidade nos lançamentos ----------
alter table movimentacoes add column if not exists hora time;
alter table movimentacoes add column if not exists conta text;
alter table movimentacoes add column if not exists entidade_id uuid references entidades(id);

-- ---------- view de operações atualizada com entidade e novo status "cancelada" ----------
drop view if exists operacoes_status cascade;
create view operacoes_status as
select
  c.*,
  cl.nome as cliente_nome,
  cl.codigo as cliente_codigo,
  ent.nome_identificacao as entidade_nome,
  ent.tipo as entidade_tipo,
  ent.documento as entidade_documento,
  ent.cnae as entidade_cnae,
  (c.valor_total - c.entrada - coalesce(c.desconto,0)) as valor_financiado,
  (c.valor_total - coalesce(c.custo_produto,0) - coalesce(c.desconto,0)) as lucro_estimado,
  case when c.garantia_dias > 0 then 'baixa' else 'alta' end as nivel_urgencia,
  case
    when c.status = 'em_aberto' and exists (
      select 1 from parcelas p
      where p.contrato_id = c.id and p.status = 'pendente' and p.vencimento < current_date
    ) then 'atrasado'
    else c.status
  end as status_real,
  (select min(p.vencimento) from parcelas p where p.contrato_id = c.id and p.status = 'pendente') as proximo_vencimento
from contratos c
join clientes cl on cl.id = c.cliente_id
left join entidades ent on ent.id = c.entidade_id;
