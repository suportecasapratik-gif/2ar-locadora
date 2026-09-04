# Carnê Digital — seu sistema de crediário

Site pronto pra colocar no ar hoje. Só faltam 3 coisas que só você pode fazer
(criar sua conta, colar suas chaves, subir os arquivos). Uns 15 minutos.

## 1. Criar o banco de dados (Supabase — grátis)

1. Vá em **supabase.com** → crie uma conta grátis → **New project**.
2. Espere o projeto terminar de criar (1-2 min).
3. No menu da esquerda, clique em **SQL Editor** → **New query**.
4. Abra o arquivo `sql/schema.sql` desse pacote, copie **tudo** e cole lá.
5. Clique em **Run**. Isso cria as tabelas de clientes, contratos e parcelas,
   e já deixa configurado pra gerar as parcelas sozinho quando você cadastrar
   um contrato.
6. Abra também o arquivo `sql/schema_v2_estoque_financeiro.sql`, copie tudo,
   cole numa **New query** e clique em **Run**. Essa parte cria o **Estoque**
   e o **Financeiro** (movimentações automáticas).
7. Por fim, `sql/schema_v3_codigo_cliente.sql` — cria o código automático do
   cliente (CLI-0001, CLI-0002...) e o campo de quem indicou.
8. E `sql/schema_v4_fotos_documentos.sql` — cria o espaço de armazenamento
   privado pra foto do cliente, documento (frente/verso) e comprovante de
   energia.
9. `sql/schema_v5_permissoes.sql` — libera a permissão de acesso às tabelas
   (sem isso, aparece erro de "permission denied" ao salvar qualquer coisa).
10. `sql/schema_v6_pastas_documentos.sql` — cria a aba de Documentos, com
    pastas e subpastas organizadas manualmente.
11. `sql/schema_v7_classificacao_cliente.sql` — cria a classificação de risco
    do cliente (alto risco / bom pagador / padrão).
12. `sql/schema_v8_operacoes.sql` — transforma contrato em "operação"
    completa: custo do produto, desconto, tipo de parcela (mensal/semanal/
    diária), status expandido (Em aberto, Agendado, Pago, Cancelado, Acordo
    feito, Atrasado automático) e lucro calculado sozinho.
13. `sql/schema_v9_mensagens.sql` — cria as mensagens prontas editáveis pra
    cobrança, já vem com 4 modelos de exemplo.
14. `sql/schema_v10_acordos.sql` — cria a aba de Acordos, com alerta
    automático de atraso ou dia de pagamento.
15. `sql/schema_v11_cobrancas_completas.sql` — melhora a busca (ID do
    cliente) e o resumo de cada cliente (total pago, operações ativas).
16. `sql/schema_v12_entidades_pf_pj.sql` — cria PF/PJ, ID da venda,
    comprovante/nota fiscal, e faz as parcelas restantes encerrarem sozinhas
    quando você cancela uma operação ou fecha um acordo.
17. `sql/schema_v13_lixeira.sql` — permite excluir clientes, produtos,
    operações e acordos, com uma Lixeira pra recuperar.
18. `sql/schema_v14_cnaes_multiplos.sql` — permite vários CNAEs por PJ/MEI
    (adicionar e excluir quantos quiser).
19. `sql/schema_v15_corrige_painel.sql` — corrige o Painel contando coisa
    excluída, cria forma de pagamento nas movimentações, e ID pra pastas
    de documentos.
20. `sql/schema_v16_fotos_produto_ordem.sql` — fotos e vídeo do produto,
    ordem manual em pastas/arquivos de Documentos.
21. `sql/schema_v17_cobranca_tipo_acordo_parcelado.sql` — tipo de cobrança
    (presencial/online) nas operações.
22. `sql/schema_v18_meta_anexos.sql` — meta/recompensa (barrinha de
    progresso) e anexos (foto/vídeo/áudio/documento) nas mensagens.
23. `sql/schema_v19_historico_alteracoes.sql` — histórico automático das
    últimas alterações em clientes, operações, estoque e acordos, com
    botão de desfazer.
24. `sql/schema_v20_aliquota_imposto.sql` — alíquota de imposto estimada
    por PJ/MEI, calculando o imposto do mês sozinho no Financeiro.
25. `sql/schema_v21_login_por_pessoa.sql` — **a migração mais importante
    até agora**: cria login por pessoa com permissão (admin vê tudo,
    cobrador só vê a aba Cobranças e só as parcelas atribuídas a ele).
    Leia as instruções dentro do arquivo antes de rodar.
26. `sql/schema_v22_rota_cobranca.sql` — registra tentativas de cobrança
    (pagou / prometeu pagar / não pagou / não encontrado) por parcela.
