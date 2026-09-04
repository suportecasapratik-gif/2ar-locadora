-- ============================================================
-- ATUALIZAÇÃO 23 — PAGAMENTO PARCIAL
-- Rode isso depois da Atualização 22.
-- ============================================================

alter table parcelas add column if not exists valor_pago numeric(12,2) not null default 0;

alter table parcelas drop constraint if exists parcelas_status_check;
alter table parcelas add constraint parcelas_status_check
  check (status in ('pendente','pago','cancelada','parcial'));

-- a partir de agora, quem registra a entrada no financeiro é o próprio site
-- (pra poder registrar só o valor que realmente foi pago, parcial ou total),
-- então desligamos o lançamento automático antigo pra não duplicar
drop trigger if exists trg_entrada_parcela on parcelas;

-- atualiza a view: agora calcula "atrasado" também pra parcial, e mostra
-- quanto ainda falta pagar de cada parcela
drop view if exists parcelas_status cascade;
create view parcelas_status as
select
  p.*,
  (p.valor - coalesce(p.valor_pago,0)) as valor_restante,
  case
    when p.status in ('pendente','parcial') and p.vencimento < current_date then 'atrasado'
    else p.status
  end as status_real,
  c.cliente_id,
  c.produto,
  c.tipo,
  c.cobrador,
  c.tipo_cobranca,
  c.status as status_operacao,
  cl.nome as cliente_nome,
  cl.codigo as cliente_codigo,
  cl.telefone as cliente_telefone,
  cl.endereco as cliente_endereco
from parcelas p
join contratos c on c.id = p.contrato_id
join clientes cl on cl.id = c.cliente_id
where coalesce(c.excluido, false) = false;
