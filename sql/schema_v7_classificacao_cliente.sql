-- ============================================================
-- ATUALIZAÇÃO 7 — CLASSIFICAÇÃO DE RISCO DO CLIENTE
-- Rode isso depois da Atualização 6.
-- ============================================================

alter table clientes add column if not exists classificacao text
  check (classificacao in ('alto_risco','bom_pagador','padrao')) default 'padrao';
