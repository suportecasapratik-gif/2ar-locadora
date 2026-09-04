-- ============================================================
-- ATUALIZAÇÃO 16 — FOTOS/VÍDEO DO PRODUTO + ORDEM EM DOCUMENTOS
-- Rode isso depois da Atualização 15.
-- ============================================================

alter table produtos add column if not exists fotos text[] not null default '{}';
alter table produtos add column if not exists video_link text;

alter table pastas add column if not exists ordem int not null default 0;
alter table documentos add column if not exists ordem int not null default 0;
