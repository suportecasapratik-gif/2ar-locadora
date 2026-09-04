// ============================================================
// GUARDA DE LOGIN — se não estiver logado, manda pro login
// ============================================================
let CURRENT_USER = null;
let MEU_PAPEL = "admin";

(async function initAuth() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = "index.html";
    return;
  }
  CURRENT_USER = data.session.user;

  const { data: perfil } = await supabaseClient.from("perfis").select("papel,nome").eq("id", CURRENT_USER.id).single();
  MEU_PAPEL = perfil?.papel || "admin";
  aplicarPermissoesDaTela();

  boot();
})();

function aplicarPermissoesDaTela() {
  if (MEU_PAPEL === "admin") return; // admin vê tudo, nada a esconder

  // cobrador só usa Cobranças — some com o resto do menu
  const abasPermitidas = ["cobrancas"];
  document.querySelectorAll(".sidebar .tab").forEach(tab => {
    if (!abasPermitidas.includes(tab.dataset.tab)) tab.style.display = "none";
  });
  document.getElementById("meta-progresso").style.display = "none";
  // já entra direto em Cobranças, que é a única coisa liberada
  document.querySelector('[data-tab="cobrancas"]')?.click();
}

document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

// ============================================================
// MENU GAVETA (celular)
// ============================================================
const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("sidebar-backdrop");
document.getElementById("hamburger-btn")?.addEventListener("click", () => {
  sidebar.classList.add("sidebar-open");
  backdrop.classList.add("active");
});
function fecharMenuMobile() {
  sidebar.classList.remove("sidebar-open");
  backdrop.classList.remove("active");
}
backdrop?.addEventListener("click", fecharMenuMobile);

function voltarSubTela() {
  const alvo = window.__ultimaAbaPrincipal || "dashboard";
  document.querySelector(`[data-tab="${alvo}"]`)?.click();
}
window.voltarSubTela = voltarSubTela;

// ============================================================
// TROCA DE ABAS
// ============================================================
const tabs = document.querySelectorAll(".tab");
const sections = {
  dashboard: document.getElementById("tab-dashboard"),
  clientes: document.getElementById("tab-clientes"),
  cobrancas: document.getElementById("tab-cobrancas"),
  operacoes: document.getElementById("tab-operacoes"),
  acordos: document.getElementById("tab-acordos"),
  estoque: document.getElementById("tab-estoque"),
  financeiro: document.getElementById("tab-financeiro"),
  entidades: document.getElementById("tab-entidades"),
  lixeira: document.getElementById("tab-lixeira"),
  documentos: document.getElementById("tab-documentos"),
  "novo-cliente": document.getElementById("tab-novo-cliente"),
  "novo-produto": document.getElementById("tab-novo-produto"),
  "novo-contrato": document.getElementById("tab-novo-contrato"),
  "novo-acordo": document.getElementById("tab-novo-acordo"),
  "nova-entidade": document.getElementById("tab-nova-entidade"),
  mensagens: document.getElementById("tab-mensagens"),
};

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    fecharMenuMobile();
    if (tab.dataset.tab === "novo-cliente") {
      resetFormClienteState();
      abrirModalCliente();
      return;
    }
    if (!tab.classList.contains("sidebar-hidden-tab") && !["novo-produto","novo-contrato","novo-acordo","nova-entidade"].includes(tab.dataset.tab)) {
      window.__ultimaAbaPrincipal = tab.dataset.tab;
    }
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    Object.entries(sections).forEach(([key, el]) => {
      el.style.display = key === tab.dataset.tab ? "block" : "none";
    });
    if (tab.dataset.tab === "dashboard") loadDashboard();
    if (tab.dataset.tab === "clientes") loadClientes();
    if (tab.dataset.tab === "cobrancas") loadCobrancas();
    if (tab.dataset.tab === "estoque") loadEstoque();
    if (tab.dataset.tab === "financeiro") { loadFinanceiro(); loadEntidadesNoSelectMov(); }
    if (tab.dataset.tab === "documentos") loadDocumentos(null);
    if (tab.dataset.tab === "novo-contrato") { loadClientesNoSelect(); loadEstoqueNoSelect(); loadCobradoresNoSelect(); }
    if (tab.dataset.tab === "equipe") loadEquipe();
    if (tab.dataset.tab === "funcionarios") loadFuncionarios();
    if (tab.dataset.tab === "mensagens") loadMensagens();
    if (tab.dataset.tab === "acordos") loadAcordos();
    if (tab.dataset.tab === "operacoes") loadOperacoes();
    if (tab.dataset.tab === "novo-acordo") { loadClientesNoSelectAcordo(); loadContratosNoSelectAcordo(); loadEntidadesNoSelect("acr-entidade"); }
    if (tab.dataset.tab === "entidades") loadEntidades();
    if (tab.dataset.tab === "lixeira") { loadLixeira(); loadHistorico(); }
    if (tab.dataset.tab === "novo-contrato") loadEntidadesNoSelect();
    if (tab.dataset.tab === "configuracoes") carregarFormConfiguracoes();
  });
});

function fmtMoeda(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtData(d) {
  if (!d) return "-";
  const [ano, mes, dia] = d.split("-");
  return `${dia}/${mes}/${ano}`;
}

// ============================================================
// BOOT — carrega a primeira tela
// ============================================================
function boot() {
  loadDashboard();
  carregarBarraMeta();
}

// ============================================================
// META / RECOMPENSA (barrinha de progresso)
// ============================================================
async function carregarBarraMeta() {
  const { data: cfg } = await supabaseClient.from("configuracoes").select("*").eq("id", 1).single();
  const bloco = document.getElementById("meta-progresso");
  if (!cfg || !cfg.objetivo_valor || cfg.objetivo_valor <= 0) { bloco.style.display = "none"; return; }

  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7);
  const { data: movs } = await supabaseClient.from("movimentacoes").select("tipo,valor,data");
  const recebidoMes = (movs || []).filter(m => m.tipo === "entrada" && m.data?.slice(0, 7) === mesAtual)
    .reduce((s, m) => s + Number(m.valor), 0);

  const percentual = Math.min(100, (recebidoMes / cfg.objetivo_valor) * 100);
  bloco.style.display = "block";
  document.getElementById("meta-nome").textContent = cfg.objetivo_nome || "Meta";
  document.getElementById("meta-valores").textContent = `${fmtMoeda(recebidoMes)} / ${fmtMoeda(cfg.objetivo_valor)}`;
  document.getElementById("meta-barra").style.width = percentual + "%";
  document.getElementById("meta-barra").style.background = cfg.meta_cor || "#12B76A";

  if (cfg.foto_recompensa_path) {
    const { data: urlData } = await supabaseClient.storage.from("documentos-clientes").createSignedUrl(cfg.foto_recompensa_path, 3600);
    if (urlData) {
      let img = document.getElementById("meta-foto-recompensa");
      if (!img) {
        img = document.createElement("img");
        img.id = "meta-foto-recompensa";
        img.style.cssText = "width:100%; border-radius:6px; margin-top:8px;";
        bloco.appendChild(img);
      }
      img.src = urlData.signedUrl;
    }
  }
}

async function carregarFormConfiguracoes() {
  const { data: cfg } = await supabaseClient.from("configuracoes").select("*").eq("id", 1).single();
  if (!cfg) return;
  document.getElementById("cfg-nome").value = cfg.objetivo_nome || "";
  document.getElementById("cfg-valor").value = cfg.objetivo_valor || "";
  document.getElementById("cfg-cor").value = cfg.meta_cor || "#12B76A";
  document.getElementById("alc-despesas").value = cfg.pct_despesas ?? 30;
  document.getElementById("alc-reinvestimento").value = cfg.pct_reinvestimento ?? 30;
  document.getElementById("alc-prolabore").value = cfg.pct_prolabore ?? 30;
  document.getElementById("alc-reserva").value = cfg.pct_reserva ?? 10;
}

document.getElementById("form-alocacao").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("alc-msg");
  const despesas = parseFloat(document.getElementById("alc-despesas").value || 0);
  const reinvestimento = parseFloat(document.getElementById("alc-reinvestimento").value || 0);
  const prolabore = parseFloat(document.getElementById("alc-prolabore").value || 0);
  const reserva = parseFloat(document.getElementById("alc-reserva").value || 0);
  const soma = despesas + reinvestimento + prolabore + reserva;

  if (Math.abs(soma - 100) > 0.5) {
    msg.textContent = `Isso soma ${soma}%, precisa somar 100%. Ajusta os números.`;
    msg.className = "form-msg err";
    return;
  }

  const { error } = await supabaseClient.from("configuracoes").upsert({
    id: 1,
    pct_despesas: despesas, pct_reinvestimento: reinvestimento, pct_prolabore: prolabore, pct_reserva: reserva,
  });
  if (error) { msg.textContent = "Erro: " + error.message; msg.className = "form-msg err"; return; }
  msg.textContent = "Divisão salva! Já aparece no Painel.";
  msg.className = "form-msg ok";
});

document.querySelectorAll("#alc-despesas, #alc-reinvestimento, #alc-prolabore, #alc-reserva").forEach(input => {
  input.addEventListener("input", () => {
    const soma = ["alc-despesas", "alc-reinvestimento", "alc-prolabore", "alc-reserva"]
      .reduce((s, id) => s + parseFloat(document.getElementById(id).value || 0), 0);
    const aviso = document.getElementById("alc-soma-aviso");
    aviso.textContent = `Soma atual: ${soma}%${soma !== 100 ? " (precisa dar 100%)" : " ✓"}`;
    aviso.className = soma === 100 ? "form-msg ok" : "form-msg err";
  });
});

document.getElementById("form-configuracoes").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("cfg-msg");
  const dados = {
    id: 1,
    objetivo_nome: document.getElementById("cfg-nome").value.trim() || "Meta do mês",
    objetivo_valor: parseFloat(document.getElementById("cfg-valor").value || 0),
    meta_cor: document.getElementById("cfg-cor").value,
  };

  const arquivo = document.getElementById("cfg-foto").files[0];
  if (arquivo) {
    const caminho = `config/recompensa-${Date.now()}-${arquivo.name}`;
    const { error: upErr } = await supabaseClient.storage.from("documentos-clientes").upload(caminho, arquivo);
    if (!upErr) dados.foto_recompensa_path = caminho;
  }

  const { error } = await supabaseClient.from("configuracoes").upsert(dados);
  if (error) { msg.textContent = "Erro: " + error.message; msg.className = "form-msg err"; return; }
  msg.textContent = "Salvo!";
  msg.className = "form-msg ok";
  carregarBarraMeta();
});

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
  const cardsEl = document.getElementById("dash-cards");
  const proxEl = document.getElementById("dash-proximos");
  cardsEl.innerHTML = `<div class="loading-line">Carregando...</div>`;

  const [{ data: parcelas, error }, { data: operacoes }, { data: produtos }, { data: movs }] = await Promise.all([
    supabaseClient.from("parcelas_status").select("*"),
    supabaseClient.from("operacoes_status").select("*"),
    supabaseClient.from("produtos").select("custo,markup_percent"),
    supabaseClient.from("movimentacoes").select("tipo,valor,data"),
  ]);

  if (error) {
    cardsEl.innerHTML = `<div class="loading-line">Erro ao carregar: ${error.message}</div>`;
    return;
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7);
  const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
  const amanhaStr = amanha.toISOString().slice(0, 10);

  // ---------- quem cobrar hoje / amanhã ----------
  const cobrarHoje = parcelas.filter(p =>
    p.status_real === "atrasado" || (p.status === "pendente" && p.vencimento === hoje));
  const amanhaLista = parcelas.filter(p => p.status === "pendente" && p.vencimento === amanhaStr);

  function linhaCobranca(p, destaque) {
    const wa = whatsappLink(p.cliente_telefone);
    const restante = Number(p.valor) - Number(p.valor_pago || 0);
    return `
      <div class="parcela-row">
        <div class="who">
          <div class="n">${p.cliente_nome} ${destaque ? `<span class="stamp stamp-atrasado" style="transform:none;">atrasado</span>` : ""}</div>
          <div class="m">${p.produto || "Empréstimo"} — parcela ${p.numero} de ${fmtMoeda(p.valor)} · cobrador: ${p.cobrador || "Eu"}</div>
        </div>
        <div class="val">${fmtMoeda(restante)}</div>
        <div style="display:flex; gap:6px;">
          ${wa ? `<a class="btn-mini green" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
          <button class="btn-mini green" onclick="abrirModalPagamento('${p.id}', ${restante})">💰 Pagamento</button>
        </div>
      </div>`;
  }

  const blocoHojeAmanha = document.getElementById("dash-hoje-amanha");
  blocoHojeAmanha.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:26px;">
      <div>
        <h2 class="section-title" style="font-size:16px;">📞 Cobrar hoje (${cobrarHoje.length})</h2>
        ${cobrarHoje.length === 0 ? `<div class="empty-state">Ninguém pra cobrar hoje. 🎉</div>` : cobrarHoje.map(p => linhaCobranca(p, p.status_real === "atrasado")).join("")}
      </div>
      <div>
        <h2 class="section-title" style="font-size:16px;">🔔 Vence amanhã (${amanhaLista.length})</h2>
        ${amanhaLista.length === 0 ? `<div class="empty-state">Nada vencendo amanhã.</div>` : amanhaLista.map(p => linhaCobranca(p, false)).join("")}
      </div>
    </div>
  `;

  // ---------- aviso de funcionário com saída prevista próxima ----------
  const em30dias = new Date(); em30dias.setDate(em30dias.getDate() + 30);
  const { data: funcionariosSaindo } = await supabaseClient.from("funcionarios")
    .select("nome,data_saida_prevista").eq("excluido", false)
    .not("data_saida_prevista", "is", null)
    .lte("data_saida_prevista", em30dias.toISOString().slice(0, 10));
  if (funcionariosSaindo && funcionariosSaindo.length > 0) {
    blocoHojeAmanha.innerHTML += `
      <div class="empty-state" style="border-color:var(--warning); text-align:left; margin-bottom:20px;">
        ⚠️ <b>Aviso de equipe:</b> ${funcionariosSaindo.map(f => `${f.nome} (saída prevista ${fmtData(f.data_saida_prevista)})`).join(", ")}
      </div>`;
  }

  // ---------- métricas gerais ----------
  const aReceber = parcelas.filter(p => ["pendente", "parcial"].includes(p.status) || p.status_real === "atrasado")
    .reduce((s, p) => s + (Number(p.valor) - Number(p.valor_pago || 0)), 0);
  const recebidoMes = (movs || []).filter(m => m.tipo === "entrada" && m.data && m.data.slice(0, 7) === mesAtual)
    .reduce((s, m) => s + Number(m.valor), 0);
  const atrasadas = parcelas.filter(p => p.status_real === "atrasado");
  const valorAtrasado = atrasadas.reduce((s, p) => s + (Number(p.valor) - Number(p.valor_pago || 0)), 0);
  const inadimplencia = aReceber > 0 ? (valorAtrasado / aReceber) * 100 : 0;

  const operacoesValidas = (operacoes || []).filter(o => o.status_real !== "cancelado");
  const lucroEstimado = operacoesValidas.reduce((s, o) => s + Number(o.lucro_estimado || 0), 0);
  const custoOperacoesAvulsas = operacoesValidas.filter(o => !o.produto_id).reduce((s, o) => s + Number(o.custo_produto || 0), 0);
  const custoEstoque = (produtos || []).reduce((s, p) => s + Number(p.custo || 0), 0);
  const totalInvestido = custoOperacoesAvulsas + custoEstoque;

  const markupsValidos = (produtos || []).map(p => p.markup_percent).filter(v => v !== null && v !== undefined);
  const markupsOperacoes = operacoesValidas
    .filter(o => Number(o.custo_produto) > 0)
    .map(o => ((Number(o.valor_total) - Number(o.custo_produto)) / Number(o.custo_produto)) * 100);
  const todosMarkups = [...markupsValidos, ...markupsOperacoes];
  const markupMedio = todosMarkups.length > 0 ? todosMarkups.reduce((s, v) => s + Number(v), 0) / todosMarkups.length : 0;

  cardsEl.innerHTML = `
    <div class="stat-card">
      <div class="label">A receber (total)</div>
      <div class="value">${fmtMoeda(aReceber)}</div>
    </div>
    <div class="stat-card green">
      <div class="label">Recebido este mês</div>
      <div class="value">${fmtMoeda(recebidoMes)}</div>
    </div>
    <div class="stat-card red">
      <div class="label">Atrasado (${atrasadas.length} parcela${atrasadas.length === 1 ? "" : "s"})</div>
      <div class="value">${fmtMoeda(valorAtrasado)}</div>
    </div>
    <div class="stat-card amber">
      <div class="label">Inadimplência</div>
      <div class="value">${inadimplencia.toFixed(1)}%</div>
    </div>
    <div class="stat-card green">
      <div class="label">Lucro estimado (total)</div>
      <div class="value">${fmtMoeda(lucroEstimado)}</div>
    </div>
    <div class="stat-card">
      <div class="label">Total investido</div>
      <div class="value">${fmtMoeda(totalInvestido)}</div>
    </div>
    <div class="stat-card">
      <div class="label">Markup médio</div>
      <div class="value">${markupMedio.toFixed(1)}%</div>
    </div>
  `;

  const em7dias = new Date();
  em7dias.setDate(em7dias.getDate() + 7);
  const limite = em7dias.toISOString().slice(0, 10);

  const proximos = parcelas
    .filter(p => p.status_real === "pendente" && p.vencimento >= hoje && p.vencimento <= limite)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  if (proximos.length === 0) {
    proxEl.innerHTML = `<div class="empty-state">Nada vencendo nos próximos 7 dias.</div>`;
  } else {
    proxEl.innerHTML = proximos.map(p => `
      <div class="parcela-row">
        <div class="who">
          <div class="n">${p.cliente_nome}</div>
          <div class="m">${p.produto || "Empréstimo"} — parcela ${p.numero}</div>
        </div>
        <div class="venc">vence ${fmtData(p.vencimento)}</div>
        <div class="val">${fmtMoeda(p.valor)}</div>
      </div>
    `).join("");
  }

  carregarKpisEGraficos();
}

