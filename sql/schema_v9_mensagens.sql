-- ============================================================
-- ATUALIZAÇÃO 9 — MENSAGENS PRONTAS
-- Rode isso depois da Atualização 8.
-- ============================================================

create table if not exists mensagens_modelo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  texto text not null,
  created_at timestamptz not null default now()
);

alter table mensagens_modelo enable row level security;
drop policy if exists "logado pode tudo em mensagens_modelo" on mensagens_modelo;
create policy "logado pode tudo em mensagens_modelo" on mensagens_modelo
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into mensagens_modelo (nome, texto)
select * from (values
  ('Lembrete de vencimento', 'Olá! Passando pra lembrar que sua parcela vence amanhã. Qualquer dúvida, me chama por aqui 🙂'),
  ('Cobrança — em atraso', 'Olá! Notei que sua parcela está em atraso. Pode me passar uma previsão de pagamento, por favor?'),
  ('Confirmação de pagamento', 'Recebido! Pagamento confirmado, obrigado 🙌'),
  ('Proposta de acordo', 'Olá! Pra regularizar seu débito, consigo fazer um acordo com novas condições. Posso te explicar como fica?')
) as v(nome, texto)
where not exists (select 1 from mensagens_modelo);
