-- ============================================================
-- ATUALIZAÇÃO 20 — ALÍQUOTA DE IMPOSTO POR PJ/MEI
-- Rode isso depois da Atualização 19.
-- ============================================================

alter table entidades add column if not exists aliquota_imposto numeric(5,2) default 0;