// ============================================================
// KPIs E GRÁFICOS DO PAINEL
// ============================================================
let GRAFICOS_ATIVOS = {};

function desenharGrafico(idCanvas, tipo, dados) {
  if (GRAFICOS_ATIVOS[idCanvas]) GRAFICOS_ATIVOS[idCanvas].destroy();
  const ctx = document.getElementById(idCanvas);
  if (!ctx) return;
  GRAFICOS_ATIVOS[idCanvas] = new Chart(ctx, {
    type: tipo,
    data: dados,
    options: {
      responsive: true,
      plugins: { legend: { display: tipo === "doughnut", labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: tipo === "doughnut" ? {} : { y: { beginAtZero: true } },
    },
  });
}

async function carregarKpisEGraficos() {
  const hoje = new Date();

  const [{ data: movs }, { data: clientes }, { data: operacoes }, { data: cfgAlocacao }] = await Promise.all([
    supabaseClient.from("movimentacoes").select("tipo,valor,data"),
    supabaseClient.from("clientes").select("classificacao,created_at").eq("excluido", false),
    supabaseClient.from("operacoes_status").select("*"),
    supabaseClient.from("configuracoes").select("pct_despesas,pct_reinvestimento,pct_prolabore,pct_reserva").eq("id", 1).single(),
  ]);

  // popula o filtro de ano com os anos que existem de verdade nos dados
  const anosDisponiveis = [...new Set([
    ...(movs || []).map(m => m.data?.slice(0, 4)),
    ...(clientes || []).map(c => c.created_at?.slice(0, 4)),
  ].filter(Boolean))].sort().reverse();
  const selAno = document.getElementById("filtro-dash-ano");
  const anoEscolhidoAntes = selAno.value;
  selAno.innerHTML = `<option value="rolling">Últimos 6 meses</option>` +
    anosDisponiveis.map(a => `<option value="${a}">Ano ${a}</option>`).join("");
  selAno.value = anosDisponiveis.includes(anoEscolhidoAntes) || anoEscolhidoAntes === "rolling" ? anoEscolhidoAntes : "rolling";

  const anoFiltro = selAno.value;
  let meses;
  if (anoFiltro === "rolling") {
    meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({ chave: d.toISOString().slice(0, 7), label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) });
    }
  } else {
    meses = Array.from({ length: 12 }, (_, i) => {
      const mesNum = String(i + 1).padStart(2, "0");
      return { chave: `${anoFiltro}-${mesNum}`, label: new Date(anoFiltro, i, 1).toLocaleDateString("pt-BR", { month: "short" }) };
    });
  }

  // ---------- KPIs extras (cards) ----------
  const operacoesValidas2 = (operacoes || []).filter(o => o.status_real !== "cancelado");
  const ticketMedio = operacoesValidas2.length > 0
    ? operacoesValidas2.reduce((s, o) => s + Number(o.valor_total), 0) / operacoesValidas2.length
    : 0;
  const clientesAtivos = new Set(operacoesValidas2.filter(o => ["em_aberto", "atrasado", "agendado"].includes(o.status_real)).map(o => o.cliente_id)).size;
  const operacoesMes = operacoesValidas2.filter(o => o.data_venda?.slice(0, 7) === hoje.toISOString().slice(0, 7)).length;
  const ticketMedioAtraso = (() => {
    const atrasadas = operacoesValidas2.filter(o => o.status_real === "atrasado");
    return atrasadas.length ? atrasadas.reduce((s, o) => s + Number(o.valor_total), 0) / atrasadas.length : 0;
  })();

  document.getElementById("dash-kpis").innerHTML = `
    <div class="stat-card">
      <div class="label">Ticket médio</div>
      <div class="value">${fmtMoeda(ticketMedio)}</div>
    </div>
    <div class="stat-card">
      <div class="label">Clientes ativos (devendo algo)</div>
      <div class="value">${clientesAtivos}</div>
    </div>
    <div class="stat-card">
      <div class="label">Operações fechadas este mês</div>
      <div class="value">${operacoesMes}</div>
    </div>
    <div class="stat-card red">
      <div class="label">Ticket médio dos atrasados</div>
      <div class="value">${fmtMoeda(ticketMedioAtraso)}</div>
    </div>
  `;

  // ---------- divisão automática do que entrou este mês ----------
  if (cfgAlocacao) {
    const mesAtualChave = hoje.toISOString().slice(0, 7);
    const recebidoEsteMes = (movs || []).filter(m => m.tipo === "entrada" && m.data?.slice(0, 7) === mesAtualChave)
      .reduce((s, m) => s + Number(m.valor), 0);

    document.getElementById("dash-kpis").innerHTML += `
      <div class="stat-card">
        <div class="label">Despesas (${cfgAlocacao.pct_despesas}%)</div>
        <div class="value">${fmtMoeda(recebidoEsteMes * cfgAlocacao.pct_despesas / 100)}</div>
      </div>
      <div class="stat-card green">
        <div class="label">Reinvestir (${cfgAlocacao.pct_reinvestimento}%)</div>
        <div class="value">${fmtMoeda(recebidoEsteMes * cfgAlocacao.pct_reinvestimento / 100)}</div>
      </div>
      <div class="stat-card">
        <div class="label">Pró-labore (${cfgAlocacao.pct_prolabore}%)</div>
        <div class="value">${fmtMoeda(recebidoEsteMes * cfgAlocacao.pct_prolabore / 100)}</div>
      </div>
      <div class="stat-card amber">
        <div class="label">Reserva (${cfgAlocacao.pct_reserva}%)</div>
        <div class="value">${fmtMoeda(recebidoEsteMes * cfgAlocacao.pct_reserva / 100)}</div>
      </div>
    `;
  }

  // ---------- gráfico: faturamento últimos 6 meses ----------
  const faturamentoPorMes = meses.map(m =>
    (movs || []).filter(mv => mv.tipo === "entrada" && mv.data?.slice(0, 7) === m.chave)
      .reduce((s, mv) => s + Number(mv.valor), 0)
  );
  desenharGrafico("grafico-faturamento", "bar", {
    labels: meses.map(m => m.label),
    datasets: [{ label: "Recebido", data: faturamentoPorMes, backgroundColor: "#4338CA" }],
  });

  // ---------- gráfico: clientes novos por mês ----------
  const clientesNovosPorMes = meses.map(m =>
    (clientes || []).filter(c => c.created_at?.slice(0, 7) === m.chave).length
  );
  desenharGrafico("grafico-clientes-novos", "bar", {
    labels: meses.map(m => m.label),
    datasets: [{ label: "Novos clientes", data: clientesNovosPorMes, backgroundColor: "#12B76A" }],
  });

  // ---------- gráfico: carteira por risco ----------
  const contagemRisco = { alto_risco: 0, bom_pagador: 0, padrao: 0 };
  (clientes || []).forEach(c => { contagemRisco[c.classificacao || "padrao"]++; });
  desenharGrafico("grafico-risco", "doughnut", {
    labels: ["Alto risco", "Bom pagador", "Padrão"],
    datasets: [{ data: [contagemRisco.alto_risco, contagemRisco.bom_pagador, contagemRisco.padrao], backgroundColor: ["#F04438", "#12B76A", "#98A2B3"] }],
  });

  // ---------- gráfico: lucro por categoria ----------
  const lucroPorCategoria = {};
  operacoesValidas2.forEach(o => {
    const cat = o.categoria || "Sem categoria";
    lucroPorCategoria[cat] = (lucroPorCategoria[cat] || 0) + Number(o.lucro_estimado || 0);
  });
  const categorias = Object.keys(lucroPorCategoria);
  desenharGrafico("grafico-categoria", "bar", {
    labels: categorias,
    datasets: [{ label: "Lucro estimado", data: categorias.map(c => lucroPorCategoria[c]), backgroundColor: "#F79009" }],
  });
}

document.getElementById("filtro-dash-ano").addEventListener("change", carregarKpisEGraficos);

// ============================================================
// CLIENTES
// ============================================================
function camposFaltando(c) {
  const faltando = [];
  if (!c.telefone) faltando.push("telefone");
  if (!c.endereco) faltando.push("endereço");
  if (!c.cpf) faltando.push("CPF");
  if (!c.foto_path) faltando.push("foto");
  if (!c.doc_frente_path || !c.doc_verso_path) faltando.push("documento");
  if (!c.comprovante_path) faltando.push("comprovante de energia");
  return faltando;
}

async function togglarParcelasCliente(contratoId) {
  const div = document.getElementById(`parcelas-cliente-${contratoId}`);
  if (div.style.display === "block") { div.style.display = "none"; return; }

  div.innerHTML = `<div class="loading-line">Carregando...</div>`;
  div.style.display = "block";

  const { data: parcelas, error } = await supabaseClient
    .from("parcelas_status").select("*").eq("contrato_id", contratoId).in("status", ["pendente", "parcial"]).order("vencimento");

  if (error || !parcelas || parcelas.length === 0) { div.innerHTML = `<div class="empty-state">Nada em aberto.</div>`; return; }

  div.innerHTML = parcelas.map(p => {
    const restante = Number(p.valor) - Number(p.valor_pago || 0);
    return `
      <div class="parcela-row" style="padding:8px 10px;">
        <div class="who">
          <div class="n" style="font-size:13px;">Parcela ${p.numero} <span class="stamp stamp-${p.status_real}" style="font-size:9px;">${p.status_real}</span></div>
          <div class="m">vence ${fmtData(p.vencimento)}</div>
        </div>
        <div class="val" style="font-size:13px;">${fmtMoeda(restante)}</div>
        <button class="btn-mini green" onclick="abrirModalPagamento('${p.id}', ${restante})">💰 Pagamento</button>
      </div>
    `;
  }).join("");
}
window.togglarParcelasCliente = togglarParcelasCliente;

async function loadClientes(filtro = "") {
  const el = document.getElementById("lista-clientes");
  el.innerHTML = `<div class="loading-line">Carregando...</div>`;

  const ordem = document.getElementById("ordenar-cliente")?.value || "nome_asc";
  const colunaOrdem = ordem === "codigo" ? "codigo" : "nome";
  const crescente = ordem !== "nome_desc";

  let query = supabaseClient.from("clientes").select("*").eq("excluido", false).order(colunaOrdem, { ascending: crescente });
  if (filtro) query = query.or(`nome.ilike.%${filtro}%,codigo.ilike.%${filtro}%`);
  const { data: clientes, error } = await query;

  if (error) {
    el.innerHTML = `<div class="loading-line">Erro: ${error.message}</div>`;
    return;
  }
  if (clientes.length === 0) {
    el.innerHTML = `<div class="empty-state">Nenhum cliente ainda. Cadastre o primeiro na aba "+ Cliente".</div>`;
    return;
  }

  const { data: contratos } = await supabaseClient.from("operacoes_status").select("*");
  const { data: parcelas } = await supabaseClient.from("parcelas_status").select("cliente_id,status_real");

  const CLASS_LABEL = { alto_risco: "Alto risco", bom_pagador: "Bom pagador", padrao: "Padrão" };
  const STATUS_LABEL = { em_aberto: "Em aberto", agendado: "Agendado", pago: "Pago", cancelado: "Cancelado", acordo_feito: "Acordo feito", atrasado: "Atrasado" };

  el.innerHTML = clientes.map(c => {
    const meusContratos = (contratos || []).filter(ct => ct.cliente_id === c.id);
    const contratosHtml = meusContratos.map(ct => `
      <div style="margin-bottom:6px;">
        <span class="stamp stamp-${ct.status_real}">${STATUS_LABEL[ct.status_real] || ct.status_real}</span>
        <span class="mono" style="font-size:12.5px;margin-right:10px;">${ct.produto || "Empréstimo"} · ${fmtMoeda(ct.valor_total)}</span>
        ${!["pago", "cancelado"].includes(ct.status_real) ? `<button class="btn-mini" onclick="togglarParcelasCliente('${ct.id}')">Ver parcelas</button>` : ""}
        <div id="parcelas-cliente-${ct.id}" style="display:none; margin-top:6px;"></div>
      </div>
    `).join("");

    const emAtraso = (parcelas || []).some(p => p.cliente_id === c.id && p.status_real === "atrasado");
    const emAberto = !emAtraso && meusContratos.some(ct => ["em_aberto", "agendado"].includes(ct.status_real));
    const classe = c.classificacao || "padrao";

    return `
      <div class="ficha">
        <div class="ficha-body">
          <div class="ficha-top">
            <div style="display:flex; gap:12px; align-items:flex-start;">
              <div class="avatar-thumb" id="foto-thumb-${c.id}">${c.nome.charAt(0).toUpperCase()}</div>
              <div>
                <div class="ficha-nome">${c.nome} <span class="mono" style="font-weight:400; font-size:12px; color:var(--text-soft);">${c.codigo || ""}</span></div>
                <div class="ficha-meta">
                  ${c.telefone ? "📞 " + c.telefone : ""}
                  ${c.endereco ? ` · 📍 ${c.endereco} <a href="${linkGoogleMaps(c.endereco)}" target="_blank" rel="noopener" style="color:var(--primary); font-weight:600;">(ver no mapa)</a>` : ""}
                  ${c.indicado_por ? " · indicado por " + c.indicado_por : ""}
                  ${c.data_cadastro ? " · cadastrado em " + fmtData(c.data_cadastro) : ""}
                </div>
                <div style="margin-top:6px;">
                  <span class="stamp stamp-${classe}">${CLASS_LABEL[classe]}</span>
                  ${emAtraso ? `<span class="stamp stamp-atrasado">Em atraso</span>` : emAberto ? `<span class="stamp stamp-em_aberto">Em aberto</span>` : ""}
                </div>
                ${camposFaltando(c).length > 0 ? `<div class="ficha-meta" style="color:var(--warning); margin-top:6px;">⚠️ Falta preencher: ${camposFaltando(c).join(", ")}</div>` : ""}
              </div>
            </div>
            <button class="btn-mini" onclick="editarCliente('${c.id}')">✏️ Editar</button>
          </div>
          <div class="ficha-actions">
            <button class="btn-mini red" onclick="excluirRegistro('clientes','${c.id}', loadClientes)">🗑️ Excluir</button>
          </div>
          ${contratosHtml ? `<div style="margin-top:10px;">${contratosHtml}</div>` : `<div class="ficha-meta" style="margin-top:8px;">Sem contratos ainda.</div>`}
          ${(c.foto_path || c.doc_frente_path || c.doc_verso_path || c.comprovante_path) ? `
            <div class="ficha-actions">
              ${c.foto_path ? `<button class="btn-mini" onclick="verDocumentoModal('${c.foto_path}')">📷 Foto</button>` : ""}
              ${c.doc_frente_path ? `<button class="btn-mini" onclick="verDocumentoModal('${c.doc_frente_path}')">🪪 Doc. frente</button>` : ""}
              ${c.doc_verso_path ? `<button class="btn-mini" onclick="verDocumentoModal('${c.doc_verso_path}')">🪪 Doc. verso</button>` : ""}
              ${c.comprovante_path ? `<button class="btn-mini" onclick="verDocumentoModal('${c.comprovante_path}')">💡 Comprovante</button>` : ""}
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }).join("");

  // busca as fotinhos em segundo plano (não trava a lista)
  clientes.forEach(async (c) => {
    if (!c.foto_path) return;
    const { data } = await supabaseClient.storage.from("documentos-clientes").createSignedUrl(c.foto_path, 3600);
    const el = document.getElementById(`foto-thumb-${c.id}`);
    if (data && el) el.innerHTML = `<img src="${data.signedUrl}" alt="${c.nome}">`;
  });
}

document.getElementById("busca-cliente").addEventListener("input", (e) => {
  loadClientes(e.target.value.trim());
});
document.getElementById("ordenar-cliente").addEventListener("change", () => {
  loadClientes(document.getElementById("busca-cliente").value.trim());
});

// ============================================================
// EDITAR CLIENTE
// ============================================================
function abrirModalCliente() {
  const modal = document.getElementById("tab-novo-cliente");
  modal.classList.add("modal-overlay-active");
  modal.style.display = "flex";
}

function fecharModalCliente() {
  const modal = document.getElementById("tab-novo-cliente");
  modal.classList.remove("modal-overlay-active");
  modal.style.display = "none";
  resetFormClienteState();
}
window.fecharModalCliente = fecharModalCliente;

function resetFormClienteState() {
  document.getElementById("form-cliente").reset();
  document.getElementById("cli-editando-id").value = "";
  document.getElementById("cli-form-title").textContent = "Novo cliente";
  document.getElementById("cli-submit-btn").textContent = "Salvar cliente";
  document.getElementById("cli-cancelar-edicao").style.display = "none";
  document.getElementById("cli-data-cadastro").value = new Date().toISOString().slice(0, 10);
  sugerirProximoIdCliente();
}

async function sugerirProximoIdCliente() {
  const { data } = await supabaseClient.from("clientes").select("codigo").order("created_at", { ascending: false }).limit(1);
  const ultimo = data?.[0]?.codigo || "";
  const numero = parseInt((ultimo.match(/\d+/) || [])[0] || "0") + 1;
  document.getElementById("cli-codigo").value = "CLI-" + String(numero).padStart(3, "0");
}

