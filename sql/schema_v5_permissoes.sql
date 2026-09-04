-- ============================================================
-- ATUALIZAÇÃO 5 — CORRIGE "PERMISSION DENIED"
-- Roda isso AGORA, resolve o erro de permissão em todas as tabelas.
-- ============================================================

grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;

alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;
