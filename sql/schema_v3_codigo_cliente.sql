-- ============================================================
-- ATUALIZAÇÃO 3 — CÓDIGO DO CLIENTE + QUEM INDICOU
-- Rode isso no SQL Editor do Supabase (depois dos outros dois scripts).
-- Não apaga nada do que já existe.
-- ============================================================

create sequence if not exists clientes_codigo_seq start 1;

alter table clientes add column if not exists codigo text;
alter table clientes add column if not exists indicado_por text;

-- preenche o código de quem já foi cadastrado sem código
update clientes set codigo = 'CLI-' || lpad(nextval('clientes_codigo_seq')::text, 4, '0')
where codigo is null;

-- a partir de agora, todo cliente novo já nasce com código sozinho
alter table clientes alter column codigo set default ('CLI-' || lpad(nextval('clientes_codigo_seq')::text, 4, '0'));