document.getElementById("btn-novo-cliente").addEventListener("click", () => {
  resetFormClienteState();
  abrirModalCliente();
});
document.getElementById("btn-fechar-modal-cliente").addEventListener("click", fecharModalCliente);

async function editarCliente(id) {
  const { data: c, error } = await supabaseClient.from("clientes").select("*").eq("id", id).single();
  if (error || !c) { alert("Não consegui carregar esse cliente."); return; }

  document.getElementById("cli-editando-id").value = c.id;
  document.getElementById("cli-nome").value = c.nome || "";
  document.getElementById("cli-codigo").value = c.codigo || "";
  document.getElementById("cli-data-cadastro").value = c.data_cadastro || "";
  document.getElementById("cli-indicacao").value = c.indicado_por || "";
  document.getElementById("cli-classificacao").value = c.classificacao || "padrao";
  document.getElementById("cli-telefone").value = c.telefone || "";
  document.getElementById("cli-endereco").value = c.endereco || "";
  document.getElementById("cli-cpf").value = c.cpf || "";
  document.getElementById("cli-obs").value = c.observacoes || "";

  document.getElementById("cli-form-title").textContent = "Editar cliente";
  document.getElementById("cli-submit-btn").textContent = "Salvar alterações";
  document.getElementById("cli-cancelar-edicao").style.display = "inline-block";

  abrirModalCliente();
}
window.editarCliente = editarCliente;

document.getElementById("cli-cancelar-edicao").addEventListener("click", fecharModalCliente);

// ============================================================
// EXCLUIR / LIXEIRA
// ============================================================
const LIXEIRA_TABELAS = [
  { tabela: "clientes", label: "Cliente", campoNome: "nome" },
  { tabela: "produtos", label: "Produto", campoNome: "produto" },
  { tabela: "contratos", label: "Operação", campoNome: "produto" },
  { tabela: "acordos", label: "Acordo", campoNome: "observacoes" },
];

async function excluirRegistro(tabela, id, recarregar) {
  if (!confirm("Excluir isso? Você consegue recuperar depois na Lixeira.")) return;
  const { error } = await supabaseClient.from(tabela).update({ excluido: true }).eq("id", id);
  if (error) { alert("Erro ao excluir: " + error.message); return; }
  if (recarregar) recarregar();
}
window.excluirRegistro = excluirRegistro;

