-- ============================================================
-- SISTEMA DE CREDIÁRIO — schema para Supabase (Postgres)
-- Cole isso inteiro no SQL Editor do seu projeto Supabase e rode.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- CLIENTES ----------
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  endereco text,
  cpf text,
  observacoes text,
  created_at timestamptz not null default now()
);

-- ---------- CONTRATOS (cada venda fiado ou empréstimo) ----------
create table if not exists contratos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  tipo text not null check (tipo in ('produto','emprestimo')) default 'produto',
  produto text,                 -- ex: iPhone 11 128GB (nulo se for empréstimo)
  categoria text,                -- ex: Celulares e Eletrônicos, Motos, Eletrodomésticos
  valor_total numeric(12,2) not null,
  entrada numeric(12,2) not null default 0,
  num_parcelas int not null default 1,
  garantia_dias int default 0,
  cobrador text default 'Eu',    -- quem cobra esse contrato
  data_venda date not null default current_date,
  status text not null default 'ativo' check (status in ('ativo','quitado','cancelado')),
  observacoes text,
  created_at timestamptz not null default now()
);

-- ---------- PARCELAS ----------
create table if not exists parcelas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos(id) on delete cascade,
  numero int not null,
  valor numeric(12,2) not null,
  vencimento date not null,
  status text not null default 'pendente' check (status in ('pendente','pago')),
  data_pagamento date,
  forma_pagamento text,
  observacao text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AUTOMAÇÃO 1: ao criar um contrato, gera as parcelas sozinho
-- (valor da parcela = (valor_total - entrada) / num_parcelas,
--  vencendo todo mês a partir da data da venda)
-- ============================================================
create or replace function gerar_parcelas()
returns trigger as $$
declare
  valor_parcela numeric(12,2);
  i int;
begin
  valor_parcela := round((new.valor_total - new.entrada) / new.num_parcelas, 2);
  for i in 1..new.num_parcelas loop
    insert into parcelas (contrato_id, numero, valor, vencimento)
    values (new.id, i, valor_parcela, new.data_venda + (interval '1 month' * i));
  end loop;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_gerar_parcelas on contratos;
create trigger trg_gerar_parcelas
  after insert on contratos
  for each row execute function gerar_parcelas();

-- ============================================================
-- AUTOMAÇÃO 2: quando a última parcela é paga, o contrato
-- vira "quitado" sozinho
-- ============================================================
create or replace function checar_quitacao()
returns trigger as $$
declare
  pendentes int;
begin
  if new.status = 'pago' then
    select count(*) into pendentes from parcelas
      where contrato_id = new.contrato_id and status = 'pendente';
    if pendentes = 0 then
      update contratos set status = 'quitado' where id = new.contrato_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_checar_quitacao on parcelas;
create trigger trg_checar_quitacao
  after update on parcelas
  for each row execute function checar_quitacao();

-- ============================================================
-- VIEW: calcula "atrasado" na hora (sem precisar de robô rodando)
-- ============================================================
create or replace view parcelas_status as
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
  cl.nome as cliente_nome,
  cl.telefone as cliente_telefone,
  cl.endereco as cliente_endereco
from parcelas p
join contratos c on c.id = p.contrato_id
join clientes cl on cl.id = c.cliente_id;

-- ============================================================
-- SEGURANÇA (RLS) — só quem estiver logado no seu Supabase acessa
-- ============================================================
alter table clientes enable row level security;
alter table contratos enable row level security;
alter table parcelas enable row level security;

create policy "logado pode tudo em clientes" on clientes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "logado pode tudo em contratos" on contratos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "logado pode tudo em parcelas" on parcelas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
