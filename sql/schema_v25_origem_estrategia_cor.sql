-- ============================================================
-- ATUALIZAÇÃO 25 — ORIGEM DO PRODUTO + ESTRATÉGIA DE ALOCAÇÃO + COR DA META
-- Rode isso depois da Atualização 24.
-- ============================================================

alter table produtos add column if not exists origem text
  check (origem in ('estoque','parceria','encomenda')) default 'estoque';

-- estratégia de como dividir o que entra: despesas, reinvestir, pró-labore/equipe, reserva
alter table configuracoes add column if not exists pct_despesas numeric(5,2) not null default 30;
alter table configuracoes add column if not exists pct_reinvestimento numeric(5,2) not null default 30;
alter table configuracoes add column if not exists pct_prolabore numeric(5,2) not null default 30;
alter table configuracoes add column if not exists pct_reserva numeric(5,2) not null default 10;
alter table configuracoes add column if not exists meta_cor text default '#12B76A';