async function loadLixeira() {
  const el = document.getElementById("lista-lixeira");
  el.innerHTML = `<div class="loading-line">Carregando...</div>`;

  const resultados = await Promise.all(
    LIXEIRA_TABELAS.map(t => supabaseClient.from(t.tabela).select("*").eq("excluido", true))
  );

  const itens = [];
  resultados.forEach((res, i) => {
    (res.data || []).forEach(item => itens.push({ ...LIXEIRA_TABELAS[i], item }));
  });

  if (itens.length === 0) {
    el.innerHTML = `<div class="empty-state">A lixeira está vazia.</div>`;
    return;
  }

  el.innerHTML = itens.map(({ tabela, label, campoNome, item }) => `
    <div class="ficha">
      <div class="ficha-body">
        <div class="ficha-top">
          <div>
            <div class="ficha-nome">${label}: ${item[campoNome] || "(sem nome)"}</div>
            <div class="ficha-meta">Excluído — ainda dá pra recuperar</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-mini green" onclick="restaurarRegistro('${tabela}','${item.id}')">↩️ Restaurar</button>
            <button class="btn-mini red" onclick="excluirParaSempre('${tabela}','${item.id}')">Excluir para sempre</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

async function excluirParaSempre(tabela, id) {
  if (!confirm("Isso apaga de vez, sem volta. Tem certeza?")) return;
  if (!confirm("Confirma mesmo? Não tem como desfazer depois disso.")) return;
  const { error } = await supabaseClient.from(tabela).delete().eq("id", id);
  if (error) { alert("Erro ao excluir: " + error.message); return; }
  loadLixeira();
}
window.excluirParaSempre = excluirParaSempre;

// ============================================================
// HISTÓRICO DE ALTERAÇÕES (desfazer)
// ============================================================
const NOMES_TABELA = { clientes: "Cliente", contratos: "Operação", produtos: "Produto", acordos: "Acordo" };
const NOMES_OPERACAO = { insert: "criou", update: "editou", delete: "excluiu" };

function nomeDoRegistro(tabela, dados) {
  if (!dados) return "(sem dados)";
  if (tabela === "clientes") return dados.nome;
  if (tabela === "contratos") return dados.produto || "Empréstimo/Acordo";
  if (tabela === "produtos") return dados.produto;
  if (tabela === "acordos") return `Acordo (${dados.valor ? fmtMoeda(dados.valor) : ""})`;
  return dados.id;
}

async function loadHistorico() {
  const el = document.getElementById("lista-historico");
  el.innerHTML = `<div class="loading-line">Carregando...</div>`;

  const { data: historico, error } = await supabaseClient
    .from("historico_alteracoes").select("*").order("created_at", { ascending: false }).limit(15);

  if (error) { el.innerHTML = `<div class="loading-line">Erro: ${error.message}</div>`; return; }
  if (!historico || historico.length === 0) { el.innerHTML = `<div class="empty-state">Nenhuma alteração registrada ainda.</div>`; return; }

  el.innerHTML = historico.map(h => {
    const dadosParaMostrar = h.dados_depois || h.dados_antes;
    return `
      <div class="ficha">
        <div class="ficha-top">
          <div>
            <div class="ficha-nome">${NOMES_TABELA[h.tabela] || h.tabela}: ${nomeDoRegistro(h.tabela, dadosParaMostrar)}</div>
            <div class="ficha-meta">${NOMES_OPERACAO[h.operacao]} · ${new Date(h.created_at).toLocaleString("pt-BR")}</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-mini" onclick="desfazerAlteracao('${h.id}')">↩️ Desfazer</button>
            ${h.operacao !== "delete" ? `<button class="btn-mini" onclick="refazerAlteracao('${h.id}')">🔁 Refazer</button>` : ""}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

async function desfazerAlteracao(historicoId) {
  const { data: h, error } = await supabaseClient.from("historico_alteracoes").select("*").eq("id", historicoId).single();
  if (error || !h) { alert("Não consegui carregar essa alteração."); return; }

  if (!confirm(`Desfazer isso: "${NOMES_OPERACAO[h.operacao]}" em ${NOMES_TABELA[h.tabela] || h.tabela}?`)) return;

  let resultado;
  if (h.operacao === "update") {
    const dados = { ...h.dados_antes };
    delete dados.id;
    resultado = await supabaseClient.from(h.tabela).update(dados).eq("id", h.registro_id);
  } else if (h.operacao === "insert") {
    resultado = await supabaseClient.from(h.tabela).update({ excluido: true }).eq("id", h.registro_id);
  } else if (h.operacao === "delete") {
    resultado = await supabaseClient.from(h.tabela).insert(h.dados_antes);
  }

  if (resultado?.error) { alert("Erro ao desfazer: " + resultado.error.message); return; }
  alert("Desfeito!");
  loadHistorico();
}
window.desfazerAlteracao = desfazerAlteracao;

async function refazerAlteracao(historicoId) {
  const { data: h, error } = await supabaseClient.from("historico_alteracoes").select("*").eq("id", historicoId).single();
  if (error || !h) { alert("Não consegui carregar essa alteração."); return; }
  if (!h.dados_depois) { alert("Essa alteração não tem um estado \"depois\" pra refazer."); return; }

  if (!confirm(`Refazer isso: voltar pro estado depois de "${NOMES_OPERACAO[h.operacao]}" em ${NOMES_TABELA[h.tabela] || h.tabela}?`)) return;

  let resultado;
  if (h.operacao === "update") {
    const dados = { ...h.dados_depois };
    delete dados.id;
    resultado = await supabaseClient.from(h.tabela).update(dados).eq("id", h.registro_id);
  } else if (h.operacao === "insert") {
    resultado = await supabaseClient.from(h.tabela).update({ excluido: false }).eq("id", h.registro_id);
  }

  if (resultado?.error) { alert("Erro ao refazer: " + resultado.error.message); return; }
  alert("Refeito!");
  loadHistorico();
}
window.refazerAlteracao = refazerAlteracao;

async function restaurarRegistro(tabela, id) {
  const { error } = await supabaseClient.from(tabela).update({ excluido: false }).eq("id", id);
  if (error) { alert("Erro ao restaurar: " + error.message); return; }
  loadLixeira();
}
window.restaurarRegistro = restaurarRegistro;

// ============================================================
// COBRANÇAS
// ============================================================
async function loadCobrancas() {
  const el = document.getElementById("lista-cobrancas");
  el.innerHTML = `<div class="loading-line">Carregando...</div>`;

  const { data: parcelas, error } = await supabaseClient
    .from("parcelas_status")
    .select("*")
    .in("status", ["pendente", "parcial"])
    .order("vencimento");

  if (error) {
    el.innerHTML = `<div class="loading-line">Erro: ${error.message}</div>`;
    return;
  }

  // popula filtro de cobradores dinamicamente
  const selCobrador = document.getElementById("filtro-cobrador");
  const cobradores = [...new Set(parcelas.map(p => p.cobrador || "Eu"))];
  const valorAtual = selCobrador.value;
  selCobrador.innerHTML = `<option value="todos">Qualquer cobrador</option>` +
    cobradores.map(c => `<option value="${c}">${c}</option>`).join("");
  selCobrador.value = valorAtual || "todos";

  window.__cobrancasCache = parcelas;
  renderCobrancas(parcelas);
}

function whatsappLink(telefone) {
  if (!telefone) return null;
  let digitos = telefone.replace(/\D/g, "");
  if (digitos.length <= 11) digitos = "55" + digitos; // assume Brasil se não tiver código do país
  return `https://wa.me/${digitos}`;
}

function renderCobrancas(parcelas) {
  const el = document.getElementById("lista-cobrancas");
  const statusFiltro = document.getElementById("filtro-status").value;
  const cobradorFiltro = document.getElementById("filtro-cobrador").value;
  const tipoCobrancaFiltro = document.getElementById("filtro-tipo-cobranca").value;
  const clienteFiltro = document.getElementById("filtro-cobranca-cliente").value.trim().toLowerCase();

  let filtradas = parcelas;
  if (statusFiltro !== "todos") filtradas = filtradas.filter(p => p.status_real === statusFiltro);
  if (cobradorFiltro !== "todos") filtradas = filtradas.filter(p => (p.cobrador || "Eu") === cobradorFiltro);
  if (tipoCobrancaFiltro !== "todos") filtradas = filtradas.filter(p => (p.tipo_cobranca || "presencial") === tipoCobrancaFiltro);
  if (clienteFiltro) filtradas = filtradas.filter(p =>
    p.cliente_nome.toLowerCase().includes(clienteFiltro) ||
    (p.cliente_codigo || "").toLowerCase().includes(clienteFiltro));

  if (filtradas.length === 0) {
    el.innerHTML = `<div class="empty-state">Nada por aqui com esse filtro. 🎉</div>`;
    return;
  }

  el.innerHTML = filtradas.map(p => {
    const wa = whatsappLink(p.cliente_telefone);
    const restante = Number(p.valor) - Number(p.valor_pago || 0);
    return `
    <div class="parcela-row">
      <div class="avatar-thumb" id="cobranca-foto-${p.id}">${p.cliente_nome.charAt(0).toUpperCase()}</div>
      <div class="who">
        <div class="n">${p.cliente_nome} <span class="mono" style="font-weight:400; font-size:12px; color:var(--text-soft);">${p.cliente_codigo || ""}</span> <span class="stamp stamp-${p.status_real}" style="transform:none; margin-left:6px; font-size:10px;">${p.status_real}</span></div>
        <div class="m">${p.produto || "Empréstimo"} — parcela ${p.numero} de ${fmtMoeda(p.valor)} · cobrador: ${p.cobrador || "Eu"}</div>
        <div class="m">${p.cliente_telefone ? "📞 " + p.cliente_telefone : "sem telefone"} ${p.cliente_endereco ? " · 📍 " + p.cliente_endereco : ""}</div>
        ${Number(p.valor_pago) > 0 ? `<div class="m" style="color:var(--warning);">Já pago: ${fmtMoeda(p.valor_pago)} · Falta: ${fmtMoeda(restante)}</div>` : ""}
      </div>
      <div class="venc">vence ${fmtData(p.vencimento)}<br><span class="mono" style="font-size:13px; color:var(--text);">Falta: ${fmtMoeda(restante)}</span></div>
      <div style="display:flex; gap:6px;">
        ${wa ? `<a class="btn-mini green" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
        <button class="btn-mini" onclick="abrirModalTentativa('${p.id}')">📝 Registrar tentativa</button>
        <button class="btn-mini green" onclick="abrirModalPagamento('${p.id}', ${restante})">💰 Registrar pagamento</button>
      </div>
    </div>
  `;
  }).join("");

  // busca as fotinhos em segundo plano
  filtradas.forEach(async (p) => {
    if (!p.cliente_foto_path) return;
    const { data } = await supabaseClient.storage.from("documentos-clientes").createSignedUrl(p.cliente_foto_path, 3600);
    const el = document.getElementById(`cobranca-foto-${p.id}`);
    if (data && el) el.innerHTML = `<img src="${data.signedUrl}" alt="${p.cliente_nome}">`;
  });
}

document.getElementById("filtro-status").addEventListener("change", loadCobrancas);
document.getElementById("filtro-cobrador").addEventListener("change", loadCobrancas);
document.getElementById("filtro-tipo-cobranca").addEventListener("change", loadCobrancas);
document.getElementById("filtro-cobranca-cliente").addEventListener("input", () => renderCobrancas(window.__cobrancasCache || []));

// Substituído por abrirModalPagamento/confirmarPagamento (suporta pagamento parcial).
// Mantido só o nome pra não quebrar nada que ainda chame marcarPago em algum lugar.
async function marcarPago(parcelaId) {
  abrirModalPagamento(parcelaId, null);
}
window.marcarPago = marcarPago;

function abrirModalPagamento(parcelaId, valorRestanteConhecido) {
  document.getElementById("pgto-parcela-id").value = parcelaId;
  if (valorRestanteConhecido !== null) {
    document.getElementById("pgto-valor").value = valorRestanteConhecido.toFixed(2);
    document.getElementById("pgto-restante-texto").textContent = `Falta pagar: ${fmtMoeda(valorRestanteConhecido)}`;
  } else {
    document.getElementById("pgto-valor").value = "";
    document.getElementById("pgto-restante-texto").textContent = "";
  }
  document.getElementById("modal-pagamento").style.display = "flex";
}
window.abrirModalPagamento = abrirModalPagamento;

function fecharModalPagamento() {
  document.getElementById("modal-pagamento").style.display = "none";
}
window.fecharModalPagamento = fecharModalPagamento;

async function confirmarPagamento() {
  const parcelaId = document.getElementById("pgto-parcela-id").value;
  const valorRecebido = parseFloat(document.getElementById("pgto-valor").value);
  if (!valorRecebido || valorRecebido <= 0) { alert("Digite um valor válido."); return; }

  const { data: parcela, error: buscaErr } = await supabaseClient.from("parcelas").select("*").eq("id", parcelaId).single();
  if (buscaErr || !parcela) { alert("Não consegui carregar essa parcela."); return; }

  const hoje = new Date().toISOString().slice(0, 10);
  const novoValorPago = Number(parcela.valor_pago || 0) + valorRecebido;
  const quitou = novoValorPago >= Number(parcela.valor) - 0.01; // margem pra centavos

  const dadosAtualizacao = { valor_pago: novoValorPago, status: quitou ? "pago" : "parcial" };
  if (quitou) dadosAtualizacao.data_pagamento = hoje;

  const { error: updErr } = await supabaseClient.from("parcelas").update(dadosAtualizacao).eq("id", parcelaId);
  if (updErr) { alert("Erro: " + updErr.message); return; }

  // busca nome do cliente e produto pra deixar a descrição bem clara no financeiro
  const { data: contratoInfo } = await supabaseClient
    .from("operacoes_status").select("cliente_nome,cliente_codigo,produto").eq("id", parcela.contrato_id).single();
  const nomeCompleto = contratoInfo
    ? `${contratoInfo.cliente_nome} (${contratoInfo.cliente_codigo || ""}) — ${contratoInfo.produto || "Empréstimo"}`
    : "Cliente";

  // lança a entrada no financeiro pelo valor exato recebido agora (não o valor total da parcela)
  await supabaseClient.from("movimentacoes").insert({
    tipo: "entrada",
    valor: valorRecebido,
    data: hoje,
    categoria: quitou ? "Parcela recebida" : "Parcela recebida (parcial)",
    descricao: `${nomeCompleto} — Parcela ${parcela.numero} de ${fmtMoeda(parcela.valor)}${quitou ? "" : " — pagamento parcial"}`,
    origem_tipo: "parcela",
    origem_id: parcelaId,
  });

  fecharModalPagamento();
  alert(quitou ? "Pagamento registrado — parcela quitada!" : "Pagamento parcial registrado — o resto continua em aberto.");
  loadCobrancas();
  loadDashboard(); // atualiza também se a ação veio do Painel
  loadClientes(document.getElementById("busca-cliente")?.value.trim() || ""); // e se veio da ficha do cliente
}
window.confirmarPagamento = confirmarPagamento;

// ============================================================
// FORM: NOVO CLIENTE
// ============================================================
document.getElementById("form-cliente").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("cli-msg");
  msg.textContent = "Salvando...";
  msg.className = "form-msg";

  const editandoId = document.getElementById("cli-editando-id").value;
  const dadosCliente = {
    nome: document.getElementById("cli-nome").value.trim(),
    codigo: document.getElementById("cli-codigo").value.trim(),
    data_cadastro: document.getElementById("cli-data-cadastro").value || null,
    indicado_por: document.getElementById("cli-indicacao").value.trim() || null,
    classificacao: document.getElementById("cli-classificacao").value,
    telefone: document.getElementById("cli-telefone").value.trim(),
    endereco: document.getElementById("cli-endereco").value.trim(),
    cpf: document.getElementById("cli-cpf").value.trim(),
    observacoes: document.getElementById("cli-obs").value.trim(),
  };

  let clienteId = editandoId;
  let error;

  if (editandoId) {
    ({ error } = await supabaseClient.from("clientes").update(dadosCliente).eq("id", editandoId));
  } else {
    const { data: novoCliente, error: insErr } = await supabaseClient.from("clientes").insert(dadosCliente).select().single();
    error = insErr;
    if (novoCliente) clienteId = novoCliente.id;
  }

  if (error) {
    if (error.message.includes("clientes_codigo_unico") || error.code === "23505") {
      msg.textContent = "Esse ID já está sendo usado por outro cliente. Escolhe outro.";
    } else {
      msg.textContent = "Erro: " + error.message;
    }
    msg.className = "form-msg err";
    return;
  }

  // envia os arquivos (só os que foram escolhidos) e liga eles no cadastro do cliente
  msg.textContent = "Cliente salvo, enviando arquivos...";
  const arquivos = {
    foto_path: document.getElementById("cli-foto").files[0],
    doc_frente_path: document.getElementById("cli-doc-frente").files[0],
    doc_verso_path: document.getElementById("cli-doc-verso").files[0],
    comprovante_path: document.getElementById("cli-comprovante").files[0],
  };

  const atualizacoes = {};
  for (const [coluna, arquivo] of Object.entries(arquivos)) {
    if (!arquivo) continue;
    const caminho = `${clienteId}/${coluna}-${Date.now()}-${arquivo.name}`;
    const { error: upErr } = await supabaseClient.storage
      .from("documentos-clientes")
      .upload(caminho, arquivo);
    if (!upErr) atualizacoes[coluna] = caminho;
  }

  if (Object.keys(atualizacoes).length > 0) {
    await supabaseClient.from("clientes").update(atualizacoes).eq("id", clienteId);
  }

  msg.textContent = editandoId ? "Alterações salvas!" : "Cliente salvo!";
  msg.className = "form-msg ok";
  loadClientes();
  setTimeout(fecharModalCliente, 900);
});

// (o visualizador de documentos foi substituído por verDocumentoModal, mais abaixo)

// ============================================================
// ESTOQUE
// ============================================================
const ESTOQUE_LABEL = { disponivel: "Disponível", agendado: "Agendado", em_analise: "Em análise", vendido: "Vendido" };
const ORIGEM_LABEL = { estoque: "Em estoque", parceria: "Parceria", encomenda: "Encomenda" };

async function loadEstoque() {
  const el = document.getElementById("lista-estoque");
  el.innerHTML = `<div class="loading-line">Carregando...</div>`;

  const { data: produtos, error } = await supabaseClient.from("produtos").select("*").eq("excluido", false).order("created_at", { ascending: false });
  if (error) {
    el.innerHTML = `<div class="loading-line">Erro: ${error.message}</div>`;
    return;
  }
  window.__estoqueCache = produtos;
  renderEstoque(produtos);
}

function renderEstoque(produtos) {
  const el = document.getElementById("lista-estoque");
  const filtro = document.getElementById("filtro-estoque-status").value;
  const filtrados = filtro === "todos" ? produtos : produtos.filter(p => p.status === filtro);

  if (filtrados.length === 0) {
    el.innerHTML = `<div class="empty-state">Nada aqui com esse filtro. Cadastre em "+ Produto".</div>`;
    return;
  }

  el.innerHTML = filtrados.map(p => `
    <div class="ficha">
      <div class="ficha-body">
        <div class="ficha-top">
          <div>
            <div class="ficha-nome mono">${p.cmp} — ${p.produto}</div>
            <div class="ficha-meta">
              ${p.categoria || "sem categoria"} · custo ${fmtMoeda(p.custo)}
              ${p.markup_percent ? " · markup " + p.markup_percent + "%" : ""}
              · garantia ${p.garantia_dias || 0} dias
              ${p.data_venda ? " · vendido em " + fmtData(p.data_venda) : ""}
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <span class="stamp stamp-${p.status}">${ESTOQUE_LABEL[p.status] || p.status}</span>
            <span class="stamp stamp-em_aberto">${ORIGEM_LABEL[p.origem] || "Estoque"}</span>
          </div>
        </div>
        ${(p.fotos && p.fotos.length > 0) ? `<div id="fotos-produto-${p.id}" style="display:flex; gap:6px; margin-top:10px; flex-wrap:wrap;"></div>` : ""}
        ${p.video_link ? `<div style="margin-top:8px;"><a href="${p.video_link}" target="_blank" rel="noopener" class="btn-mini">▶️ Ver vídeo</a></div>` : ""}
        <div class="ficha-actions">
          <button class="btn-mini" onclick="editarProduto('${p.id}')">✏️ Editar</button>
          <button class="btn-mini red" onclick="excluirRegistro('produtos','${p.id}', loadEstoque)">🗑️ Excluir</button>
        </div>
      </div>
    </div>
  `).join("");

  filtrados.forEach(async (p) => {
    if (!p.fotos || p.fotos.length === 0) return;
    const container = document.getElementById(`fotos-produto-${p.id}`);
    for (const caminho of p.fotos) {
      const { data } = await supabaseClient.storage.from("documentos-clientes").createSignedUrl(caminho, 3600);
      if (data && container) {
        const img = document.createElement("img");
        img.src = data.signedUrl;
        img.style.cssText = "width:64px; height:64px; object-fit:cover; border-radius:6px; cursor:pointer; border:1px solid var(--border);";
        img.onclick = () => verDocumentoModal(caminho);
        container.appendChild(img);
      }
    }
  });
}

document.getElementById("filtro-estoque-status").addEventListener("change", () => {
  renderEstoque(window.__estoqueCache || []);
});

document.getElementById("form-produto").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("prd-msg");
  msg.textContent = "Salvando...";
  msg.className = "form-msg";

  const editandoId = document.getElementById("prd-editando-id").value;
  const dadosProduto = {
    produto: document.getElementById("prd-produto").value.trim(),
    categoria: document.getElementById("prd-categoria").value.trim() || null,
    ticket: document.getElementById("prd-ticket").value,
    custo: parseFloat(document.getElementById("prd-custo").value || 0),
    markup_percent: document.getElementById("prd-markup").value ? parseFloat(document.getElementById("prd-markup").value) : null,
    garantia_dias: parseInt(document.getElementById("prd-garantia").value || 0),
    data_aquisicao: document.getElementById("prd-data").value || new Date().toISOString().slice(0, 10),
    status: document.getElementById("prd-status").value,
    origem: document.getElementById("prd-origem").value,
    link: document.getElementById("prd-link").value.trim() || null,
    video_link: document.getElementById("prd-video").value.trim() || null,
    descricao: document.getElementById("prd-descricao").value.trim() || null,
  };

  let error, produtoId = editandoId;
  if (editandoId) {
    ({ error } = await supabaseClient.from("produtos").update(dadosProduto).eq("id", editandoId));
  } else {
    const { data: novo, error: insErr } = await supabaseClient.from("produtos").insert(dadosProduto).select().single();
    error = insErr;
    if (novo) produtoId = novo.id;
  }

  if (error) {
    msg.textContent = "Erro: " + error.message;
    msg.className = "form-msg err";
    return;
  }

  // envia até 6 fotos (se escolheu alguma)
  const arquivosFotos = [...document.getElementById("prd-fotos").files].slice(0, 6);
  if (arquivosFotos.length > 0 && produtoId) {
    msg.textContent = "Salvo! Enviando fotos...";
    const novosCaminhos = [];
    for (const arquivo of arquivosFotos) {
      const caminho = `produtos/${produtoId}/${Date.now()}-${arquivo.name}`;
      const { error: upErr } = await supabaseClient.storage.from("documentos-clientes").upload(caminho, arquivo);
      if (!upErr) novosCaminhos.push(caminho);
    }
    if (novosCaminhos.length > 0) {
      const { data: atual } = await supabaseClient.from("produtos").select("fotos").eq("id", produtoId).single();
      const fotosFinal = [...(atual?.fotos || []), ...novosCaminhos].slice(0, 6);
      await supabaseClient.from("produtos").update({ fotos: fotosFinal }).eq("id", produtoId);
    }
  }
  msg.textContent = editandoId ? "Alterações salvas!" : "Produto salvo! Já lançamos o custo como saída no financeiro.";
  msg.className = "form-msg ok";
  e.target.reset();
  document.getElementById("prd-editando-id").value = "";
  document.getElementById("prd-form-title").textContent = "Novo produto no estoque";
  document.getElementById("prd-submit-btn").textContent = "Salvar produto";
  document.getElementById("prd-cancelar-edicao").style.display = "none";
});

// ============================================================
// FINANCEIRO
// ============================================================
async function loadFinanceiro() {
  const cardsEl = document.getElementById("fin-cards");
  const listEl = document.getElementById("lista-mov");
  cardsEl.innerHTML = `<div class="loading-line">Carregando...</div>`;

  const { data: movs, error } = await supabaseClient
    .from("movimentacoes").select("*").order("data", { ascending: false }).limit(200);

  if (error) {
    cardsEl.innerHTML = `<div class="loading-line">Erro: ${error.message}</div>`;
    return;
  }

  const { data: entidades } = await supabaseClient.from("entidades").select("id,nome_identificacao,aliquota_imposto").gt("aliquota_imposto", 0);

  const mesAtual = new Date().toISOString().slice(0, 7);
  const doMes = movs.filter(m => m.data && m.data.slice(0, 7) === mesAtual);
  const entradasMes = doMes.filter(m => m.tipo === "entrada").reduce((s, m) => s + Number(m.valor), 0);
  const saidasMes = doMes.filter(m => m.tipo === "saida").reduce((s, m) => s + Number(m.valor), 0);
  const entradasTotal = movs.filter(m => m.tipo === "entrada").reduce((s, m) => s + Number(m.valor), 0);
  const saidasTotal = movs.filter(m => m.tipo === "saida").reduce((s, m) => s + Number(m.valor), 0);

  let impostoHtml = "";
  (entidades || []).forEach(ent => {
    const entradasEntidadeMes = doMes.filter(m => m.tipo === "entrada" && m.entidade_id === ent.id).reduce((s, m) => s + Number(m.valor), 0);
    if (entradasEntidadeMes > 0) {
      const imposto = entradasEntidadeMes * (ent.aliquota_imposto / 100);
      impostoHtml += `
        <div class="stat-card amber">
          <div class="label">Imposto estimado — ${ent.nome_identificacao}</div>
          <div class="value">${fmtMoeda(imposto)}</div>
        </div>`;
    }
  });

  cardsEl.innerHTML = `
    <div class="stat-card green">
      <div class="label">Entradas este mês</div>
      <div class="value">${fmtMoeda(entradasMes)}</div>
    </div>
    <div class="stat-card red">
      <div class="label">Saídas este mês</div>
      <div class="value">${fmtMoeda(saidasMes)}</div>
    </div>
    <div class="stat-card">
      <div class="label">Saldo (todo o histórico)</div>
      <div class="value">${fmtMoeda(entradasTotal - saidasTotal)}</div>
    </div>
    ${impostoHtml}
  `;

  if (movs.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Nenhuma movimentação ainda.</div>`;
    return;
  }

  const anos = [...new Set(movs.map(m => m.data?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const selAno = document.getElementById("filtro-mov-ano");
  const anoAtual = selAno.value;
  selAno.innerHTML = `<option value="todos">Todos os anos</option>` + anos.map(a => `<option value="${a}">${a}</option>`).join("");
  selAno.value = anoAtual || "todos";

  // chips de categoria (múltipla escolha)
  const categorias = [...new Set(movs.map(m => m.categoria).filter(Boolean))].sort();
  const catContainer = document.getElementById("filtro-mov-categorias");
  const categoriasAtivas = window.__categoriasMovAtivas || new Set();
  catContainer.innerHTML = categorias.map(c => `
    <button type="button" class="btn-mini ${categoriasAtivas.has(c) ? "green" : ""}" onclick="toggleCategoriaMov('${c.replace(/'/g, "\\'")}')">${c}</button>
  `).join("");

  window.__movsCache = movs;
  renderMovimentacoes(movs);
}

function toggleCategoriaMov(categoria) {
  if (!window.__categoriasMovAtivas) window.__categoriasMovAtivas = new Set();
  if (window.__categoriasMovAtivas.has(categoria)) window.__categoriasMovAtivas.delete(categoria);
  else window.__categoriasMovAtivas.add(categoria);
  loadFinanceiro();
}
window.toggleCategoriaMov = toggleCategoriaMov;

function renderMovimentacoes(movs) {
  const listEl = document.getElementById("lista-mov");
  const mesFiltro = document.getElementById("filtro-mov-mes").value;
  const anoFiltro = document.getElementById("filtro-mov-ano").value;

  let filtradas = movs;
  if (anoFiltro !== "todos") filtradas = filtradas.filter(m => m.data?.slice(0, 4) === anoFiltro);
  if (mesFiltro !== "todos") filtradas = filtradas.filter(m => String(parseInt(m.data?.slice(5, 7)) - 1) === mesFiltro);
  if (window.__categoriasMovAtivas && window.__categoriasMovAtivas.size > 0) {
    filtradas = filtradas.filter(m => window.__categoriasMovAtivas.has(m.categoria));
  }

  if (filtradas.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Nada com esse filtro.</div>`;
    return;
  }

  listEl.innerHTML = filtradas.map(m => `
    <div class="mov-row">
      <div class="desc">
        <div class="n">${m.categoria || (m.tipo === "entrada" ? "Entrada" : "Saída")} ${m.origem_tipo && m.origem_tipo !== "manual" ? `<span class="mono" style="font-size:11px; color:var(--text-soft);">(vem de ${m.origem_tipo})</span>` : ""}</div>
        <div class="m">${m.descricao || ""}</div>
      </div>
      <div class="data">${fmtData(m.data)}</div>
      <div class="val ${m.tipo}">${m.tipo === "saida" ? "- " : "+ "}${fmtMoeda(m.valor)}</div>
      <div style="display:flex; gap:6px;">
        <button class="btn-mini" onclick="editarMovimentacao('${m.id}')">✏️</button>
        <button class="btn-mini red" onclick="excluirMovimentacao('${m.id}')">🗑️</button>
      </div>
    </div>
  `).join("");
}

document.getElementById("filtro-mov-mes").addEventListener("change", () => renderMovimentacoes(window.__movsCache || []));
document.getElementById("filtro-mov-ano").addEventListener("change", () => renderMovimentacoes(window.__movsCache || []));

async function editarMovimentacao(id) {
  const { data: m, error } = await supabaseClient.from("movimentacoes").select("*").eq("id", id).single();
  if (error || !m) { alert("Não consegui carregar essa movimentação."); return; }

  await loadEntidadesNoSelectMov();

  document.getElementById("mov-editando-id").value = m.id;
  document.getElementById("mov-tipo").value = m.tipo;
  document.getElementById("mov-valor").value = m.valor;
  document.getElementById("mov-data").value = m.data;
  document.getElementById("mov-hora").value = m.hora || "";
  document.getElementById("mov-categoria").value = m.categoria || "";
  document.getElementById("mov-forma-pagamento").value = m.forma_pagamento || "";
  carregarBotoesFormaPagamento();
  document.getElementById("mov-conta").value = m.conta || "";
  document.getElementById("mov-entidade").value = m.entidade_id || "";
  document.getElementById("mov-descricao").value = m.descricao || "";

  document.getElementById("mov-form-title").textContent =
    m.origem_tipo && m.origem_tipo !== "manual"
      ? `Editar movimentação (lançada automaticamente via ${m.origem_tipo})`
      : "Editar movimentação";
  document.getElementById("mov-submit-btn").textContent = "Salvar alterações";
  document.getElementById("mov-cancelar-edicao").style.display = "inline-block";

  document.getElementById("form-movimentacao").scrollIntoView({ behavior: "smooth" });
}
window.editarMovimentacao = editarMovimentacao;

async function excluirMovimentacao(id) {
  if (!confirm("Excluir essa movimentação? (isso não desfaz o que já aconteceu na origem, só remove o registro daqui)")) return;
  const { error } = await supabaseClient.from("movimentacoes").delete().eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  loadFinanceiro();
}
window.excluirMovimentacao = excluirMovimentacao;

// ============================================================
// DOCUMENTOS (pastas e arquivos, organização manual)
// ============================================================
let PASTA_ATUAL = null; // null = raiz

async function loadDocumentos(pastaId) {
  PASTA_ATUAL = pastaId;
  const el = document.getElementById("lista-documentos");
  el.innerHTML = `<div class="loading-line">Carregando...</div>`;

  await renderBreadcrumb(pastaId);
  await carregarOpcoesPastasMover();

  let queryPastas = supabaseClient.from("pastas").select("*").order("ordem").order("nome");
  queryPastas = pastaId ? queryPastas.eq("pasta_pai_id", pastaId) : queryPastas.is("pasta_pai_id", null);
  const { data: subpastas, error: errPastas } = await queryPastas;

  let queryArquivos = supabaseClient.from("documentos").select("*").order("ordem").order("nome_arquivo");
  queryArquivos = pastaId ? queryArquivos.eq("pasta_id", pastaId) : queryArquivos.is("pasta_id", null);
  const { data: arquivos, error: errDocs } = await queryArquivos;

  if (errPastas || errDocs) {
    el.innerHTML = `<div class="loading-line">Erro: ${(errPastas || errDocs).message}</div>`;
    return;
  }

  if ((subpastas || []).length === 0 && (arquivos || []).length === 0) {
    el.innerHTML = `<div class="empty-state">Pasta vazia. Crie uma subpasta ou envie um arquivo.</div>`;
    return;
  }

  let html = "";
  (subpastas || []).forEach((p, i) => {
    html += `
      <div class="ficha">
        <div class="ficha-top">
          <div class="doc-row" style="cursor:pointer;" onclick="loadDocumentos('${p.id}')">
            <div class="doc-icon pasta">PAS</div>
            <div class="ficha-nome">${p.nome} <span class="mono" style="font-weight:400; font-size:11px; color:var(--text-soft);">${p.codigo || ""}</span></div>
          </div>
          <div style="display:flex; gap:4px; align-items:center;">
            <button class="btn-mini" onclick="moverOrdemPasta('${p.id}', -1)" ${i === 0 ? "disabled" : ""}>▲</button>
            <button class="btn-mini" onclick="moverOrdemPasta('${p.id}', 1)" ${i === subpastas.length - 1 ? "disabled" : ""}>▼</button>
            <button class="btn-mini" onclick="renomearPasta('${p.id}', '${p.nome.replace(/'/g, "\\'")}')">Renomear</button>
            <select class="btn-mini" onchange="moverPasta('${p.id}', this.value)" style="font-size:11.5px;">
              <option value="">Mover para...</option>
              ${OPCOES_PASTAS_MOVER}
            </select>
            <button class="btn-mini red" onclick="excluirPasta('${p.id}')">Excluir</button>
          </div>
        </div>
      </div>
    `;
  });
  (arquivos || []).forEach((a, i) => {
    const ext = (a.nome_arquivo.split(".").pop() || "").slice(0, 3).toUpperCase();
    html += `
      <div class="ficha">
        <div class="ficha-top">
          <div class="doc-row">
            <div class="doc-icon arquivo">${ext}</div>
            <div class="ficha-nome">${a.nome_arquivo}</div>
          </div>
          <div style="display:flex; gap:4px; align-items:center;">
            <button class="btn-mini" onclick="moverOrdemArquivo('${a.id}', -1)" ${i === 0 ? "disabled" : ""}>▲</button>
            <button class="btn-mini" onclick="moverOrdemArquivo('${a.id}', 1)" ${i === arquivos.length - 1 ? "disabled" : ""}>▼</button>
            <button class="btn-mini" onclick="renomearArquivo('${a.id}', '${a.nome_arquivo.replace(/'/g, "\\'")}')">Renomear</button>
            <select class="btn-mini" onchange="moverArquivo('${a.id}', this.value)" style="font-size:11.5px;">
              <option value="">Mover para...</option>
              ${OPCOES_PASTAS_MOVER}
            </select>
            <button class="btn-mini" onclick="verDocumentoModal('${a.caminho}')">Abrir</button>
            <button class="btn-mini red" onclick="excluirDocumento('${a.id}')">Excluir</button>
          </div>
        </div>
      </div>
    `;
  });
  el.innerHTML = html;
}
window.loadDocumentos = loadDocumentos;

let OPCOES_PASTAS_MOVER = `<option value="raiz">🏠 Início (raiz)</option>`;
async function carregarOpcoesPastasMover() {
  const { data } = await supabaseClient.from("pastas").select("id,nome,codigo").order("nome");
  OPCOES_PASTAS_MOVER = `<option value="raiz">🏠 Início (raiz)</option>` +
    (data || []).map(p => `<option value="${p.id}">${p.nome} (${p.codigo || ""})</option>`).join("");
}

async function moverPasta(pastaId, destino) {
  if (!destino) return;
  const novoPai = destino === "raiz" ? null : destino;
  if (novoPai === pastaId) { alert("Uma pasta não pode ser movida pra dentro dela mesma."); loadDocumentos(PASTA_ATUAL); return; }
  const { error } = await supabaseClient.from("pastas").update({ pasta_pai_id: novoPai }).eq("id", pastaId);
  if (error) { alert("Erro: " + error.message); return; }
  loadDocumentos(PASTA_ATUAL);
}
window.moverPasta = moverPasta;

async function moverArquivo(arquivoId, destino) {
  if (!destino) return;
  const novaPasta = destino === "raiz" ? null : destino;
  const { error } = await supabaseClient.from("documentos").update({ pasta_id: novaPasta }).eq("id", arquivoId);
  if (error) { alert("Erro: " + error.message); return; }
  loadDocumentos(PASTA_ATUAL);
}
window.moverArquivo = moverArquivo;

async function excluirDocumento(id) {
  if (!confirm("Excluir esse arquivo?")) return;
  const { error } = await supabaseClient.from("documentos").delete().eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  loadDocumentos(PASTA_ATUAL);
}
window.excluirDocumento = excluirDocumento;

async function renomearPasta(id, nomeAtual) {
  const novo = prompt("Novo nome da pasta:", nomeAtual);
  if (!novo || !novo.trim()) return;
  const { error } = await supabaseClient.from("pastas").update({ nome: novo.trim() }).eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  loadDocumentos(PASTA_ATUAL);
}
window.renomearPasta = renomearPasta;

async function excluirPasta(id) {
  if (!confirm("Excluir essa pasta? Tudo que estiver dentro dela (subpastas e arquivos) vai junto, sem volta.")) return;
  if (!confirm("Tem certeza mesmo? Essa ação não pode ser desfeita.")) return;
  const { error } = await supabaseClient.from("pastas").delete().eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  loadDocumentos(PASTA_ATUAL);
}
window.excluirPasta = excluirPasta;

async function renomearArquivo(id, nomeAtual) {
  const novo = prompt("Novo nome do arquivo:", nomeAtual);
  if (!novo || !novo.trim()) return;
  const { error } = await supabaseClient.from("documentos").update({ nome_arquivo: novo.trim() }).eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  loadDocumentos(PASTA_ATUAL);
}
window.renomearArquivo = renomearArquivo;

async function moverOrdemPasta(id, direcao) {
  let q = supabaseClient.from("pastas").select("id,ordem").order("ordem");
  q = PASTA_ATUAL ? q.eq("pasta_pai_id", PASTA_ATUAL) : q.is("pasta_pai_id", null);
  const { data: pastas } = await q;
  const lista = (pastas || []);
  const i = lista.findIndex(p => p.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= lista.length) return;
  await supabaseClient.from("pastas").update({ ordem: lista[j].ordem }).eq("id", lista[i].id);
  await supabaseClient.from("pastas").update({ ordem: lista[i].ordem }).eq("id", lista[j].id);
  loadDocumentos(PASTA_ATUAL);
}
window.moverOrdemPasta = moverOrdemPasta;

async function moverOrdemArquivo(id, direcao) {
  let q = supabaseClient.from("documentos").select("id,ordem").order("ordem");
  q = PASTA_ATUAL ? q.eq("pasta_id", PASTA_ATUAL) : q.is("pasta_id", null);
  const { data: arqs } = await q;
  const lista = (arqs || []);
  const i = lista.findIndex(a => a.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= lista.length) return;
  await supabaseClient.from("documentos").update({ ordem: lista[j].ordem }).eq("id", lista[i].id);
  await supabaseClient.from("documentos").update({ ordem: lista[i].ordem }).eq("id", lista[j].id);
  loadDocumentos(PASTA_ATUAL);
}
window.moverOrdemArquivo = moverOrdemArquivo;

async function buscarDocumentos(termo) {
  const el = document.getElementById("lista-documentos");
  el.innerHTML = `<div class="loading-line">Buscando...</div>`;
  document.getElementById("doc-breadcrumb").innerHTML = `<span class="ficha-meta">Resultados da busca por "${termo}"</span>`;

  const [{ data: pastas }, { data: arquivos }] = await Promise.all([
    supabaseClient.from("pastas").select("*").or(`nome.ilike.%${termo}%,codigo.ilike.%${termo}%`),
    supabaseClient.from("documentos").select("*").ilike("nome_arquivo", `%${termo}%`),
  ]);

  if ((pastas || []).length === 0 && (arquivos || []).length === 0) {
    el.innerHTML = `<div class="empty-state">Nada encontrado.</div>`;
    return;
  }

  let html = "";
  (pastas || []).forEach(p => {
    html += `<div class="ficha" style="cursor:pointer;" onclick="document.getElementById('doc-busca').value=''; loadDocumentos('${p.id}')"><div class="doc-row"><div class="doc-icon pasta">PAS</div><div class="ficha-nome">${p.nome} <span class="mono" style="font-weight:400; font-size:11px; color:var(--text-soft);">${p.codigo || ""}</span></div></div></div>`;
  });
  (arquivos || []).forEach(a => {
    const ext = (a.nome_arquivo.split(".").pop() || "").slice(0, 3).toUpperCase();
    html += `<div class="ficha"><div class="ficha-top"><div class="doc-row"><div class="doc-icon arquivo">${ext}</div><div class="ficha-nome">${a.nome_arquivo}</div></div><button class="btn-mini" onclick="verDocumentoModal('${a.caminho}')">Abrir</button></div></div>`;
  });
  el.innerHTML = html;
}

document.getElementById("doc-busca").addEventListener("input", (e) => {
  const termo = e.target.value.trim();
  if (termo) buscarDocumentos(termo);
  else loadDocumentos(PASTA_ATUAL);
});

async function renderBreadcrumb(pastaId) {
  const el = document.getElementById("doc-breadcrumb");
  let trilha = [];
  let atual = pastaId;
  while (atual) {
    const { data } = await supabaseClient.from("pastas").select("id,nome,pasta_pai_id").eq("id", atual).single();
    if (!data) break;
    trilha.unshift(data);
    atual = data.pasta_pai_id;
  }
  const partes = [`<button class="btn-mini" onclick="loadDocumentos(null)">🏠 Início</button>`]
    .concat(trilha.map(p => `<button class="btn-mini" onclick="loadDocumentos('${p.id}')">${p.nome}</button>`));
  el.innerHTML = partes.join(" / ");
}

document.getElementById("doc-nova-pasta").addEventListener("click", async () => {
  const nome = prompt("Nome da nova pasta:");
  if (!nome || !nome.trim()) return;
  const { error } = await supabaseClient.from("pastas").insert({
    nome: nome.trim(),
    pasta_pai_id: PASTA_ATUAL,
  });
  if (error) { alert("Erro ao criar pasta: " + error.message); return; }
  loadDocumentos(PASTA_ATUAL);
});

document.getElementById("doc-input-arquivo").addEventListener("change", async (e) => {
  const arquivo = e.target.files[0];
  if (!arquivo) return;

  const caminho = `pastas/${PASTA_ATUAL || "raiz"}/${Date.now()}-${arquivo.name}`;
  const { error: upErr } = await supabaseClient.storage.from("documentos-clientes").upload(caminho, arquivo);
  if (upErr) { alert("Erro ao enviar arquivo: " + upErr.message); return; }

  const { error } = await supabaseClient.from("documentos").insert({
    pasta_id: PASTA_ATUAL,
    nome_arquivo: arquivo.name,
    caminho: caminho,
    tamanho_kb: Math.round(arquivo.size / 1024),
  });
  if (error) { alert("Arquivo enviado, mas erro ao registrar: " + error.message); return; }

  e.target.value = "";
  loadDocumentos(PASTA_ATUAL);
});
// ============================================================
// FORM: NOVO CONTRATO
// ============================================================
async function loadClientesNoSelect() {
  const sel = document.getElementById("ctr-cliente");
  const { data: clientes, error } = await supabaseClient.from("clientes").select("id,nome").order("nome");
  if (error) return;
  sel.innerHTML = clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join("");
}

async function loadEstoqueNoSelect() {
  const sel = document.getElementById("ctr-produto-estoque");
  const { data: produtos, error } = await supabaseClient
    .from("produtos").select("id,cmp,produto,categoria").eq("status", "disponivel").order("produto");
  if (error) return;
  sel.innerHTML = `<option value="">— produto avulso, digitar abaixo —</option>` +
    produtos.map(p => `<option value="${p.id}" data-produto="${p.produto}" data-categoria="${p.categoria || ""}">${p.cmp} — ${p.produto}</option>`).join("");
}

document.getElementById("ctr-produto-estoque").addEventListener("change", (e) => {
  const opt = e.target.selectedOptions[0];
  if (opt && opt.value) {
    document.getElementById("ctr-produto").value = opt.dataset.produto || "";
    document.getElementById("ctr-categoria").value = opt.dataset.categoria || "";
  }
});

document.getElementById("ctr-tipo").addEventListener("change", (e) => {
  const isEmprestimo = e.target.value === "emprestimo";
  document.getElementById("linha-estoque").style.display = isEmprestimo ? "none" : "block";
  document.getElementById("linha-produto").style.display = isEmprestimo ? "none" : "block";
  document.getElementById("linha-categoria").style.display = isEmprestimo ? "none" : "block";
});

// mostra o lucro estimado e o nível de urgência ao vivo, enquanto preenche
function atualizarPreviewOperacao() {
  const valor = parseFloat(document.getElementById("ctr-valor").value || 0);
  const custo = parseFloat(document.getElementById("ctr-custo").value || 0);
  const desconto = parseFloat(document.getElementById("ctr-desconto").value || 0);
  const garantia = parseInt(document.getElementById("ctr-garantia").value || 0);
  const preview = document.getElementById("ctr-preview");

  if (!valor) { preview.style.display = "none"; return; }

  const lucro = valor - custo - desconto;
  const urgencia = garantia > 0 ? "Baixa (tem garantia)" : "Alta (sem garantia)";

  preview.style.display = "block";
  preview.innerHTML = `
    <strong>Lucro estimado:</strong> ${fmtMoeda(lucro)}<br>
    <strong>Nível de urgência:</strong> ${urgencia}
  `;
}
["ctr-valor","ctr-custo","ctr-desconto","ctr-garantia"].forEach(id => {
  document.getElementById(id).addEventListener("input", atualizarPreviewOperacao);
});

// data de venda default = hoje
document.getElementById("ctr-data").value = new Date().toISOString().slice(0, 10);

document.getElementById("form-contrato").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("ctr-msg");

  const editandoId = document.getElementById("ctr-editando-id").value;
  const dadosOperacao = {
    cliente_id: document.getElementById("ctr-cliente").value,
    tipo: document.getElementById("ctr-tipo").value,
    produto_id: document.getElementById("ctr-produto-estoque").value || null,
    produto: document.getElementById("ctr-produto").value.trim() || null,
    categoria: document.getElementById("ctr-categoria").value.trim() || null,
    valor_total: parseFloat(document.getElementById("ctr-valor").value),
    custo_produto: parseFloat(document.getElementById("ctr-custo").value || 0),
    entrada: parseFloat(document.getElementById("ctr-entrada").value || 0),
    desconto: parseFloat(document.getElementById("ctr-desconto").value || 0),
    garantia_dias: parseInt(document.getElementById("ctr-garantia").value || 0),
    cobrador: document.getElementById("ctr-cobrador").value.trim() || "Eu",
    cobrador_perfil_id: document.getElementById("ctr-cobrador-perfil").value || null,
    tipo_cobranca: document.getElementById("ctr-tipo-cobranca").value,
    entidade_id: document.getElementById("ctr-entidade").value || null,
    observacoes: document.getElementById("ctr-obs").value.trim(),
  };

  let error;
  if (editandoId) {
    dadosOperacao.status = document.getElementById("ctr-status").value;
    dadosOperacao.numero_venda = document.getElementById("ctr-numero-venda").value.trim() || null;
    ({ error } = await supabaseClient.from("contratos").update(dadosOperacao).eq("id", editandoId));
  } else {
    msg.textContent = "Salvando e gerando parcelas...";
    msg.className = "form-msg";
    dadosOperacao.num_parcelas = parseInt(document.getElementById("ctr-parcelas").value);
    dadosOperacao.tipo_parcela = document.getElementById("ctr-tipo-parcela").value;
    dadosOperacao.data_venda = document.getElementById("ctr-data").value;
    ({ error } = await supabaseClient.from("contratos").insert(dadosOperacao));
  }

  if (error) {
    msg.textContent = "Erro: " + error.message;
    msg.className = "form-msg err";
    return;
  }
  msg.textContent = editandoId ? "Alterações salvas!" : "Operação salva! As parcelas já foram geradas sozinhas.";
  msg.className = "form-msg ok";
  e.target.reset();
  document.getElementById("ctr-data").value = new Date().toISOString().slice(0, 10);
  cancelarEdicaoOperacao();
});

function cancelarEdicaoOperacao() {
  document.getElementById("ctr-editando-id").value = "";
  document.getElementById("ctr-form-title").textContent = "Nova operação";
  document.getElementById("ctr-submit-btn").textContent = "Salvar operação";
  document.getElementById("ctr-cancelar-edicao").style.display = "none";
  document.getElementById("linha-status-operacao").style.display = "none";
  document.getElementById("ctr-parcelas").disabled = false;
  document.getElementById("ctr-tipo-parcela").disabled = false;
  document.getElementById("ctr-data").disabled = false;
  document.getElementById("bloco-parcelas-operacao").style.display = "none";
  document.getElementById("linha-numero-venda").style.display = "none";
}
document.getElementById("ctr-cancelar-edicao").addEventListener("click", () => {
  document.getElementById("form-contrato").reset();
  cancelarEdicaoOperacao();
});

async function editarOperacao(id) {
  const { data: o, error } = await supabaseClient.from("contratos").select("*").eq("id", id).single();
  if (error || !o) { alert("Não consegui carregar essa operação."); return; }

  await loadClientesNoSelect();
  await loadEstoqueNoSelect();
  await loadCobradoresNoSelect();

  document.getElementById("ctr-editando-id").value = o.id;
  document.getElementById("ctr-cliente").value = o.cliente_id;
  document.getElementById("ctr-tipo").value = o.tipo;
  document.getElementById("ctr-produto").value = o.produto || "";
  document.getElementById("ctr-numero-venda").value = o.numero_venda || "";
  document.getElementById("linha-numero-venda").style.display = "block";
  document.getElementById("ctr-categoria").value = o.categoria || "";
  document.getElementById("ctr-valor").value = o.valor_total;
  document.getElementById("ctr-custo").value = o.custo_produto || 0;
  document.getElementById("ctr-entrada").value = o.entrada || 0;
  document.getElementById("ctr-desconto").value = o.desconto || 0;
  document.getElementById("ctr-parcelas").value = o.num_parcelas;
  document.getElementById("ctr-tipo-parcela").value = o.tipo_parcela || "mensal";
  document.getElementById("ctr-data").value = o.data_venda;
  document.getElementById("ctr-garantia").value = o.garantia_dias || 0;
  document.getElementById("ctr-cobrador").value = o.cobrador || "Eu";
  document.getElementById("ctr-cobrador-perfil").value = o.cobrador_perfil_id || "";
  document.getElementById("ctr-obs").value = o.observacoes || "";
  document.getElementById("ctr-status").value = o.status;

  // parcelas já foram geradas — esses campos não mudam na edição
  document.getElementById("ctr-parcelas").disabled = true;
  document.getElementById("ctr-tipo-parcela").disabled = true;
  document.getElementById("ctr-data").disabled = true;

  document.getElementById("ctr-form-title").textContent = "Editar operação";
  document.getElementById("ctr-submit-btn").textContent = "Salvar alterações";
  document.getElementById("ctr-cancelar-edicao").style.display = "inline-block";
  document.getElementById("linha-status-operacao").style.display = "block";

  await carregarParcelasDaOperacao(o.id);

  tabs.forEach(t => t.classList.remove("active"));
  Object.entries(sections).forEach(([key, el]) => { el.style.display = key === "novo-contrato" ? "block" : "none"; });
}
window.editarOperacao = editarOperacao;

async function carregarParcelasDaOperacao(contratoId, idBloco = "bloco-parcelas-operacao", idLista = "lista-parcelas-operacao") {
  const bloco = document.getElementById(idBloco);
  const lista = document.getElementById(idLista);

  const { data: parcelas, error } = await supabaseClient
    .from("parcelas").select("*").eq("contrato_id", contratoId).order("numero");

  if (error || !parcelas || parcelas.length === 0) { bloco.style.display = "none"; return; }

  bloco.style.display = "block";
  lista.innerHTML = parcelas.map(p => `
    <div class="parcela-row" id="parcela-linha-${p.id}">
      <div class="who" style="flex:0 0 60px;"><div class="n">#${p.numero}</div></div>
      <input type="date" value="${p.vencimento}" id="parc-venc-${p.id}" style="padding:8px; border:1px solid var(--border); border-radius:var(--radius-sm);">
      <input type="number" step="0.01" value="${p.valor}" id="parc-valor-${p.id}" style="width:100px; padding:8px; border:1px solid var(--border); border-radius:var(--radius-sm);" placeholder="Valor total">
      <input type="number" step="0.01" value="${p.valor_pago || 0}" id="parc-pago-${p.id}" style="width:100px; padding:8px; border:1px solid var(--border); border-radius:var(--radius-sm);" placeholder="Já pago">
      <select id="parc-status-${p.id}" style="padding:8px; border:1px solid var(--border); border-radius:var(--radius-sm);">
        <option value="pendente" ${p.status === "pendente" ? "selected" : ""}>Pendente</option>
        <option value="parcial" ${p.status === "parcial" ? "selected" : ""}>Parcial</option>
        <option value="pago" ${p.status === "pago" ? "selected" : ""}>Pago</option>
        <option value="cancelada" ${p.status === "cancelada" ? "selected" : ""}>Cancelada</option>
      </select>
      <button class="btn-mini" type="button" onclick="salvarParcelaEditada('${p.id}')">💾</button>
    </div>
  `).join("");
}

async function salvarParcelaEditada(parcelaId) {
  const vencimento = document.getElementById(`parc-venc-${parcelaId}`).value;
  const valor = parseFloat(document.getElementById(`parc-valor-${parcelaId}`).value);
  const valorPago = parseFloat(document.getElementById(`parc-pago-${parcelaId}`).value || 0);
  const status = document.getElementById(`parc-status-${parcelaId}`).value;

  const dados = { vencimento, valor, valor_pago: valorPago, status };
  if (status === "pago") dados.data_pagamento = new Date().toISOString().slice(0, 10);
  if (status === "pendente") { dados.valor_pago = 0; dados.data_pagamento = null; }

  const { error } = await supabaseClient.from("parcelas").update(dados).eq("id", parcelaId);
  if (error) { alert("Erro: " + error.message); return; }
  alert("Parcela atualizada!");
  carregarParcelasDaOperacao(document.getElementById("ctr-editando-id").value);
}
window.salvarParcelaEditada = salvarParcelaEditada;

// ============================================================
// LISTA DE OPERAÇÕES (ver/editar tudo que já foi cadastrado)
// ============================================================
async function loadOperacoes() {
  const el = document.getElementById("lista-operacoes");
  el.innerHTML = `<div class="loading-line">Carregando...</div>`;

  const [{ data: operacoes, error }, { data: parcelas }] = await Promise.all([
    supabaseClient.from("operacoes_status").select("*").eq("excluido", false).order("data_venda", { ascending: false }),
    supabaseClient.from("parcelas").select("contrato_id,data_pagamento,status"),
  ]);

  if (error) {
    el.innerHTML = `<div class="loading-line">Erro: ${error.message}</div>`;
    return;
  }

  // último pagamento feito, calculado sozinho a partir das parcelas pagas
  const ultimoPagamentoPorContrato = {};
  (parcelas || []).forEach(p => {
    if (p.status !== "pago" || !p.data_pagamento) return;
    if (!ultimoPagamentoPorContrato[p.contrato_id] || p.data_pagamento > ultimoPagamentoPorContrato[p.contrato_id]) {
      ultimoPagamentoPorContrato[p.contrato_id] = p.data_pagamento;
    }
  });
  operacoes.forEach(o => { o.ultimo_pagamento = ultimoPagamentoPorContrato[o.id] || null; });

  // popula o filtro de anos com os anos que realmente existem nas operações
  const anos = [...new Set(operacoes.map(o => o.data_venda?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const selAno = document.getElementById("filtro-operacao-ano");
  const anoAtual = selAno.value;
  selAno.innerHTML = `<option value="todos">Todos os anos</option>` + anos.map(a => `<option value="${a}">${a}</option>`).join("");
  selAno.value = anoAtual || "todos";

  window.__operacoesCache = operacoes;
  renderOperacoes(operacoes);
}

const OP_STATUS_LABEL = { em_aberto: "Em aberto", agendado: "Agendado", pago: "Pago", cancelado: "Cancelado", acordo_feito: "Acordo feito", atrasado: "Atrasado" };

function renderOperacoes(operacoes) {
  const el = document.getElementById("lista-operacoes");
  const statusFiltro = document.getElementById("filtro-operacao-status").value;
  const clienteFiltro = document.getElementById("filtro-operacao-cliente").value.trim().toLowerCase();
  const mesFiltro = document.getElementById("filtro-operacao-mes").value;
  const anoFiltro = document.getElementById("filtro-operacao-ano").value;

  let filtradas = operacoes;
  if (statusFiltro !== "todos") filtradas = filtradas.filter(o => o.status_real === statusFiltro);
  if (clienteFiltro) filtradas = filtradas.filter(o =>
    o.cliente_nome.toLowerCase().includes(clienteFiltro) ||
    (o.cliente_codigo || "").toLowerCase().includes(clienteFiltro));
  if (anoFiltro !== "todos") filtradas = filtradas.filter(o => o.data_venda?.slice(0, 4) === anoFiltro);
  if (mesFiltro !== "todos") filtradas = filtradas.filter(o => String(parseInt(o.data_venda?.slice(5, 7)) - 1) === mesFiltro);

  if (filtradas.length === 0) {
    el.innerHTML = `<div class="empty-state">Nenhuma operação com esse filtro.</div>`;
    return;
  }

  el.innerHTML = filtradas.map(o => `
    <div class="ficha">
      <div class="ficha-body">
        <div class="ficha-top">
          <div style="display:flex; gap:12px; align-items:flex-start;">
            <div class="avatar-thumb" id="op-foto-${o.id}">${o.cliente_nome.charAt(0).toUpperCase()}</div>
            <div>
            <div class="ficha-nome">${o.cliente_nome} <span class="mono" style="font-weight:400; font-size:12px; color:var(--text-soft);">${o.cliente_codigo || ""}</span></div>
            <div class="ficha-meta">
              <span class="mono">${o.numero_venda || ""}</span> · ${o.produto || "Empréstimo"} · vendido em ${fmtData(o.data_venda)} · ${o.num_parcelas}x ${o.tipo_parcela || "mensal"}
            </div>
            <div class="ficha-meta">
              Total: ${fmtMoeda(o.valor_total)} · Parcela: ${fmtMoeda(o.valor_financiado / o.num_parcelas)} · Lucro estimado: ${fmtMoeda(o.lucro_estimado)} · Urgência: ${o.nivel_urgencia}
            </div>
            <div class="ficha-meta">
              ${o.proximo_vencimento ? "Próximo vencimento: " + fmtData(o.proximo_vencimento) : "Sem parcelas em aberto"}
              ${o.ultimo_pagamento ? " · Último pagamento: " + fmtData(o.ultimo_pagamento) : ""}
              ${o.entidade_nome ? " · " + o.entidade_nome : ""}
            </div>
            </div>
          </div>
          <span class="stamp stamp-${o.status_real}">${OP_STATUS_LABEL[o.status_real] || o.status_real}</span>
        </div>
        <div class="ficha-actions">
          <button class="btn-mini" onclick="editarOperacao('${o.id}')">✏️ Editar</button>
          <button class="btn-mini red" onclick="excluirRegistro('contratos','${o.id}', loadOperacoes)">🗑️ Excluir</button>
        </div>
      </div>
    </div>
  `).join("");

  filtradas.forEach(async (o) => {
    if (!o.cliente_foto_path) return;
    const { data } = await supabaseClient.storage.from("documentos-clientes").createSignedUrl(o.cliente_foto_path, 3600);
    const el = document.getElementById(`op-foto-${o.id}`);
    if (data && el) el.innerHTML = `<img src="${data.signedUrl}" alt="${o.cliente_nome}">`;
  });
}

document.getElementById("filtro-operacao-status").addEventListener("change", () => renderOperacoes(window.__operacoesCache || []));
document.getElementById("filtro-operacao-cliente").addEventListener("input", () => renderOperacoes(window.__operacoesCache || []));
document.getElementById("filtro-operacao-mes").addEventListener("change", () => renderOperacoes(window.__operacoesCache || []));
document.getElementById("filtro-operacao-ano").addEventListener("change", () => renderOperacoes(window.__operacoesCache || []));

// ============================================================
// MENSAGENS PRONTAS
// ============================================================
async function loadMensagens() {
  const el = document.getElementById("lista-mensagens");
  el.innerHTML = `<div class="loading-line">Carregando...</div>`;

  const { data: mensagens, error } = await supabaseClient
    .from("mensagens_modelo").select("*").order("created_at");

  if (error) {
    el.innerHTML = `<div class="loading-line">Erro: ${error.message}</div>`;
    return;
  }

  el.innerHTML = mensagens.map(m => `
    <div class="ficha">
      <div class="ficha-body">
        <div class="ficha-nome" style="margin-bottom:8px;">${m.nome}</div>
        <textarea class="form-row" style="width:100%; min-height:70px;" id="msg-texto-${m.id}">${m.texto}</textarea>
        ${(m.anexos && m.anexos.length > 0) ? `<div class="ficha-meta">${m.anexos.length} anexo(s): ${m.anexos.map((a, i) => `<button class="btn-mini" onclick="verDocumentoModal('${a}')">📎 ${i + 1}</button>`).join(" ")}</div>` : ""}
        <div class="ficha-actions">
          <button class="btn-mini" onclick="salvarMensagem('${m.id}')">💾 Salvar edição</button>
          <button class="btn-mini green" onclick="copiarMensagem('${m.id}')">📋 Copiar</button>
          <button class="btn-mini green" onclick="abrirModalEnviar('${m.id}')">📤 Enviar</button>
          <button class="btn-mini red" onclick="excluirMensagem('${m.id}')">🗑️ Excluir</button>
        </div>
      </div>
    </div>
  `).join("");
}

async function salvarMensagem(id) {
  const texto = document.getElementById(`msg-texto-${id}`).value;
  const { error } = await supabaseClient.from("mensagens_modelo").update({ texto }).eq("id", id);
  if (error) alert("Erro ao salvar: " + error.message);
  else alert("Mensagem atualizada!");
}
window.salvarMensagem = salvarMensagem;

function copiarMensagem(id) {
  const texto = document.getElementById(`msg-texto-${id}`).value;
  navigator.clipboard.writeText(texto).then(() => {
    alert("Mensagem copiada! Já pode colar na conversa.");
  });
}
window.copiarMensagem = copiarMensagem;

async function excluirMensagem(id) {
  if (!confirm("Excluir essa mensagem pronta?")) return;
  const { error } = await supabaseClient.from("mensagens_modelo").delete().eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  loadMensagens();
}
window.excluirMensagem = excluirMensagem;

document.getElementById("form-nova-mensagem").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("nmsg-msg");
  msg.textContent = "Salvando...";
  msg.className = "form-msg";

  const { data: nova, error } = await supabaseClient.from("mensagens_modelo").insert({
    nome: document.getElementById("nmsg-nome").value.trim(),
    texto: document.getElementById("nmsg-texto").value.trim(),
  }).select().single();
  if (error) { msg.textContent = "Erro: " + error.message; msg.className = "form-msg err"; return; }

  const arquivos = [...document.getElementById("nmsg-anexos").files];
  if (arquivos.length > 0 && nova) {
    msg.textContent = "Enviando anexos...";
    const caminhos = [];
    for (const arquivo of arquivos) {
      const caminho = `mensagens/${nova.id}/${Date.now()}-${arquivo.name}`;
      const { error: upErr } = await supabaseClient.storage.from("documentos-clientes").upload(caminho, arquivo);
      if (!upErr) caminhos.push(caminho);
    }
    if (caminhos.length > 0) {
      await supabaseClient.from("mensagens_modelo").update({ anexos: caminhos }).eq("id", nova.id);
    }
  }

  msg.textContent = "Mensagem adicionada!";
  msg.className = "form-msg ok";
  e.target.reset();
  loadMensagens();
});

// ============================================================
// ENVIAR MENSAGEM (abre o WhatsApp já com o texto pronto)
// ============================================================
let MENSAGEM_PARA_ENVIAR = null;

async function abrirModalEnviar(mensagemId) {
  MENSAGEM_PARA_ENVIAR = document.getElementById(`msg-texto-${mensagemId}`).value;
  const sel = document.getElementById("env-cliente");
  const { data: clientes } = await supabaseClient.from("clientes").select("id,nome,telefone").eq("excluido", false).order("nome");
  sel.innerHTML = `<option value="">— escolher da lista —</option>` +
    (clientes || []).filter(c => c.telefone).map(c => `<option value="${c.telefone}">${c.nome}</option>`).join("");
  document.getElementById("env-telefone").value = "";
  document.getElementById("modal-enviar-mensagem").style.display = "flex";
}
window.abrirModalEnviar = abrirModalEnviar;

function fecharModalEnviar() {
  document.getElementById("modal-enviar-mensagem").style.display = "none";
}
window.fecharModalEnviar = fecharModalEnviar;

document.getElementById("env-cliente").addEventListener("change", (e) => {
  if (e.target.value) document.getElementById("env-telefone").value = e.target.value;
});

function confirmarEnvioMensagem() {
  const telefone = document.getElementById("env-telefone").value.trim();
  if (!telefone) { alert("Escolhe um cliente ou digita um telefone."); return; }
  let digitos = telefone.replace(/\D/g, "");
  if (digitos.length <= 11) digitos = "55" + digitos;
  const link = `https://wa.me/${digitos}?text=${encodeURIComponent(MENSAGEM_PARA_ENVIAR)}`;
  window.open(link, "_blank");
  fecharModalEnviar();
}
window.confirmarEnvioMensagem = confirmarEnvioMensagem;

// ============================================================
// ACORDOS
// ============================================================
const ACORDO_LABEL = { atrasado: "Atrasado", hoje: "Vence hoje", pendente: "Pendente", pago: "Pago" };

async function loadAcordos() {
  const el = document.getElementById("lista-acordos");
  el.innerHTML = `<div class="loading-line">Carregando...</div>`;

  const { data: acordos, error } = await supabaseClient
    .from("acordos_status").select("*").eq("excluido", false).order("data_vencimento");

  if (error) {
    el.innerHTML = `<div class="loading-line">Erro: ${error.message}</div>`;
    return;
  }

  // estatísticas de inadimplência dos acordos
  const naoPagos = acordos.filter(a => a.status !== "pago");
  const atrasados = acordos.filter(a => a.status_real === "atrasado");
  const totalEmAberto = naoPagos.reduce((s, a) => s + Number(a.valor), 0);
  const inadimplenciaPct = totalEmAberto > 0
    ? (atrasados.reduce((s, a) => s + Number(a.valor), 0) / totalEmAberto) * 100
    : 0;

  document.getElementById("acordos-cards").innerHTML = `
    <div class="stat-card red">
      <div class="label">Acordos em atraso</div>
      <div class="value">${atrasados.length}</div>
    </div>
    <div class="stat-card amber">
      <div class="label">Inadimplência dos acordos</div>
      <div class="value">${inadimplenciaPct.toFixed(1)}%</div>
    </div>
    <div class="stat-card">
      <div class="label">Total em aberto</div>
      <div class="value">${fmtMoeda(totalEmAberto)}</div>
    </div>
  `;

  const anos = [...new Set(acordos.map(a => a.data_vencimento?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const selAno = document.getElementById("filtro-acordo-ano");
  const anoAtual = selAno.value;
  selAno.innerHTML = `<option value="todos">Todos os anos</option>` + anos.map(a => `<option value="${a}">${a}</option>`).join("");
  selAno.value = anoAtual || "todos";

  window.__acordosCache = acordos;
  renderAcordos(acordos);
}

function renderAcordos(acordos) {
  const el = document.getElementById("lista-acordos");
  const mesFiltro = document.getElementById("filtro-acordo-mes").value;
  const anoFiltro = document.getElementById("filtro-acordo-ano").value;

  let filtrados = acordos;
  if (anoFiltro !== "todos") filtrados = filtrados.filter(a => a.data_vencimento?.slice(0, 4) === anoFiltro);
  if (mesFiltro !== "todos") filtrados = filtrados.filter(a => String(parseInt(a.data_vencimento?.slice(5, 7)) - 1) === mesFiltro);

  if (filtrados.length === 0) {
    el.innerHTML = `<div class="empty-state">Nenhum acordo com esse filtro.</div>`;
    return;
  }

  el.innerHTML = filtrados.map(a => `
    <div class="ficha">
      <div class="ficha-body">
        <div class="ficha-top">
          <div>
            <div class="ficha-nome">${a.cliente_nome} <span class="mono" style="font-weight:400; font-size:12px; color:var(--text-soft);">${a.cliente_codigo || ""}</span></div>
            <div class="ficha-meta">
              Acordo em ${fmtData(a.data_acordo)} · vence ${fmtData(a.data_vencimento)} · ${fmtMoeda(a.valor)}
            </div>
          </div>
          <span class="stamp stamp-${a.status_real === "hoje" ? "agendado" : a.status_real}">${ACORDO_LABEL[a.status_real] || a.status_real}</span>
        </div>
        ${a.status !== "pago" ? `<div class="ficha-actions"><button class="btn-mini" onclick="editarAcordo('${a.id}')">✏️ Editar</button> <button class="btn-mini green" onclick="marcarAcordoPago('${a.id}')">Marcar pago</button> <button class="btn-mini red" onclick="excluirRegistro('acordos','${a.id}', loadAcordos)">🗑️ Excluir</button></div>` : `<div class="ficha-actions"><button class="btn-mini" onclick="editarAcordo('${a.id}')">✏️ Editar</button> <button class="btn-mini red" onclick="excluirRegistro('acordos','${a.id}', loadAcordos)">🗑️ Excluir</button></div>`}
      </div>
    </div>
  `).join("");
}

document.getElementById("filtro-acordo-mes").addEventListener("change", () => renderAcordos(window.__acordosCache || []));
document.getElementById("filtro-acordo-ano").addEventListener("change", () => renderAcordos(window.__acordosCache || []));

async function marcarAcordoPago(id) {
  const { error } = await supabaseClient.from("acordos").update({ status: "pago" }).eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  loadAcordos();
}
window.marcarAcordoPago = marcarAcordoPago;

async function loadClientesNoSelectAcordo() {
  const sel = document.getElementById("acr-cliente");
  const { data: clientes, error } = await supabaseClient.from("clientes").select("id,nome").order("nome");
  if (error) return;
  sel.innerHTML = clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join("");
}

async function loadContratosNoSelectAcordo() {
  const sel = document.getElementById("acr-contrato");
  const { data: operacoes, error } = await supabaseClient
    .from("operacoes_status").select("id,produto,cliente_nome").neq("status", "pago");
  if (error) return;
  sel.innerHTML = `<option value="">— nenhuma —</option>` +
    operacoes.map(o => `<option value="${o.id}">${o.cliente_nome} — ${o.produto || "Empréstimo"}</option>`).join("");
}

document.getElementById("acr-data-acordo").value = new Date().toISOString().slice(0, 10);

document.getElementById("acr-tipo-acordo").addEventListener("change", (e) => {
  document.getElementById("linha-acr-num-parcelas").style.display = e.target.value === "parcelado" ? "block" : "none";
});

document.getElementById("form-acordo").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("acr-msg");
  msg.textContent = "Salvando...";
  msg.className = "form-msg";

  const editandoId = document.getElementById("acr-editando-id").value;
  const tipoAcordo = document.getElementById("acr-tipo-acordo").value;
  const numParcelas = parseInt(document.getElementById("acr-num-parcelas").value || 2);
  let contratoId = document.getElementById("acr-contrato").value || null;

  // acordo parcelado sem operação ligada ainda -> cria a operação sozinha, com as parcelas
  if (tipoAcordo === "parcelado" && !editandoId) {
    const { data: novaOperacao, error: opErr } = await supabaseClient.from("contratos").insert({
      cliente_id: document.getElementById("acr-cliente").value,
      tipo: "acordo",
      produto: "Acordo parcelado",
      valor_total: parseFloat(document.getElementById("acr-valor").value),
      custo_produto: 0,
      entrada: 0,
      desconto: 0,
      num_parcelas: numParcelas,
      tipo_parcela: "mensal",
      data_venda: document.getElementById("acr-data-acordo").value,
      garantia_dias: 0,
      cobrador: "Eu",
      status: "em_aberto",
    }).select().single();

    if (opErr) { msg.textContent = "Erro ao criar a operação do acordo: " + opErr.message; msg.className = "form-msg err"; return; }
    contratoId = novaOperacao.id;
  }

  const dadosAcordo = {
    cliente_id: document.getElementById("acr-cliente").value,
    contrato_id: contratoId,
    data_acordo: document.getElementById("acr-data-acordo").value,
    data_vencimento: document.getElementById("acr-data-vencimento").value,
    valor: parseFloat(document.getElementById("acr-valor").value),
    tipo_acordo: tipoAcordo,
    num_parcelas: numParcelas,
    entidade_id: document.getElementById("acr-entidade").value || null,
    observacoes: document.getElementById("acr-obs").value.trim(),
    entidade_id: document.getElementById("acr-entidade").value || null,
  };

  let error;
  if (editandoId) {
    dadosAcordo.status = document.getElementById("acr-status").value;
    ({ error } = await supabaseClient.from("acordos").update(dadosAcordo).eq("id", editandoId));
  } else {
    ({ error } = await supabaseClient.from("acordos").insert(dadosAcordo));
  }

  if (error) {
    msg.textContent = "Erro: " + error.message;
    msg.className = "form-msg err";
    return;
  }
  msg.textContent = editandoId
    ? "Alterações salvas!"
    : (tipoAcordo === "parcelado" ? "Acordo salvo! Já criei a operação com as parcelas na aba Operações." : "Acordo salvo!");
  msg.className = "form-msg ok";
  e.target.reset();
  document.getElementById("acr-data-acordo").value = new Date().toISOString().slice(0, 10);
  cancelarEdicaoAcordo();
});

function cancelarEdicaoAcordo() {
  document.getElementById("acr-editando-id").value = "";
  document.getElementById("acr-form-title").textContent = "Novo acordo";
  document.getElementById("acr-submit-btn").textContent = "Salvar acordo";
  document.getElementById("acr-cancelar-edicao").style.display = "none";
  document.getElementById("bloco-parcelas-acordo").style.display = "none";
  document.getElementById("acr-aviso-parcelado").style.display = "none";
}
document.getElementById("acr-cancelar-edicao").addEventListener("click", () => {
  document.getElementById("form-acordo").reset();
  cancelarEdicaoAcordo();
});

async function editarAcordo(id) {
  const { data: a, error } = await supabaseClient.from("acordos").select("*").eq("id", id).single();
  if (error || !a) { alert("Não consegui carregar esse acordo."); return; }

  await loadClientesNoSelectAcordo();
  await loadContratosNoSelectAcordo();

  document.getElementById("acr-editando-id").value = a.id;
  document.getElementById("acr-cliente").value = a.cliente_id;
  document.getElementById("acr-contrato").value = a.contrato_id || "";
  document.getElementById("acr-data-acordo").value = a.data_acordo;
  document.getElementById("acr-data-vencimento").value = a.data_vencimento;
  document.getElementById("acr-valor").value = a.valor;
  document.getElementById("acr-status").value = a.status;
  await loadEntidadesNoSelect("acr-entidade");
  document.getElementById("acr-entidade").value = a.entidade_id || "";
  document.getElementById("acr-obs").value = a.observacoes || "";
  document.getElementById("acr-tipo-acordo").value = a.tipo_acordo || "normal";
  document.getElementById("acr-num-parcelas").value = a.num_parcelas || 2;
  document.getElementById("linha-acr-num-parcelas").style.display = a.tipo_acordo === "parcelado" ? "block" : "none";

  const aviso = document.getElementById("acr-aviso-parcelado");
  if (a.tipo_acordo === "parcelado" && a.contrato_id) {
    aviso.style.display = "block";
    aviso.innerHTML = `As parcelas desse acordo estão editáveis logo abaixo do formulário.`;
    await carregarParcelasDaOperacao(a.contrato_id, "bloco-parcelas-acordo", "lista-parcelas-acordo");
  } else {
    aviso.style.display = "none";
    document.getElementById("bloco-parcelas-acordo").style.display = "none";
  }

  document.getElementById("acr-form-title").textContent = "Editar acordo";
  document.getElementById("acr-submit-btn").textContent = "Salvar alterações";
  document.getElementById("acr-cancelar-edicao").style.display = "inline-block";

  tabs.forEach(t => t.classList.remove("active"));
  Object.entries(sections).forEach(([key, el]) => { el.style.display = key === "novo-acordo" ? "block" : "none"; });
}
window.editarAcordo = editarAcordo;

// ============================================================
// PF / PJ (ENTIDADES)
// ============================================================
const ENTIDADE_LABEL = { pf: "Pessoa Física", mei: "MEI", pj: "PJ" };

async function loadEntidades() {
  const el = document.getElementById("lista-entidades");
  el.innerHTML = `<div class="loading-line">Carregando...</div>`;

  const [{ data, error }, { data: movs }, { data: operacoes }] = await Promise.all([
    supabaseClient.from("entidades").select("*").order("created_at"),
    supabaseClient.from("movimentacoes").select("entidade_id,tipo,valor,data"),
    supabaseClient.from("operacoes_status").select("entidade_id"),
  ]);

  if (error) { el.innerHTML = `<div class="loading-line">Erro: ${error.message}</div>`; return; }
  if (data.length === 0) { el.innerHTML = `<div class="empty-state">Nenhuma PF/PJ cadastrada ainda.</div>`; return; }

  const mesAtual = new Date().toISOString().slice(0, 7);
  el.innerHTML = data.map(e => {
    const movsDela = (movs || []).filter(m => m.entidade_id === e.id);
    const entradasMes = movsDela.filter(m => m.tipo === "entrada" && m.data?.slice(0, 7) === mesAtual).reduce((s, m) => s + Number(m.valor), 0);
    const saidasMes = movsDela.filter(m => m.tipo === "saida" && m.data?.slice(0, 7) === mesAtual).reduce((s, m) => s + Number(m.valor), 0);
    const impostoEstimado = entradasMes * (Number(e.aliquota_imposto || 0) / 100);
    const numOperacoes = (operacoes || []).filter(o => o.entidade_id === e.id).length;

    return `
    <div class="ficha">
      <div class="ficha-body">
        <div class="ficha-top">
          <div>
            <div class="ficha-nome">${e.nome_identificacao}</div>
            <div class="ficha-meta">${e.documento || "sem documento"} ${e.cnaes && e.cnaes.length ? " · CNAEs: " + e.cnaes.join(", ") : ""}</div>
          </div>
          <span class="stamp stamp-ativo">${ENTIDADE_LABEL[e.tipo]}</span>
        </div>
        <div class="grid-cards" style="margin-top:12px; gap:8px;">
          <div class="stat-card" style="padding:10px;">
            <div class="label" style="font-size:10.5px;">Entradas este mês</div>
            <div class="value" style="font-size:16px;">${fmtMoeda(entradasMes)}</div>
          </div>
          <div class="stat-card" style="padding:10px;">
            <div class="label" style="font-size:10.5px;">Saídas este mês</div>
            <div class="value" style="font-size:16px;">${fmtMoeda(saidasMes)}</div>
          </div>
          <div class="stat-card amber" style="padding:10px;">
            <div class="label" style="font-size:10.5px;">Imposto estimado (${e.aliquota_imposto || 0}%)</div>
            <div class="value" style="font-size:16px;">${fmtMoeda(impostoEstimado)}</div>
          </div>
          <div class="stat-card" style="padding:10px;">
            <div class="label" style="font-size:10.5px;">Operações vinculadas</div>
            <div class="value" style="font-size:16px;">${numOperacoes}</div>
          </div>
        </div>
        <div class="ficha-actions">
          <button class="btn-mini" onclick="editarEntidade('${e.id}')">✏️ Editar</button>
        </div>
      </div>
    </div>
  `;
  }).join("");
}

document.getElementById("ent-tipo").addEventListener("change", (e) => {
  document.getElementById("linha-cnae").style.display = e.target.value === "pf" ? "none" : "block";
  document.getElementById("linha-aliquota").style.display = e.target.value === "pf" ? "none" : "block";
});

// ---- CNAEs dinâmicos (adicionar/remover quantos quiser) ----
function adicionarCampoCnae(valor = "") {
  const container = document.getElementById("lista-cnaes-form");
  const linha = document.createElement("div");
  linha.style.cssText = "display:flex; gap:8px; margin-bottom:8px;";
  linha.innerHTML = `
    <input type="text" class="ent-cnae-input" value="${valor}" placeholder="Ex: 6462-0/00" style="flex:1; padding:10px 12px; border:1px solid var(--border); border-radius:var(--radius-sm);">
    <button type="button" class="btn-mini red" onclick="this.parentElement.remove()">🗑️</button>
  `;
  container.appendChild(linha);
}
window.adicionarCampoCnae = adicionarCampoCnae;

function pegarCnaesDoForm() {
  return [...document.querySelectorAll(".ent-cnae-input")].map(i => i.value.trim()).filter(Boolean);
}

document.getElementById("form-entidade").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("ent-msg");
  const editandoId = document.getElementById("ent-editando-id").value;
  const dadosEntidade = {
    tipo: document.getElementById("ent-tipo").value,
    nome_identificacao: document.getElementById("ent-nome").value.trim(),
    documento: document.getElementById("ent-documento").value.trim() || null,
    cnaes: pegarCnaesDoForm(),
    aliquota_imposto: parseFloat(document.getElementById("ent-aliquota").value || 0),
  };
  let error;
  if (editandoId) {
    ({ error } = await supabaseClient.from("entidades").update(dadosEntidade).eq("id", editandoId));
  } else {
    ({ error } = await supabaseClient.from("entidades").insert(dadosEntidade));
  }
  if (error) { msg.textContent = "Erro: " + error.message; msg.className = "form-msg err"; return; }
  msg.textContent = editandoId ? "Alterações salvas!" : "Salvo!";
  msg.className = "form-msg ok";
  e.target.reset();
  document.getElementById("lista-cnaes-form").innerHTML = "";
  cancelarEdicaoEntidade();
});

function cancelarEdicaoEntidade() {
  document.getElementById("ent-editando-id").value = "";
  document.getElementById("ent-form-title").textContent = "Nova PF/PJ";
  document.getElementById("ent-submit-btn").textContent = "Salvar";
  document.getElementById("ent-cancelar-edicao").style.display = "none";
}
document.getElementById("ent-cancelar-edicao").addEventListener("click", () => {
  document.getElementById("form-entidade").reset();
  cancelarEdicaoEntidade();
});

async function editarEntidade(id) {
  const { data: e, error } = await supabaseClient.from("entidades").select("*").eq("id", id).single();
  if (error || !e) { alert("Não consegui carregar essa PF/PJ."); return; }

  document.getElementById("ent-editando-id").value = e.id;
  document.getElementById("ent-tipo").value = e.tipo;
  document.getElementById("ent-nome").value = e.nome_identificacao || "";
  document.getElementById("ent-documento").value = e.documento || "";
  document.getElementById("linha-cnae").style.display = e.tipo === "pf" ? "none" : "block";
  document.getElementById("linha-aliquota").style.display = e.tipo === "pf" ? "none" : "block";
  document.getElementById("ent-aliquota").value = e.aliquota_imposto || "";
  document.getElementById("lista-cnaes-form").innerHTML = "";
  (e.cnaes || []).forEach(c => adicionarCampoCnae(c));

  document.getElementById("ent-form-title").textContent = "Editar PF/PJ";
  document.getElementById("ent-submit-btn").textContent = "Salvar alterações";
  document.getElementById("ent-cancelar-edicao").style.display = "inline-block";

  tabs.forEach(t => t.classList.remove("active"));
  Object.entries(sections).forEach(([key, el]) => { el.style.display = key === "nova-entidade" ? "block" : "none"; });
}
window.editarEntidade = editarEntidade;

async function loadEntidadesNoSelect(idSelect = "ctr-entidade") {
  const sel = document.getElementById(idSelect);
  if (!sel) return;
  const { data, error } = await supabaseClient.from("entidades").select("id,nome_identificacao").order("nome_identificacao");
  if (error) return;
  sel.innerHTML = `<option value="" disabled ${!sel.value ? "selected" : ""}>— escolha uma PF/PJ —</option>` +
    data.map(e => `<option value="${e.id}">${e.nome_identificacao}</option>`).join("");
}

async function loadEntidadesNoSelectMov() {
  return loadEntidadesNoSelect("mov-entidade");
}

// ============================================================
// FINANCEIRO — LANÇAMENTO MANUAL
// ============================================================
document.getElementById("mov-data").value = new Date().toISOString().slice(0, 10);

// ---- botões de forma de pagamento (clicável, extensível) ----
async function carregarBotoesFormaPagamento() {
  const { data } = await supabaseClient.from("formas_pagamento").select("*").order("nome");
  renderBotoesFormaPagamento(data || []);
}

function renderBotoesFormaPagamento(formas) {
  const container = document.getElementById("botoes-forma-pagamento");
  const atual = document.getElementById("mov-forma-pagamento").value;
  container.innerHTML = formas.map(f => `
    <button type="button" class="btn-mini ${f.nome === atual ? "green" : ""}" onclick="selecionarFormaPagamento('${f.nome.replace(/'/g, "\\'")}')">${f.nome}</button>
  `).join("") + `<button type="button" class="btn-mini" onclick="adicionarFormaPagamento()">+ Nova</button>`;
}

function selecionarFormaPagamento(nome) {
  document.getElementById("mov-forma-pagamento").value = nome;
  carregarBotoesFormaPagamento();
}
window.selecionarFormaPagamento = selecionarFormaPagamento;

async function adicionarFormaPagamento() {
  const nome = prompt("Nome da nova forma de pagamento (ex: Vale, Transferência):");
  if (!nome || !nome.trim()) return;
  const { error } = await supabaseClient.from("formas_pagamento").insert({ nome: nome.trim() });
  if (error) { alert("Erro: " + error.message); return; }
  selecionarFormaPagamento(nome.trim());
}
window.adicionarFormaPagamento = adicionarFormaPagamento;

carregarBotoesFormaPagamento();

document.getElementById("form-movimentacao").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("mov-msg");
  const editandoId = document.getElementById("mov-editando-id").value;

  const dadosMov = {
    tipo: document.getElementById("mov-tipo").value,
    valor: parseFloat(document.getElementById("mov-valor").value),
    data: document.getElementById("mov-data").value,
    hora: document.getElementById("mov-hora").value || null,
    categoria: document.getElementById("mov-categoria").value.trim() || null,
    forma_pagamento: document.getElementById("mov-forma-pagamento").value.trim() || null,
    conta: document.getElementById("mov-conta").value.trim() || null,
    entidade_id: document.getElementById("mov-entidade").value || null,
    descricao: document.getElementById("mov-descricao").value.trim() || null,
  };

  let error, movSalva;
  if (editandoId) {
    ({ error } = await supabaseClient.from("movimentacoes").update(dadosMov).eq("id", editandoId));
    movSalva = { ...dadosMov, id: editandoId };
  } else {
    dadosMov.origem_tipo = "manual";
    const { data, error: insErr } = await supabaseClient.from("movimentacoes").insert(dadosMov).select().single();
    error = insErr;
    movSalva = data;
  }

  if (error) { msg.textContent = "Erro: " + error.message; msg.className = "form-msg err"; return; }

  // se essa movimentação veio de outro lugar (operação/parcela/produto), sincroniza o valor de volta
  if (editandoId) {
    const { data: origem } = await supabaseClient.from("movimentacoes").select("origem_tipo,origem_id").eq("id", editandoId).single();
    if (origem?.origem_tipo === "contrato" && origem.origem_id) {
      await supabaseClient.from("contratos").update({ entrada: dadosMov.valor }).eq("id", origem.origem_id);
    } else if (origem?.origem_tipo === "parcela" && origem.origem_id) {
      await supabaseClient.from("parcelas").update({ valor: dadosMov.valor }).eq("id", origem.origem_id);
    } else if (origem?.origem_tipo === "produto" && origem.origem_id) {
      await supabaseClient.from("produtos").update({ custo: dadosMov.valor }).eq("id", origem.origem_id);
    }
  }

  msg.textContent = editandoId ? "Alterações salvas!" : "Lançado!";
  msg.className = "form-msg ok";
  cancelarEdicaoMovimentacao();
  loadFinanceiro();
});

function cancelarEdicaoMovimentacao() {
  document.getElementById("form-movimentacao").reset();
  document.getElementById("mov-editando-id").value = "";
  document.getElementById("mov-form-title").textContent = "Lançar movimentação manual";
  document.getElementById("mov-submit-btn").textContent = "Lançar movimentação";
  document.getElementById("mov-cancelar-edicao").style.display = "none";
  document.getElementById("mov-data").value = new Date().toISOString().slice(0, 10);
}
document.getElementById("mov-cancelar-edicao").addEventListener("click", cancelarEdicaoMovimentacao);

// ============================================================
// ESTOQUE — EDITAR PRODUTO
// ============================================================
async function editarProduto(id) {
  const { data: p, error } = await supabaseClient.from("produtos").select("*").eq("id", id).single();
  if (error || !p) { alert("Não consegui carregar esse produto."); return; }

  document.getElementById("prd-editando-id").value = p.id;
  document.getElementById("prd-produto").value = p.produto || "";
  document.getElementById("prd-categoria").value = p.categoria || "";
  document.getElementById("prd-ticket").value = p.ticket || "medio";
  document.getElementById("prd-custo").value = p.custo || 0;
  document.getElementById("prd-markup").value = p.markup_percent || "";
  document.getElementById("prd-garantia").value = p.garantia_dias || 0;
  document.getElementById("prd-data").value = p.data_aquisicao;
  document.getElementById("prd-status").value = p.status;
  document.getElementById("prd-origem").value = p.origem || "estoque";
  document.getElementById("prd-link").value = p.link || "";
  document.getElementById("prd-video").value = p.video_link || "";
  document.getElementById("prd-descricao").value = p.descricao || "";

  document.getElementById("prd-form-title").textContent = "Editar produto";
  document.getElementById("prd-submit-btn").textContent = "Salvar alterações";
  document.getElementById("prd-cancelar-edicao").style.display = "inline-block";

  tabs.forEach(t => t.classList.remove("active"));
  Object.entries(sections).forEach(([key, el]) => { el.style.display = key === "novo-produto" ? "block" : "none"; });
}
window.editarProduto = editarProduto;

document.getElementById("prd-cancelar-edicao")?.addEventListener("click", () => {
  document.getElementById("form-produto").reset();
  document.getElementById("prd-editando-id").value = "";
  document.getElementById("prd-form-title").textContent = "Novo produto no estoque";
  document.getElementById("prd-submit-btn").textContent = "Salvar produto";
  document.getElementById("prd-cancelar-edicao").style.display = "none";
});

// ============================================================
// VISUALIZADOR DE DOCUMENTOS EM TELA CHEIA (não sai do site)
// ============================================================
async function verDocumentoModal(caminho) {
  const { data, error } = await supabaseClient.storage.from("documentos-clientes").createSignedUrl(caminho, 3600);
  if (error || !data) { alert("Não consegui abrir esse arquivo: " + (error?.message || "erro desconhecido")); return; }

  const ehImagem = /\.(jpe?g|png|gif|webp)$/i.test(caminho);
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed; inset:0; background:rgba(16,24,40,0.85); z-index:9999; display:flex; align-items:center; justify-content:center; padding:24px;";
  overlay.innerHTML = `
    <button style="position:absolute; top:20px; right:24px; background:#fff; border:none; border-radius:50%; width:40px; height:40px; font-size:20px; cursor:pointer;">✕</button>
    ${ehImagem
      ? `<img src="${data.signedUrl}" style="max-width:100%; max-height:100%; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.4);">`
      : `<iframe src="${data.signedUrl}" style="width:90vw; height:90vh; border:none; border-radius:8px; background:#fff;"></iframe>`}
  `;
  overlay.querySelector("button").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}
window.verDocumentoModal = verDocumentoModal;

function linkGoogleMaps(endereco) {
  if (!endereco) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
}
window.linkGoogleMaps = linkGoogleMaps;

// ============================================================
// EQUIPE (login por pessoa, papel de acesso)
// ============================================================
async function loadEquipe() {
  const el = document.getElementById("lista-equipe");
  el.innerHTML = `<div class="loading-line">Carregando...</div>`;

  const [{ data: perfis, error }, { data: parcelas }] = await Promise.all([
    supabaseClient.from("perfis").select("*").order("nome"),
    supabaseClient.from("parcelas_status").select("*"),
  ]);

  if (error) { el.innerHTML = `<div class="loading-line">Erro: ${error.message}</div>`; return; }
  if (!perfis || perfis.length === 0) { el.innerHTML = `<div class="empty-state">Nenhum acesso encontrado.</div>`; return; }

  const { data: contratosComCobrador } = await supabaseClient.from("operacoes_status").select("id,cobrador_perfil_id");
  const mesAtual = new Date().toISOString().slice(0, 7);

  el.innerHTML = perfis.map(p => {
    const contratosDoCobrador = (contratosComCobrador || []).filter(c => c.cobrador_perfil_id === p.id).map(c => c.id);
    const parcelasDele = (parcelas || []).filter(pa => contratosDoCobrador.includes(pa.contrato_id));
    const emAberto = parcelasDele.filter(pa => ["pendente", "parcial"].includes(pa.status)).length;
    const emAtraso = parcelasDele.filter(pa => pa.status_real === "atrasado").length;
    const cobradoEsteMes = parcelasDele.filter(pa => pa.status === "pago" && pa.data_pagamento?.slice(0, 7) === mesAtual)
      .reduce((s, pa) => s + Number(pa.valor), 0);

    return `
    <div class="ficha">
      <div class="ficha-top">
        <div>
          <div class="ficha-nome">${p.nome}</div>
          <div class="ficha-meta">${p.id === CURRENT_USER.id ? "(seu login) · " : ""}
            ${p.papel === "cobrador" ? `${emAberto} parcelas na rota · ${emAtraso} em atraso · cobrado este mês: ${fmtMoeda(cobradoEsteMes)}` : "Acesso completo ao sistema"}
          </div>
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          <span class="stamp stamp-${p.papel === "admin" ? "ativo" : "em_aberto"}">${p.papel === "admin" ? "Admin" : "Cobrador"}</span>
          ${p.id !== CURRENT_USER.id ? `
            <button class="btn-mini" onclick="renomearPerfil('${p.id}', '${(p.nome || "").replace(/'/g, "\\'")}')">Renomear</button>
            <button class="btn-mini" onclick="mudarPapel('${p.id}', '${p.papel === "admin" ? "cobrador" : "admin"}')">
              Marcar como ${p.papel === "admin" ? "cobrador" : "admin"}
            </button>` : ""}
        </div>
      </div>
    </div>
  `;
  }).join("");
}

async function renomearPerfil(id, nomeAtual) {
  const novo = prompt("Nome dessa pessoa (pra aparecer no sistema):", nomeAtual);
  if (!novo || !novo.trim()) return;
  const { error } = await supabaseClient.from("perfis").update({ nome: novo.trim() }).eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  loadEquipe();
}
window.renomearPerfil = renomearPerfil;

// ============================================================
// FUNCIONÁRIOS (ficha de RH, diferente de login/acesso)
// ============================================================
document.getElementById("fnc-data-entrada").value = new Date().toISOString().slice(0, 10);

async function loadFuncionarios() {
  const el = document.getElementById("lista-funcionarios");
  el.innerHTML = `<div class="loading-line">Carregando...</div>`;

  const { data, error } = await supabaseClient.from("funcionarios").select("*").eq("excluido", false).order("nome");
  if (error) { el.innerHTML = `<div class="loading-line">Erro: ${error.message}</div>`; return; }
  if (!data || data.length === 0) { el.innerHTML = `<div class="empty-state">Nenhum funcionário cadastrado ainda.</div>`; return; }

  const hoje = new Date().toISOString().slice(0, 10);
  el.innerHTML = data.map(f => {
    const saidaProxima = f.data_saida_prevista && f.data_saida_prevista <= hoje;
    return `
    <div class="ficha">
      <div class="ficha-top">
        <div>
          <div class="ficha-nome">${f.nome}</div>
          <div class="ficha-meta">
            ${f.vinculo === "clt" ? "CLT" : "Informal"} ${f.salario ? " · " + fmtMoeda(f.salario) : ""} · desde ${fmtData(f.data_entrada)}
            ${f.data_saida_prevista ? " · saída prevista: " + fmtData(f.data_saida_prevista) : ""}
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          ${saidaProxima ? `<span class="stamp stamp-atrasado">Saída prevista</span>` : ""}
          <button class="btn-mini" onclick="editarFuncionario('${f.id}')">✏️ Editar</button>
          <button class="btn-mini red" onclick="excluirRegistro('funcionarios','${f.id}', loadFuncionarios)">🗑️ Excluir</button>
        </div>
      </div>
    </div>
  `;
  }).join("");
}

document.getElementById("form-funcionario").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("fnc-msg");
  const editandoId = document.getElementById("fnc-editando-id").value;
  const dados = {
    nome: document.getElementById("fnc-nome").value.trim(),
    salario: document.getElementById("fnc-salario").value ? parseFloat(document.getElementById("fnc-salario").value) : null,
    vinculo: document.getElementById("fnc-vinculo").value,
    data_entrada: document.getElementById("fnc-data-entrada").value || null,
    data_saida_prevista: document.getElementById("fnc-data-saida").value || null,
    observacoes: document.getElementById("fnc-obs").value.trim(),
  };
  let error;
  if (editandoId) {
    ({ error } = await supabaseClient.from("funcionarios").update(dados).eq("id", editandoId));
  } else {
    ({ error } = await supabaseClient.from("funcionarios").insert(dados));
  }
  if (error) { msg.textContent = "Erro: " + error.message; msg.className = "form-msg err"; return; }
  msg.textContent = editandoId ? "Alterações salvas!" : "Funcionário salvo!";
  msg.className = "form-msg ok";
  e.target.reset();
  document.getElementById("fnc-data-entrada").value = new Date().toISOString().slice(0, 10);
  cancelarEdicaoFuncionario();
  loadFuncionarios();
});

