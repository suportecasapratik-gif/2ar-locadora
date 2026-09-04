-- ============================================================
-- ATUALIZAÇÃO 10 — ACORDOS
-- Rode isso depois da Atualização 9.
-- ============================================================

create table if not exists acordos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  contrato_id uuid references contratos(id) on delete set null,
  data_acordo date not null default current_date,
  data_vencimento date not null,
  valor numeric(12,2) not null,
  status text not null default 'pendente' check (status in ('pendente','pago')),
  observacoes text,
  created_at timestamptz not null default now()
);

alter table acordos enable row level security;
drop policy if exists "logado pode tudo em acordos" on acordos;
create policy "logado pode tudo em acordos" on acordos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- quando o acordo é marcado como pago, o contrato ligado a ele também vira "pago"
create or replace function processar_pagamento_acordo()
returns trigger as $$
begin
  if new.status = 'pago' and (old.status is distinct from 'pago') and new.contrato_id is not null then
    update contratos set status = 'pago' where id = new.contrato_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pagamento_acordo on acordos;
create trigger trg_pagamento_acordo
  after update on acordos
  for each row execute function processar_pagamento_acordo();

-- alerta automático: atrasado, é hoje, ou pendente normal
create or replace view acordos_status as
select
  a.*,
  cl.nome as cliente_nome,
  cl.codigo as cliente_codigo,
  case
    when a.status = 'pendente' and a.data_vencimento < current_date then 'atrasado'
    when a.status = 'pendente' and a.data_vencimento = current_date then 'hoje'
    else a.status
  end as status_real
from acordos a
join clientes cl on cl.id = a.cliente_id;