27. `sql/schema_v23_pagamento_parcial.sql` — **importante**: permite
    pagamento parcial de parcela. Desliga o lançamento automático antigo
    de "parcela paga" no financeiro (agora é o próprio botão de pagamento
    que lança o valor certinho, parcial ou total).
28. `sql/schema_v24_foto_cobranca_descricao_rica.sql` — foto do cliente
    aparecendo em Cobranças, e descrições automáticas mais completas nas
    movimentações (nome do cliente, produto, categoria).
29. `sql/schema_v25_origem_estrategia_cor.sql` — origem do produto (estoque/
    parceria/encomenda), estratégia de divisão do lucro (despesas/
    reinvestir/pró-labore/reserva) e cor da barrinha de meta.
30. `sql/schema_v26_id_data_manual_cliente.sql` — ID do cliente e data de
    cadastro agora são digitados por você, não mais automáticos.

> Plano grátis do Supabase: 500MB de banco de dados e 1GB de arquivos — dá
> muito espaço pra começar. Se um dia crescer demais, dá pra fazer upgrade
> sem precisar trocar de sistema.

## 2. Criar o seu login

1. No menu da esquerda, vá em **Authentication** → **Users** → **Add user**.
2. Coloque seu e-mail e uma senha. Marque **Auto Confirm User** (assim você já
   consegue logar na hora, sem precisar confirmar e-mail).

## 3. Pegar suas chaves

1. Vá em **Project Settings** (ícone de engrenagem) → **API**.
2. Copie o **Project URL**.
3. Copie a chave **anon public** (não é a `service_role`, essa não).
4. Abra o arquivo `js/config.js` desse pacote e cole os dois valores:

```js
const SUPABASE_URL = "sua-url-aqui";
const SUPABASE_ANON_KEY = "sua-chave-aqui";
```

Salve o arquivo.

## 4. Colocar o site no ar (grátis, sem enrolação)

Jeito mais rápido — **Netlify Drop**:

1. Vá em **app.netlify.com/drop**.
2. Arraste a pasta inteira desse site (com `index.html`, `app.html`, `css/`, `js/`) pra lá.
3. Pronto — em segundos ele te dá um link tipo `nome-aleatorio.netlify.app`.
4. (Opcional) Nas configurações do site na Netlify, dá pra trocar esse nome
   por algo tipo `crediario-fulano.netlify.app`.

Se preferir, funciona igual em **Vercel** ou **GitHub Pages** — é um site
estático puro, sem servidor, sem build.

## 5. Testar

1. Abra o link do site → tela de login → entre com o e-mail/senha que você
   criou no passo 2.
2. Cadastre um cliente na aba **+ Cliente**.
3. Cadastre um contrato na aba **+ Contrato** — as parcelas são criadas
   sozinhas (uma por mês, a partir da data da venda).
4. Vá em **Cobranças** pra ver as parcelas em aberto, e em **Painel** pra ver
   o resumo (a receber, recebido no mês, atrasado).

## O que já é automático

- **Parcelas geradas sozinhas** quando você cadastra um contrato.
- **Atraso calculado sozinho** — não precisa marcar nada, se a data passou e
  não foi paga, já aparece "atrasado" em vermelho.
- **Contrato marcado como "quitado" sozinho** quando a última parcela é paga.
- **Estoque**: cada produto ganha um código sozinho (COM-1001, COM-1002...),
  igual na sua planilha.
- **Financeiro automático**: toda compra de estoque vira uma saída sozinha;
  toda entrada de venda e toda parcela paga viram uma entrada sozinha. Você
  não lança nada na mão — só cadastra o produto e marca a parcela como paga.
- Ao vender um produto do estoque (aba "+ Contrato" → "Puxar do estoque"),
  ele muda pra "Vendido" sozinho.
- **Painel atualizado sozinho** toda vez que você abre.

## Sobre o visual do site

O design é limpo e neutro de propósito, pra ser fácil de mexer. Se quiser
mudar as cores um dia, abra `css/style.css` — logo no topo do arquivo tem um
bloco `:root { ... }` com todas as cores do site em um lugar só (fundo, cor
principal, verde de "pago", vermelho de "atrasado", etc). Muda o valor ali e
o site inteiro atualiza sozinho, sem precisar mexer em mais nada.

## O que dá pra evoluir depois (me chama quando quiser)

- Login separado por funcionário/cobrador (você pediu só o seu login por
  enquanto).
- Lucro por categoria/ticket médio (comparando custo do estoque com valor
  vendido) — como nas colunas MOCKUP/CAT da sua planilha.
- Parcela extra automática quando o cliente atrasa (você mencionou que já
  faz isso manualmente).
- Envio de lembrete automático (WhatsApp/SMS) perto do vencimento.