function cancelarEdicaoFuncionario() {
  document.getElementById("fnc-editando-id").value = "";
  document.getElementById("fnc-submit-btn").textContent = "Salvar funcionário";
  document.getElementById("fnc-cancelar-edicao").style.display = "none";
}
document.getElementById("fnc-cancelar-edicao").addEventListener("click", () => {
  document.getElementById("form-funcionario").reset();
  cancelarEdicaoFuncionario();
});

async function editarFuncionario(id) {
  const { data: f, error } = await supabaseClient.from("funcionarios").select("*").eq("id", id).single();
  if (error || !f) { alert("Não consegui carregar."); return; }
  document.getElementById("fnc-editando-id").value = f.id;
  document.getElementById("fnc-nome").value = f.nome || "";
  document.getElementById("fnc-salario").value = f.salario || "";
  document.getElementById("fnc-vinculo").value = f.vinculo || "informal";
  document.getElementById("fnc-data-entrada").value = f.data_entrada || "";
  document.getElementById("fnc-data-saida").value = f.data_saida_prevista || "";
  document.getElementById("fnc-obs").value = f.observacoes || "";
  document.getElementById("fnc-submit-btn").textContent = "Salvar alterações";
  document.getElementById("fnc-cancelar-edicao").style.display = "inline-block";
}
window.editarFuncionario = editarFuncionario;

