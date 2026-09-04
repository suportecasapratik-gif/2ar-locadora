-- ============================================================
-- ATUALIZAÇÃO 13 — EXCLUIR COM LIXEIRA (recuperável)
-- Rode isso depois da Atualização 12.
-- ============================================================

alter table clientes add column if not exists excluido boolean not null default false;
alter table produtos add column if not exists excluido boolean not null default false;
alter table contratos add column if not exists excluido boolean not null default false;
alter table acordos add column if not exists excluido boolean not null default false;
