-- ==================================================================
-- SAAS-VEICULOS — 002_rls_policies.sql
-- Ativa Row Level Security e define as políticas de acesso.
-- Execute depois do 001_schema.sql.
-- ==================================================================

alter table public.perfis enable row level security;
alter table public.clientes enable row level security;
alter table public.veiculos enable row level security;
alter table public.fiados enable row level security;
alter table public.fiado_pagamentos enable row level security;
alter table public.locacoes enable row level security;
alter table public.vendas enable row level security;

-- Função auxiliar: o usuário logado é administrador?
create or replace function public.eh_admin()
returns boolean as $$
  select exists (
    select 1 from public.perfis where id = auth.uid() and papel = 'admin'
  );
$$ language sql security definer stable;

-- ---------- PERFIS ----------
-- Qualquer funcionário logado pode ver a equipe.
create policy "perfis_select" on public.perfis
  for select using (auth.role() = 'authenticated');
-- Só o próprio usuário ou um admin pode alterar um perfil (ex: trocar papel).
create policy "perfis_update" on public.perfis
  for update using (auth.uid() = id or public.eh_admin());

-- ---------- CLIENTES ----------
create policy "clientes_select" on public.clientes for select using (auth.role() = 'authenticated');
create policy "clientes_insert" on public.clientes for insert with check (auth.role() = 'authenticated');
create policy "clientes_update" on public.clientes for update using (auth.role() = 'authenticated');
create policy "clientes_delete" on public.clientes for delete using (public.eh_admin());

-- ---------- VEÍCULOS ----------
create policy "veiculos_select" on public.veiculos for select using (auth.role() = 'authenticated');
create policy "veiculos_insert" on public.veiculos for insert with check (auth.role() = 'authenticated');
create policy "veiculos_update" on public.veiculos for update using (auth.role() = 'authenticated');
create policy "veiculos_delete" on public.veiculos for delete using (public.eh_admin());

-- ---------- FIADO ----------
create policy "fiados_select" on public.fiados for select using (auth.role() = 'authenticated');
create policy "fiados_insert" on public.fiados for insert with check (auth.role() = 'authenticated');
create policy "fiados_update" on public.fiados for update using (auth.role() = 'authenticated');

create policy "fiado_pagamentos_select" on public.fiado_pagamentos for select using (auth.role() = 'authenticated');
create policy "fiado_pagamentos_insert" on public.fiado_pagamentos for insert with check (auth.role() = 'authenticated');

-- ---------- LOCAÇÕES ----------
create policy "locacoes_select" on public.locacoes for select using (auth.role() = 'authenticated');
create policy "locacoes_insert" on public.locacoes for insert with check (auth.role() = 'authenticated');
create policy "locacoes_update" on public.locacoes for update using (auth.role() = 'authenticated');

-- ---------- VENDAS ----------
create policy "vendas_select" on public.vendas for select using (auth.role() = 'authenticated');
create policy "vendas_insert" on public.vendas for insert with check (auth.role() = 'authenticated');