async function mudarPapel(id, novoPapel) {
  if (!confirm(`Mudar essa pessoa pra "${novoPapel}"?`)) return;
  const { error } = await supabaseClient.from("perfis").update({ papel: novoPapel }).eq("id", id);
  if (error) { alert("Erro: " + error.message); return; }
  loadEquipe();
}
window.mudarPapel = mudarPapel;

async function loadCobradoresNoSelect() {
  const sel = document.getElementById("ctr-cobrador-perfil");
  const { data, error } = await supabaseClient.from("perfis").select("id,nome").eq("papel", "cobrador").order("nome");
  if (error) return;
  sel.innerHTML = `<option value="">— sem atribuição, só eu vejo —</option>` +
    (data || []).map(p => `<option value="${p.id}">${p.nome}</option>`).join("");
}

// ============================================================
// REGISTRAR TENTATIVA DE COBRANÇA (rota de cobrança)
// ============================================================
function abrirModalTentativa(parcelaId) {
  document.getElementById("tnt-parcela-id").value = parcelaId;
  document.getElementById("tnt-resultado").value = "prometeu_pagar";
  document.getElementById("tnt-observacao").value = "";
  document.getElementById("modal-tentativa").style.display = "flex";
}
window.abrirModalTentativa = abrirModalTentativa;

function fecharModalTentativa() {
  document.getElementById("modal-tentativa").style.display = "none";
}
window.fecharModalTentativa = fecharModalTentativa;

async function salvarTentativa() {
  const parcelaId = document.getElementById("tnt-parcela-id").value;
  const { error } = await supabaseClient.from("tentativas_cobranca").insert({
    parcela_id: parcelaId,
    cobrador_id: CURRENT_USER.id,
    resultado: document.getElementById("tnt-resultado").value,
    observacao: document.getElementById("tnt-observacao").value.trim() || null,
  });
  if (error) { alert("Erro: " + error.message); return; }
  fecharModalTentativa();
  alert("Tentativa registrada!");
}
window.salvarTentativa = salvarTentativa;

function abrirMapaEndereco() {
  const endereco = document.getElementById("cli-endereco").value.trim();
  if (!endereco) { alert("Escreve o endereço primeiro."); return; }
  window.open(linkGoogleMaps(endereco), "_blank");
}
window.abrirMapaEndereco = abrirMapaEndereco;
