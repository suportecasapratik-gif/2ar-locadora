-- ============================================================
-- ATUALIZAÇÃO 2 — ESTOQUE + FINANCEIRO AUTOMÁTICO
-- Rode isso DEPOIS do schema.sql original, no SQL Editor do Supabase.
-- Pode rodar mesmo se já tiver dados — não apaga nada.
-- ============================================================

-- ---------- sequência pro código do produto (COM-1001, COM-1002...) ----------
create sequence if not exists produtos_cmp_seq start 1001;

-- ---------- ESTOQUE ----------
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  cmp text not null default ('COM-' || nextval('produtos_cmp_seq')::text),
  produto text not null,
  categoria text,
  custo numeric(12,2) not null default 0,      -- quanto você pagou (PREÇO DC)
  com_entrada boolean default false,
  garantia_dias int default 0,
  ticket text check (ticket in ('baixo','medio','alto')) default 'medio',
  markup_percent numeric(5,2),                  -- % de lucro planejado (MOCKUP)
  link text,
  descricao text,
  status text not null default 'disponivel'
    check (status in ('disponivel','agendado','em_analise','vendido')),
  data_aquisicao date default current_date,
  data_venda date,
  created_at timestamptz not null default now()
);

alter table produtos enable row level security;
create policy "logado pode tudo em produtos" on produtos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- liga um contrato a um item do estoque (opcional — pode continuar
-- cadastrando produto "avulso" digitado, sem vir do estoque)
alter table contratos add column if not exists produto_id uuid references produtos(id);

-- ---------- MOVIMENTAÇÕES FINANCEIRAS (o "caixa" automático) ----------
create table if not exists movimentacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada','saida')),
  valor numeric(12,2) not null,
  categoria text,               -- ex: Compra de estoque, Parcela recebida, Entrada de venda
  descricao text,
  data date not null default current_date,
  origem_tipo text,             -- 'produto' | 'contrato' | 'parcela' | 'manual'
  origem_id uuid,
  created_at timestamptz not null default now()
);

alter table movimentacoes enable row level security;
create policy "logado pode tudo em movimentacoes" on movimentacoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- AUTOMAÇÃO: comprou produto pro estoque -> lança saída sozinho
-- ============================================================
create or replace function lancar_saida_estoque()
returns trigger as $$
begin
  if new.custo > 0 then
    insert into movimentacoes (tipo, valor, categoria, descricao, data, origem_tipo, origem_id)
    values ('saida', new.custo, 'Compra de estoque', new.produto, new.data_aquisicao, 'produto', new.id);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_saida_estoque on produtos;
create trigger trg_saida_estoque
  after insert on produtos
  for each row execute function lancar_saida_estoque();

-- ============================================================
-- AUTOMAÇÃO: quando o contrato tem entrada em dinheiro -> lança entrada sozinho
-- e, se veio de um item do estoque, marca esse item como "vendido"
-- ============================================================
create or replace function processar_novo_contrato()
returns trigger as $$
begin
  if new.entrada > 0 then
    insert into movimentacoes (tipo, valor, categoria, descricao, data, origem_tipo, origem_id)
    values ('entrada', new.entrada, 'Entrada de venda', new.produto, new.data_venda, 'contrato', new.id);
  end if;

  if new.produto_id is not null then
    update produtos set status = 'vendido', data_venda = new.data_venda where id = new.produto_id;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_processar_contrato on contratos;
create trigger trg_processar_contrato
  after insert on contratos
  for each row execute function processar_novo_contrato();

-- ============================================================
-- AUTOMAÇÃO: parcela paga -> lança entrada sozinho
-- (roda junto com a automação que já existia de quitar o contrato)
-- ============================================================
create or replace function lancar_entrada_parcela()
returns trigger as $$
begin
  if new.status = 'pago' and (old.status is distinct from 'pago') then
    insert into movimentacoes (tipo, valor, categoria, descricao, data, origem_tipo, origem_id)
    values ('entrada', new.valor, 'Parcela recebida',
            'Parcela ' || new.numero, coalesce(new.data_pagamento, current_date), 'parcela', new.id);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_entrada_parcela on parcelas;
create trigger trg_entrada_parcela
  after update on parcelas
  for each row execute function lancar_entrada_parcela();
