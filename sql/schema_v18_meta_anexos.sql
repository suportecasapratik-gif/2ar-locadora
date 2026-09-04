-- ============================================================
-- ATUALIZAÇÃO 18 — META/RECOMPENSA + ANEXOS EM MENSAGENS
-- Rode isso depois da Atualização 17.
-- ============================================================

create table if not exists configuracoes (
  id int primary key default 1,
  objetivo_nome text not null default 'Meta do mês',
  objetivo_valor numeric(12,2) not null default 0,
  foto_recompensa_path text,
  constraint configuracoes_singleton check (id = 1)
);

insert into configuracoes (id) values (1) on conflict (id) do nothing;

alter table configuracoes enable row level security;
drop policy if exists "logado pode tudo em configuracoes" on configuracoes;
create policy "logado pode tudo em configuracoes" on configuracoes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- mensagens agora podem ter fotos, vídeos, áudios ou documentos anexados
alter table mensagens_modelo add column if not exists anexos text[] not null default '{}';
