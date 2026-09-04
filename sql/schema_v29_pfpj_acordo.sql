-- ============================================================
-- ATUALIZAÇÃO 29 — PF/PJ NO ACORDO
-- Rode isso depois da Atualização 28.
-- ============================================================

alter table acordos add column if not exists entidade_id uuid references entidades(id);

-- formas de pagamento clicáveis (você pode adicionar novas)
create table if not exists formas_pagamento (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);
alter table formas_pagamento enable row level security;
drop policy if exists "admin tudo em formas_pagamento" on formas_pagamento;
create policy "admin tudo em formas_pagamento" on formas_pagamento
  for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

insert into formas_pagamento (nome)
select * from (values ('Pix'), ('Dinheiro'), ('Cartão de crédito'), ('Cartão de débito'), ('Boleto')) as v(nome)
where not exists (select 1 from formas_pagamento);


drop view if exists acordos_status cascade;
create view acordos_status as
select
  a.*,
  cl.nome as cliente_nome,
  cl.codigo as cliente_codigo,
  ent.nome_identificacao as entidade_nome,
  case
    when a.status = 'pendente' and a.data_vencimento < current_date then 'atrasado'
    when a.status = 'pendente' and a.data_vencimento = current_date then 'hoje'
    else a.status
  end as status_real
from acordos a
join clientes cl on cl.id = a.cliente_id
left join entidades ent on ent.id = a.entidade_id
where coalesce(a.excluido, false) = false;
