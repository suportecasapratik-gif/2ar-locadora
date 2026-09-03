# Changelog — SAAS-VEICULOS

Todas as versões entregues do sistema, mais recentes primeiro.

---

## v0.1 — 2026-09-03

Primeira versão na arquitetura **Supabase + GitHub**, substituindo o protótipo inicial
que era em Node.js/Express/SQLite.

### Adicionado
- Autenticação de usuários via Supabase Auth (login, cadastro, sessão, logout)
- Primeiro usuário cadastrado vira administrador automaticamente (trigger no banco);
  demais entram como funcionário
- Módulo **Fiado**: registro de venda a prazo, recebimento de pagamentos parciais,
  status automático (aberto, parcial, quitado, atrasado)
- Módulo **Locação**: contratos de aluguel de veículos, controle de disponibilidade,
  finalização de contrato
- Módulo **Venda**: venda de veículos do estoque
- Módulo **Veículos**: cadastro e edição do estoque, com status (disponível, alugado,
  vendido, manutenção)
- Módulo **Clientes**: cadastro geral, busca por nome/CPF/telefone
- Módulo **Equipe**: listagem dos usuários com acesso (somente administradores)
- Painel inicial com indicadores (a receber, fiados atrasados, locações ativas,
  veículos disponíveis, vendas do mês, total de clientes)
- Row Level Security (RLS) em todas as tabelas — só usuários autenticados acessam os dados

### Arquivos criados
- `CURRENT/index.html`, `CURRENT/app.html`
- `CURRENT/css/style.css`
- `CURRENT/js/supabaseClient.js`, `auth.js`, `utils.js`, `api.js`, `views.js`, `nav.js`
- `CURRENT/sql/001_schema.sql`, `002_rls_policies.sql`
- `CURRENT/README.md`

### Mudanças de banco de dados
- Criação das tabelas: `perfis`, `clientes`, `veiculos`, `fiados`, `fiado_pagamentos`,
  `locacoes`, `vendas`
- Função `recalcular_status_fiado` e trigger `on_auth_user_created`

### Mudanças de configuração
- Necessário preencher `SUPABASE_URL` em `js/supabaseClient.js` com a URL do projeto Supabase
  do usuário antes de usar (a chave publicável já veio preenchida)

### Observação de compatibilidade
- Esta versão **não é compatível** com o banco SQLite da versão anterior (loja-saas em
  Node/Express). Os dados não migram automaticamente — é um banco novo, no Supabase.
