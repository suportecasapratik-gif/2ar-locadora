-- ============================================================
-- ATUALIZAÇÃO 8 — OPERAÇÕES COMPLETAS
-- Rode isso depois da Atualização 7.
-- ============================================================

-- ---------- campos novos ----------
alter table contratos add column if not exists custo_produto numeric(12,2) default 0;
alter table contratos add column if not exists desconto numeric(12,2) default 0;
alter table contratos add column if not exists tipo_parcela text
  check (tipo_parcela in ('mensal','semanal','diaria')) default 'mensal';

-- ---------- status expandido ----------
alter table contratos drop constraint if exists contratos_status_check;
update contratos set status = 'em_aberto' where status = 'ativo';
update contratos set status = 'pago' where status = 'quitado';
alter table contratos alter column status set default 'em_aberto';
alter table contratos add constraint contratos_status_check
  check (status in ('em_aberto','agendado','pago','cancelado','acordo_feito'));

-- ---------- gerar parcelas agora respeita tipo (mensal/semanal/diária) e desconto ----------
create or replace function gerar_parcelas()
returns trigger as $$
declare
  valor_parcela numeric(12,2);
  intervalo interval;
  i int;
begin
  valor_parcela := round((new.valor_total - new.entrada - coalesce(new.desconto,0)) / new.num_parcelas, 2);

  intervalo := case new.tipo_parcela
    when 'semanal' then interval '7 days'
    when 'diaria' then interval '1 day'
    else interval '1 month'
  end;

  for i in 1..new.num_parcelas loop
    insert into parcelas (contrato_id, numero, valor, vencimento)
    values (new.id, i, valor_parcela, new.data_venda + (intervalo * i));
  end loop;
  return new;
end;
$$ language plpgsql;

-- contrato quitado agora vira "pago" (não mais "quitado")
create or replace function checar_quitacao()
returns trigger as $$
declare
  pendentes int;
begin
  if new.status = 'pago' then
    select count(*) into pendentes from parcelas
      where contrato_id = new.contrato_id and status = 'pendente';
    if pendentes = 0 then
      update contratos set status = 'pago' where id = new.contrato_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- ---------- view com lucro, urgência e status real (atrasado calculado sozinho) ----------
create or replace view operacoes_status as
select
  c.*,
  cl.nome as cliente_nome,
  cl.codigo as cliente_codigo,
  (c.valor_total - c.entrada - coalesce(c.desconto,0)) as valor_financiado,
  (c.valor_total - coalesce(c.custo_produto,0) - coalesce(c.desconto,0)) as lucro_estimado,
  case when c.garantia_dias > 0 then 'baixa' else 'alta' end as nivel_urgencia,
  case
    when c.status = 'em_aberto' and exists (
      select 1 from parcelas p
      where p.contrato_id = c.id and p.status = 'pendente' and p.vencimento < current_date
    ) then 'atrasado'
    else c.status
  end as status_real
from contratos c
join clientes cl on cl.id = c.cliente_id;
