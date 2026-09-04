-- ============================================================
-- ATUALIZAÇÃO 14 — VÁRIOS CNAEs POR PJ/MEI
-- Rode isso depois da Atualização 13.
-- ============================================================

alter table entidades add column if not exists cnaes text[] not null default '{}';

-- aproveita o CNAE único que já existia, se tiver, e joga na nova lista
update entidades set cnaes = array[cnae] where cnae is not null and cnaes = '{}';
