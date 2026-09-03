-- ==================================================================
-- SAAS-VEICULOS — 001_schema.sql
-- Estrutura de tabelas para Supabase (Postgres)
-- Execute este arquivo primeiro no SQL Editor do Supabase.
-- ==================================================================

-- ---------- PERFIS (extensão de auth.users) ----------
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel text not null default 'funcionario' check (papel in ('admin','funcionario')),
  criado_em timestamptz not null default now()
);

-- Ao criar um usuário no Supabase Auth, cria automaticamente sua linha em perfis.
-- O PRIMEIRO usuário cadastrado no sistema vira administrador; os demais entram
-- como funcionário (um admin pode promover depois, editando a tabela perfis).
create or replace function public.lidar_novo_usuario()
returns trigger as $$
declare
  total_perfis integer;
  papel_definido text;
begin
  select count(*) into total_perfis from public.perfis;
  papel_definido := case when total_perfis = 0 then 'admin' else 'funcionario' end;
  insert into public.perfis (id, nome, papel)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), papel_definido);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.lidar_novo_usuario();

-- ---------- CLIENTES ----------
create table if not exists public.clientes (
  id bigint generated always as identity primary key,
  nome text not null,
  cpf text,
  telefone text,
  endereco text,
  observacoes text,
  criado_em timestamptz not null default now()
);

-- ---------- VEÍCULOS ----------
create table if not exists public.veiculos (
  id bigint generated always as identity primary key,
  placa text unique not null,
  marca text,
  modelo text not null,
  ano integer,
  cor text,
  km numeric,
  status text not null default 'disponivel' check (status in ('disponivel','alugado','vendido','manutencao')),
  valor_venda numeric,
  valor_diaria numeric,
  criado_em timestamptz not null default now()
);

-- ---------- FIADO ----------
create table if not exists public.fiados (
  id bigint generated always as identity primary key,
  cliente_id bigint not null references public.clientes(id),
  descricao text not null,
  valor_total numeric not null,
  data_venda timestamptz not null default now(),
  vencimento date,
  status text not null default 'aberto' check (status in ('aberto','parcial','quitado','atrasado')),
  criado_por uuid references public.perfis(id)
);

create table if not exists public.fiado_pagamentos (
  id bigint generated always as identity primary key,
  fiado_id bigint not null references public.fiados(id) on delete cascade,
  valor numeric not null,
  data_pagamento timestamptz not null default now(),
  forma_pagamento text,
  registrado_por uuid references public.perfis(id)
);

-- Recalcula o status de um fiado (aberto/parcial/quitado/atrasado) com base
-- no total pago até agora. Chamada pelo frontend depois de cada pagamento.
create or replace function public.recalcular_status_fiado(p_fiado_id bigint)
returns void as $$
declare
  v_total numeric;
  v_vencimento date;
  v_pago numeric;
  v_status text;
begin
  select valor_total, vencimento into v_total, v_vencimento from public.fiados where id = p_fiado_id;
  select coalesce(sum(valor),0) into v_pago from public.fiado_pagamentos where fiado_id = p_fiado_id;

  if v_pago >= v_total then
    v_status := 'quitado';
  elsif v_pago > 0 then
    v_status := 'parcial';
  elsif v_vencimento is not null and v_vencimento < current_date then
    v_status := 'atrasado';
  else
    v_status := 'aberto';
  end if;

  update public.fiados set status = v_status where id = p_fiado_id;
end;
$$ language plpgsql security definer;

-- ---------- LOCAÇÕES ----------
create table if not exists public.locacoes (
  id bigint generated always as identity primary key,
  veiculo_id bigint not null references public.veiculos(id),
  cliente_id bigint not null references public.clientes(id),
  data_inicio date not null,
  data_fim_prevista date,
  data_fim_real date,
  valor_diaria numeric not null,
  valor_total numeric,
  status text not null default 'ativa' check (status in ('ativa','finalizada','atrasada','cancelada')),
  criado_por uuid references public.perfis(id)
);

-- ---------- VENDAS ----------
create table if not exists public.vendas (
  id bigint generated always as identity primary key,
  veiculo_id bigint not null references public.veiculos(id),
  cliente_id bigint not null references public.clientes(id),
  valor numeric not null,
  forma_pagamento text,
  data_venda timestamptz not null default now(),
  criado_por uuid references public.perfis(id)
);
