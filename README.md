# Pátio — Sistema de Fiado, Locação e Venda (Supabase)

Versão: **SAAS-VEICULOS-v0.1** · Stack: HTML/CSS/JS puro + Supabase (Postgres, Auth, RLS)

## Estrutura desta versão

```
CURRENT/
├── index.html          → tela de login e criação de conta
├── app.html             → aplicação principal (painel + módulos)
├── css/
│   └── style.css
├── js/
│   ├── supabaseClient.js  → conexão com o Supabase (URL + chave)
│   ├── auth.js             → login, cadastro, sessão, logout
│   ├── utils.js            → formatação, toast, modal
│   ├── api.js               → todas as chamadas ao banco (por módulo)
│   ├── views.js              → renderização de cada tela
│   └── nav.js                  → inicialização e navegação da sidebar
└── sql/
    ├── 001_schema.sql   → tabelas, trigger de novo usuário, função de status
    └── 002_rls_policies.sql → segurança em nível de linha (RLS)
```

## Passo a passo para colocar no ar

### 1. Crie o projeto no Supabase
Acesse [supabase.com](https://supabase.com), crie um projeto novo (gratuito) e anote:
- a **Project URL** (em Project Settings → API)
- a **anon / publishable key** (a mesma página)

### 2. Rode os SQLs
No painel do Supabase, abra **SQL Editor** e execute, nesta ordem:
1. `sql/001_schema.sql`
2. `sql/002_rls_policies.sql`

Isso cria todas as tabelas (clientes, veículos, fiados, locações, vendas, perfis) e as regras de segurança.

### 3. Configure a chave de conexão
Abra `js/supabaseClient.js` e troque:
```js
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co'; // <-- sua Project URL
```
A `SUPABASE_ANON_KEY` já está preenchida com a chave publicável que você me passou.

### 4. Teste localmente
Como o projeto é só HTML/CSS/JS (sem build), você pode:
- abrir `index.html` direto no navegador, **ou**
- rodar um servidor local simples, por exemplo com Python: `python3 -m http.server 8000`

### 5. Primeiro acesso
Na tela de login, clique em **"Primeiro acesso? Criar conta"**. O primeiro usuário criado no
sistema vira automaticamente **administrador** (isso é feito pelo trigger `on_auth_user_created`
no banco). Os próximos cadastros entram como funcionário.

> Se você ativou a confirmação de email no Supabase (Authentication → Providers → Email), o
> funcionário precisa confirmar o email antes do primeiro login. Você pode desativar essa
> exigência em ambiente de testes.

### 6. Publicar no GitHub / colocar no ar
Como não há backend próprio (o Supabase faz esse papel), você pode hospedar os arquivos estáticos
(`index.html`, `app.html`, `css/`, `js/`) direto no **GitHub Pages**, Vercel ou Netlify — é só subir
esta pasta `CURRENT/` para um repositório e apontar o serviço de hospedagem para ela.

## Promovendo um funcionário a administrador
Por segurança, isso não é feito pelo próprio app. No painel do Supabase, vá em
**Table Editor → perfis**, encontre a linha da pessoa e troque a coluna `papel` de
`funcionario` para `admin`.
