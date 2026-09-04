-- ============================================================
-- ATUALIZAÇÃO 22 — ROTA DE COBRANÇA (tentativas registradas)
-- Rode isso depois da Atualização 21.
-- ============================================================

create table if not exists tentativas_cobranca (
  id uuid primary key default gen_random_uuid(),
  parcela_id uuid not null references parcelas(id) on delete cascade,
  cobrador_id uuid references auth.users(id),
  data date not null default current_date,
  resultado text not null check (resultado in ('pagou','nao_pagou','prometeu_pagar','nao_encontrado')),
  observacao text,
  created_at timestamptz not null default now()
);

alter table tentativas_cobranca enable row level security;

drop policy if exists "admin tudo em tentativas" on tentativas_cobranca;
create policy "admin tudo em tentativas" on tentativas_cobranca
  for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

drop policy if exists "cobrador registra tentativas da rota dele" on tentativas_cobranca;
create policy "cobrador registra tentativas da rota dele" on tentativas_cobranca
  for all using (
    meu_papel() = 'cobrador' and exists (
      select 1 from parcelas p join contratos c on c.id = p.contrato_id
      where p.id = tentativas_cobranca.parcela_id and c.cobrador_perfil_id = auth.uid()
    )
  )
  with check (
    meu_papel() = 'cobrador' and exists (
      select 1 from parcelas p join contratos c on c.id = p.contrato_id
      where p.id = tentativas_cobranca.parcela_id and c.cobrador_perfil_id = auth.uid()
    )
  );
