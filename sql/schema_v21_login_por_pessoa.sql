-- ============================================================
-- ATUALIZAÇÃO 21 — LOGIN POR PESSOA COM PERMISSÃO
-- MUITO IMPORTANTE: rode isso com calma, um bloco de cada vez,
-- conferindo que não deu erro antes de ir pro próximo.
-- Se algo der errado no meio, PARE e me chame antes de continuar.
-- ============================================================

-- ---------- BLOCO 1: quem é quem ----------
create table if not exists perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel text not null check (papel in ('admin','cobrador')) default 'cobrador',
  created_at timestamptz not null default now()
);

-- coloca você (quem já usa o sistema hoje) como admin automaticamente,
-- ANTES de qualquer coisa mudar de permissão — isso evita você ficar de fora
insert into perfis (id, nome, papel)
select id, email, 'admin' from auth.users
on conflict (id) do nothing;

-- função que diz qual é o papel de quem está logado agora
create or replace function meu_papel()
returns text
language sql security definer stable
as $$
  select papel from perfis where id = auth.uid();
$$;

alter table perfis enable row level security;
drop policy if exists "usuario ve o proprio perfil" on perfis;
create policy "usuario ve o proprio perfil" on perfis for select using (id = auth.uid());
drop policy if exists "admin gerencia perfis" on perfis;
create policy "admin gerencia perfis" on perfis for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

-- ---------- BLOCO 2: liga o cobrador a uma operação (pra saber o que é dele) ----------
alter table contratos add column if not exists cobrador_perfil_id uuid references auth.users(id);

-- ---------- BLOCO 3: troca as permissões antigas (livre pra todo logado)
-- por permissões por papel. A partir daqui, só admin mexe em tudo;
-- cobrador só vê e atualiza o que é da rota dele.
-- ---------- clientes ----------
drop policy if exists "logado pode tudo em clientes" on clientes;
create policy "admin tudo em clientes" on clientes for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');
create policy "cobrador ve clientes da rota dele" on clientes for select using (
  meu_papel() = 'cobrador' and exists (
    select 1 from contratos c where c.cliente_id = clientes.id and c.cobrador_perfil_id = auth.uid()
  )
);

-- ---------- contratos ----------
drop policy if exists "logado pode tudo em contratos" on contratos;
create policy "admin tudo em contratos" on contratos for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');
create policy "cobrador ve contratos da rota dele" on contratos for select using (
  meu_papel() = 'cobrador' and cobrador_perfil_id = auth.uid()
);

-- ---------- parcelas ----------
drop policy if exists "logado pode tudo em parcelas" on parcelas;
create policy "admin tudo em parcelas" on parcelas for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');
create policy "cobrador ve e marca pago parcelas da rota dele" on parcelas for select using (
  meu_papel() = 'cobrador' and exists (
    select 1 from contratos c where c.id = parcelas.contrato_id and c.cobrador_perfil_id = auth.uid()
  )
);
create policy "cobrador atualiza parcelas da rota dele" on parcelas for update using (
  meu_papel() = 'cobrador' and exists (
    select 1 from contratos c where c.id = parcelas.contrato_id and c.cobrador_perfil_id = auth.uid()
  )
);

-- ---------- todo o resto continua só pro admin (produtos, acordos, financeiro,
-- entidades, mensagens, documentos, configurações, histórico) ----------
drop policy if exists "logado pode tudo em produtos" on produtos;
create policy "admin tudo em produtos" on produtos for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

drop policy if exists "logado pode tudo em acordos" on acordos;
create policy "admin tudo em acordos" on acordos for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

drop policy if exists "logado pode tudo em movimentacoes" on movimentacoes;
create policy "admin tudo em movimentacoes" on movimentacoes for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

drop policy if exists "logado pode tudo em entidades" on entidades;
create policy "admin tudo em entidades" on entidades for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

drop policy if exists "logado pode tudo em mensagens_modelo" on mensagens_modelo;
create policy "admin tudo em mensagens_modelo" on mensagens_modelo for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

drop policy if exists "logado pode tudo em pastas" on pastas;
create policy "admin tudo em pastas" on pastas for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

drop policy if exists "logado pode tudo em documentos" on documentos;
create policy "admin tudo em documentos" on documentos for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

drop policy if exists "logado pode tudo em configuracoes" on configuracoes;
create policy "admin tudo em configuracoes" on configuracoes for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

drop policy if exists "logado pode tudo em historico" on historico_alteracoes;
create policy "admin tudo em historico" on historico_alteracoes for all using (meu_papel() = 'admin') with check (meu_papel() = 'admin');

-- ---------- BLOCO 4: todo login novo (que você criar no Supabase) já
-- ganha um perfil sozinho, como "cobrador" por padrão ----------
create or replace function criar_perfil_novo_usuario()
returns trigger as $$
begin
  insert into perfis (id, nome, papel) values (new.id, new.email, 'cobrador') on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_criar_perfil on auth.users;
create trigger trg_criar_perfil after insert on auth.users
  for each row execute function criar_perfil_novo_usuario();

