-- ============================================================
-- ATUALIZAÇÃO 11 — COBRANÇAS COMPLETAS
-- Rode isso depois da Atualização 10.
-- ============================================================

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
join clientes cl on cl.id = c.cliente_id;

-- resumo por cliente: quanto já pagou e quantas operações ativas tem
create or replace view clientes_resumo as
select
  cl.id as cliente_id,
  coalesce(sum(p.valor) filter (where p.status = 'pago'), 0) as total_pago,
  count(distinct c.id) filter (where c.status not in ('pago','cancelado')) as operacoes_ativas
from clientes cl
left join contratos c on c.cliente_id = cl.id
left join parcelas p on p.contrato_id = c.id
group by cl.id;
