-- ============================================================
-- ATUALIZAÇÃO 28 — FOTO DO CLIENTE EM OPERAÇÕES
-- Rode isso depois da Atualização 27.
-- ============================================================

drop view if exists operacoes_status cascade;
create view operacoes_status as
select
  c.*,
  cl.nome as cliente_nome,
  cl.codigo as cliente_codigo,
  cl.foto_path as cliente_foto_path,
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
