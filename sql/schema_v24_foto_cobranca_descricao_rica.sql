-- ============================================================
-- ATUALIZAÇÃO 24 — FOTO EM COBRANÇAS + DESCRIÇÃO RICA NO FINANCEIRO
-- Rode isso depois da Atualização 23.
-- ============================================================

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
  cl.endereco as cliente_endereco,
  cl.foto_path as cliente_foto_path
from parcelas p
join contratos c on c.id = p.contrato_id
join clientes cl on cl.id = c.cliente_id
where coalesce(c.excluido, false) = false;

-- entrada de venda passa a incluir o nome do cliente na descrição sozinho
create or replace function processar_novo_contrato()
returns trigger as $$
declare
  nome_cliente text;
begin
  select nome into nome_cliente from clientes where id = new.cliente_id;

  if new.entrada > 0 then
    insert into movimentacoes (tipo, valor, categoria, descricao, data, origem_tipo, origem_id)
    values ('entrada', new.entrada, 'Entrada de venda',
            coalesce(nome_cliente,'Cliente') || ' — ' || coalesce(new.produto,'Empréstimo') || ' (entrada)',
            new.data_venda, 'contrato', new.id);
  end if;

  if new.produto_id is not null then
    update produtos set status = 'vendido', data_venda = new.data_venda where id = new.produto_id;
  end if;

  return new;
end;
$$ language plpgsql;

-- compra de estoque passa a incluir a categoria na descrição
create or replace function lancar_saida_estoque()
returns trigger as $$
begin
  if new.custo > 0 then
    insert into movimentacoes (tipo, valor, categoria, descricao, data, origem_tipo, origem_id)
    values ('saida', new.custo, 'Compra de estoque',
            new.produto || coalesce(' — ' || new.categoria, ''),
            new.data_aquisicao, 'produto', new.id);
  end if;
  return new;
end;
$$ language plpgsql;
