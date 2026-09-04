-- ============================================================
-- ATUALIZAÇÃO 17 — COBRANÇA PRESENCIAL/ONLINE + ACORDO PARCELADO
-- Rode isso depois da Atualização 16.
-- ============================================================

-- tipo de cobrança na operação
alter table contratos add column if not exists tipo_cobranca text
  check (tipo_cobranca in ('presencial','online')) default 'presencial';

-- acordo agora pode ser normal ou parcelado
alter table acordos add column if not exists tipo_acordo text
  check (tipo_acordo in ('normal','parcelado')) default 'normal';
alter table acordos add column if not exists num_parcelas int default 1;

-- contratos aceita o tipo "acordo" (pra quando um acordo parcelado vira operação)
alter table contratos drop constraint if exists contratos_tipo_check;
alter table contratos add constraint contratos_tipo_check check (tipo in ('produto','emprestimo','acordo'));

-- atualiza a view de cobranças pra trazer o tipo de cobrança
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
