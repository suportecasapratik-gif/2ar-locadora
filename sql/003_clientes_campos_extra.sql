-- ==================================================================
-- SAAS-VEICULOS — 003_clientes_campos_extra.sql
-- Adiciona campos de documentação e status ao cadastro de clientes.
-- Execute no SQL Editor do Supabase depois do 001 e 002.
-- Seguro para rodar em bancos que já têm a tabela clientes: usa
-- "add column if not exists", não apaga nada existente.
-- ==================================================================

alter table public.clientes
  add column if not exists rg text,
  add column if not exists cnh text,
  add column if not exists cnh_vencimento date,
  add column if not exists data_nascimento date,
  add column if not exists profissao text,
  add column if not exists referencia_nome text,
  add column if not exists referencia_telefone text,
  add column if not exists status text not null default 'ativo';

-- Garante que só existam os dois valores esperados de status
alter table public.clientes drop constraint if exists clientes_status_check;
alter table public.clientes
  add constraint clientes_status_check check (status in ('ativo', 'inativo'));
