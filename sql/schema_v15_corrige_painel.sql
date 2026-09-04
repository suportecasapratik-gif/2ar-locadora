-- ============================================================
-- ATUALIZAÇÃO 15 — CORRIGE PAINEL CONTANDO COISA EXCLUÍDA
-- Rode isso depois da Atualização 14.
-- ============================================================

-- parcelas de uma operação excluída não devem aparecer em lugar nenhum
drop view if exists parcelas_status cascade;
create view parcelas_status as
select
  p.*,
  case
    when p.status = 'pendente' and p.vencimento < current_date then 'atrasado'
    else p.status
  end as status_real,
  c.cliente_id,
  c.produto,
  c.tipo,
  c.cobrador,
  c.status as status_operacao,
  cl.nome as cliente_nome,
  cl.codigo as cliente_codigo,
  cl.telefone as cliente_telefone,
  cl.endereco as cliente_endereco
from parcelas p
join contratos c on c.id = p.contrato_id
join clientes cl on cl.id = c.cliente_id
where coalesce(c.excluido, false) = false;

-- operações excluídas somem de vez de qualquer lista/cálculo
drop view if exists operacoes_status cascade;
create view operacoes_status as
select
  c.*,
  cl.nome as cliente_nome,
  cl.codigo as cliente_codigo,
  ent.nome_identificacao as entidade_nome,
  ent.tipo as entidade_tipo,
  ent.documento as entidade_documento,
  ent.cnaes as entidade_cnaes,
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
left join entidades ent on ent.id = c.entidade_id
where coalesce(c.excluido, false) = false;

-- acordos excluídos também somem
drop view if exists acordos_status cascade;
create view acordos_status as
select
  a.*,
  cl.nome as cliente_nome,
  cl.codigo as cliente_codigo,
  case
    when a.status = 'pendente' and a.data_vencimento < current_date then 'atrasado'
    when a.status = 'pendente' and a.data_vencimento = current_date then 'hoje'
    else a.status
  end as status_real
from acordos a
join clientes cl on cl.id = a.cliente_id
where coalesce(a.excluido, false) = false;

-- forma de pagamento nas movimentações
alter table movimentacoes add column if not exists forma_pagamento text;

-- ID pra cada pasta de documentos
create sequence if not exists pastas_codigo_seq start 1;
alter table pastas add column if not exists codigo text;
alter table pastas alter column codigo set default ('PASTA-' || lpad(nextval('pastas_codigo_seq')::text, 3, '0'));
update pastas set codigo = 'PASTA-' || lpad(nextval('pastas_codigo_seq')::text, 3, '0') where codigo is null;
