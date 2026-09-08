// ==================================================================
// Views — renderização de cada módulo do app.html
// ==================================================================

let CACHE_CLIENTES = [];
let CACHE_VEICULOS = [];

function opcoesClientes() {
  return CACHE_CLIENTES.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
}
function opcoesVeiculos(lista) {
  return lista.map(v => `<option value="${v.id}">${v.placa} — ${v.modelo}</option>`).join('');
}
function rotuloStatusVeiculo(s) {
  return { disponivel: 'Disponível', alugado: 'Alugado', vendido: 'Vendido', manutencao: 'Manutenção' }[s] || s;
}
function rotuloStatusFiado(s) {
  return { aberto: 'Aberto', parcial: 'Parcial', quitado: 'Quitado', atrasado: 'Atrasado' }[s] || s;
}
function rotuloStatusLocacao(s) {
  return { ativa: 'Ativa', finalizada: 'Finalizada', atrasada: 'Atrasada', cancelada: 'Cancelada' }[s] || s;
}
function statusExibicaoLocacao(l) {
  const hoje = new Date().toISOString().slice(0, 10);
  if (l.status === 'ativa' && l.data_fim_prevista && l.data_fim_prevista < hoje) return 'atrasada';
  return l.status;
}

// ---------- PAINEL ----------
let GRAFICO_RECEITA = null;

function rotuloMes(chave) {
  const [ano, mes] = chave.split('-');
  const nomes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${nomes[Number(mes) - 1]}/${ano.slice(2)}`;
}

async function carregarDashboard() {
  const el = document.getElementById('view-dashboard');
  el.innerHTML = `
    <div class="view-header"><div><h1>Painel</h1><div class="sub">Visão geral do pátio</div></div></div>
    <div class="indicadores" id="ind-grid"></div>
    <div class="painel-grafico" id="painel-vencendo" style="margin-bottom:24px"></div>
    <div class="painel-grafico">
      <h2 class="grafico-titulo">Receita mensal — fiado, locação e venda</h2>
      <canvas id="grafico-receita" height="90"></canvas>
    </div>
  `;
  try {
    const d = await dashboardApi.resumo();
    document.getElementById('ind-grid').innerHTML = `
      <div class="indicador destaque"><div class="rotulo">A receber (fiado)</div><div class="valor">${moeda(d.fiado_a_receber)}</div></div>
      <div class="indicador ${d.fiados_atrasados > 0 ? 'alerta' : ''}"><div class="rotulo">Fiados atrasados</div><div class="valor">${d.fiados_atrasados}</div></div>
      <div class="indicador"><div class="rotulo">Locações ativas</div><div class="valor">${d.locacoes_ativas}</div></div>
      <div class="indicador"><div class="rotulo">Veículos disponíveis</div><div class="valor">${d.veiculos_disponiveis}</div></div>
      <div class="indicador ${d.veiculos_manutencao > 0 ? 'alerta' : ''}"><div class="rotulo">Veículos em manutenção</div><div class="valor">${d.veiculos_manutencao}</div></div>
      <div class="indicador"><div class="rotulo">Vendas do mês</div><div class="valor">${moeda(d.vendas_mes)}</div></div>
      <div class="indicador"><div class="rotulo">Clientes cadastrados</div><div class="valor">${d.clientes_total}</div></div>
      <div class="indicador"><div class="rotulo">Clientes inativos</div><div class="valor">${d.clientes_inativos}</div></div>
    `;
  } catch (err) { toast(err.message, true); }

  try {
    const vencendo = await dashboardApi.vencendoEmBreve();
    const painel = document.getElementById('painel-vencendo');
    painel.innerHTML = `<h2 class="grafico-titulo">Vencendo nos próximos 7 dias</h2>` + (
      vencendo.length
        ? vencendo.map(f => `<div class="hist-item"><span>${f.cliente_nome} — ${f.descricao} (${dataBr(f.vencimento)})</span><span class="tag tag-parcial">${moeda(f.saldo)}</span></div>`).join('')
        : `<p class="sub">Nenhum fiado vencendo nos próximos 7 dias.</p>`
    );
  } catch (err) { toast(err.message, true); }

  try {
    const r = await dashboardApi.receitaMensal(6);
    const ctx = document.getElementById('grafico-receita');
    if (GRAFICO_RECEITA) { GRAFICO_RECEITA.destroy(); GRAFICO_RECEITA = null; }
    GRAFICO_RECEITA = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: r.labels.map(rotuloMes),
        datasets: [
          { label: 'Fiado recebido', data: r.fiado, backgroundColor: '#5a8fbe' },
          { label: 'Locação', data: r.locacao, backgroundColor: '#f2a93b' },
          { label: 'Venda', data: r.venda, backgroundColor: '#4fae7c' },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#e8ebef', font: { family: 'Inter' } } } },
        scales: {
          x: { ticks: { color: '#8b95a5' }, grid: { color: '#2c3644' } },
          y: { ticks: { color: '#8b95a5', callback: (v) => 'R$ ' + v }, grid: { color: '#2c3644' } },
        },
      },
    });
  } catch (err) { toast(err.message, true); }
}

// ---------- CLIENTES ----------
function validarCPF(cpf) {
  cpf = (cpf || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11; if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11; if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf.substring(10, 11));
}
function validarCNH(cnh) {
  cnh = (cnh || '').replace(/\D/g, '');
  return cnh.length === 11;
}
function rotuloStatusCliente(s) { return s === 'inativo' ? 'Inativo' : 'Ativo'; }
function cnhVencida(data) { return data && new Date(data) < new Date(new Date().toDateString()); }

async function carregarClientes() {
  const el = document.getElementById('view-clientes');
  el.innerHTML = `
    <div class="view-header">
      <div><h1>Clientes</h1><div class="sub">Cadastro geral</div></div>
      <button class="btn-primario" id="btn-novo-cliente">+ Novo cliente</button>
    </div>
    <div class="toolbar">
      <input type="text" id="busca-cliente" placeholder="Buscar por nome, CPF ou telefone..." />
      <select id="filtro-status-cliente">
        <option value="">Todos os status</option>
        <option value="ativo">Ativo</option>
        <option value="inativo">Inativo</option>
      </select>
      <button class="btn-secundario" id="btn-exportar-clientes">Exportar CSV</button>
    </div>
    <div class="tabela-wrap"><table><thead><tr><th>Nome</th><th>Telefone</th><th>CPF</th><th>CNH</th><th>Status</th><th></th></tr></thead><tbody id="tbody-clientes"></tbody></table></div>
  `;
  document.getElementById('btn-exportar-clientes').onclick = () => exportarCSV('clientes',
    [{ titulo: 'Nome', campo: 'nome' }, { titulo: 'Telefone', campo: 'telefone' }, { titulo: 'CPF', campo: 'cpf' },
     { titulo: 'RG', campo: 'rg' }, { titulo: 'CNH', campo: 'cnh' }, { titulo: 'Profissão', campo: 'profissao' },
     { titulo: 'Status', campo: 'status' }], CACHE_CLIENTES);
  document.getElementById('btn-novo-cliente').onclick = () => formCliente();
  document.getElementById('busca-cliente').addEventListener('input', (e) => renderClientes(e.target.value, document.getElementById('filtro-status-cliente').value));
  document.getElementById('filtro-status-cliente').addEventListener('change', (e) => renderClientes(document.getElementById('busca-cliente').value, e.target.value));
  await renderClientes();
}
async function renderClientes(busca, status) {
  try {
    let lista = await clientesApi.listar(busca);
    if (status) lista = lista.filter(c => (c.status || 'ativo') === status);
    CACHE_CLIENTES = lista;
    const tbody = document.getElementById('tbody-clientes');
    if (!lista.length) { tbody.innerHTML = `<tr><td colspan="6" class="vazio">Nenhum cliente cadastrado ainda.</td></tr>`; return; }
    tbody.innerHTML = lista.map(c => `
      <tr>
        <td>${c.nome}</td><td>${c.telefone || '—'}</td><td>${c.cpf || '—'}</td>
        <td>${c.cnh || '—'}${c.cnh && cnhVencida(c.cnh_vencimento) ? ' <span class="tag tag-atrasado">Vencida</span>' : ''}</td>
        <td><span class="tag tag-${c.status === 'inativo' ? 'cancelada' : 'quitado'}">${rotuloStatusCliente(c.status)}</span></td>
        <td>
          <button class="btn-secundario" onclick="verHistoricoCliente(${c.id}, '${c.nome.replace(/'/g, "\\'")}')">Histórico</button>
          <button class="btn-secundario" onclick="formCliente(${c.id})">Editar</button>
          ${PERFIL.papel === 'admin' ? `<button class="btn-secundario" onclick="excluirCliente(${c.id})">Excluir</button>` : ''}
        </td>
      </tr>`).join('');
  } catch (err) { toast(err.message, true); }
}

async function excluirCliente(id) {
  if (!confirm('Excluir este cliente? Só é possível se ele não tiver fiado, locação ou venda registrados.')) return;
  try {
    await clientesApi.excluir(id);
    toast('Cliente excluído.');
    renderClientes();
  } catch (err) { toast(err.message, true); }
}

async function verHistoricoCliente(id, nome) {
  abrirModal(`<h2>Histórico — ${nome}</h2><p class="sub" id="hist-carregando">Carregando...</p>`);
  try {
    const [fiados, locacoes, vendas] = await Promise.all([fiadoApi.listar(), locacoesApi.listar(), vendasApi.listar()]);
    const fiadosCliente = fiados.filter(f => f.cliente_id === id);
    const locacoesCliente = locacoes.filter(l => l.cliente_id === id);
    const vendasCliente = vendas.filter(v => v.cliente_id === id);

    const blocoFiado = fiadosCliente.length
      ? fiadosCliente.map(f => `<div class="hist-item"><span>${f.descricao} — ${moeda(f.valor_total)}</span><span class="tag tag-${f.status}">${rotuloStatusFiado(f.status)}</span></div>`).join('')
      : '<p class="sub">Nenhum fiado.</p>';
    const blocoLocacao = locacoesCliente.length
      ? locacoesCliente.map(l => `<div class="hist-item"><span>${l.placa} — ${l.modelo} (${dataBr(l.data_inicio)})</span><span class="tag tag-${l.status}">${rotuloStatusLocacao(l.status)}</span></div>`).join('')
      : '<p class="sub">Nenhuma locação.</p>';
    const blocoVenda = vendasCliente.length
      ? vendasCliente.map(v => `<div class="hist-item"><span>${v.placa} — ${v.modelo}</span><span>${moeda(v.valor)}</span></div>`).join('')
      : '<p class="sub">Nenhuma venda.</p>';

    abrirModal(`
      <h2>Histórico — ${nome}</h2>
      <p class="grafico-titulo" style="font-size:14px;margin-bottom:8px">Fiado</p>${blocoFiado}
      <p class="grafico-titulo" style="font-size:14px;margin:16px 0 8px">Locação</p>${blocoLocacao}
      <p class="grafico-titulo" style="font-size:14px;margin:16px 0 8px">Venda</p>${blocoVenda}
      <div class="modal-acoes"><button type="button" class="btn-secundario" onclick="fecharModal()">Fechar</button></div>
    `);
  } catch (err) { fecharModal(); toast(err.message, true); }
}
async function formCliente(id) {
  let c = {
    nome: '', cpf: '', telefone: '', endereco: '', observacoes: '',
    rg: '', cnh: '', cnh_vencimento: '', data_nascimento: '', profissao: '',
    referencia_nome: '', referencia_telefone: '', status: 'ativo',
  };
  if (id) c = { ...c, ...(await clientesApi.obter(id)) };
  abrirModal(`
    <h2>${id ? 'Editar cliente' : 'Novo cliente'}</h2>
    <form id="form-cliente">
      <label>Nome<input required id="c-nome" value="${c.nome}" /></label>
      <div class="form-linha">
        <label>Telefone<input id="c-telefone" value="${c.telefone || ''}" /></label>
        <label>Data de nascimento<input id="c-nasc" type="date" value="${c.data_nascimento || ''}" /></label>
      </div>
      <div class="form-linha">
        <label>CPF<input id="c-cpf" value="${c.cpf || ''}" placeholder="000.000.000-00" /></label>
        <label>RG<input id="c-rg" value="${c.rg || ''}" /></label>
      </div>
      <div class="form-linha">
        <label>CNH<input id="c-cnh" value="${c.cnh || ''}" placeholder="11 dígitos" /></label>
        <label>Validade da CNH<input id="c-cnh-venc" type="date" value="${c.cnh_vencimento || ''}" /></label>
      </div>
      <p class="erro" id="c-doc-erro"></p>
      <label>Profissão<input id="c-profissao" value="${c.profissao || ''}" /></label>
      <label>Endereço<input id="c-endereco" value="${c.endereco || ''}" /></label>
      <div class="form-linha">
        <label>Referência — nome<input id="c-ref-nome" value="${c.referencia_nome || ''}" /></label>
        <label>Referência — telefone<input id="c-ref-tel" value="${c.referencia_telefone || ''}" /></label>
      </div>
      <label>Status
        <select id="c-status">
          <option value="ativo" ${c.status !== 'inativo' ? 'selected' : ''}>Ativo</option>
          <option value="inativo" ${c.status === 'inativo' ? 'selected' : ''}>Inativo</option>
        </select>
      </label>
      <label>Observações<textarea id="c-obs" rows="2">${c.observacoes || ''}</textarea></label>
      <div class="modal-acoes">
        <button type="button" class="btn-secundario" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn-primario">Salvar</button>
      </div>
    </form>`);
  document.getElementById('form-cliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cpf = document.getElementById('c-cpf').value.trim();
    const cnh = document.getElementById('c-cnh').value.trim();
    const erroEl = document.getElementById('c-doc-erro');
    erroEl.textContent = '';
    if (cpf && !validarCPF(cpf)) { erroEl.textContent = 'CPF inválido. Confira os números digitados.'; return; }
    if (cnh && !validarCNH(cnh)) { erroEl.textContent = 'CNH inválida — deve ter 11 dígitos.'; return; }
    const dados = {
      nome: document.getElementById('c-nome').value.trim(),
      telefone: document.getElementById('c-telefone').value.trim(),
      cpf, rg: document.getElementById('c-rg').value.trim(),
      cnh, cnh_vencimento: document.getElementById('c-cnh-venc').value || null,
      data_nascimento: document.getElementById('c-nasc').value || null,
      profissao: document.getElementById('c-profissao').value.trim(),
      endereco: document.getElementById('c-endereco').value.trim(),
      referencia_nome: document.getElementById('c-ref-nome').value.trim(),
      referencia_telefone: document.getElementById('c-ref-tel').value.trim(),
      status: document.getElementById('c-status').value,
      observacoes: document.getElementById('c-obs').value.trim(),
    };
    try {
      if (id) await clientesApi.atualizar(id, dados);
      else await clientesApi.criar(dados);
      fecharModal(); toast('Cliente salvo.'); renderClientes();
    } catch (err) { toast(err.message, true); }
  });
}

// ---------- RELATÓRIOS ----------
let RELATORIO_ATUAL = { tipo: 'fiado', linhas: [] };

async function carregarRelatorios() {
  const el = document.getElementById('view-relatorios');
  el.innerHTML = `
    <div class="view-header"><div><h1>Relatórios</h1><div class="sub">Fiado, locação e venda com filtro de período</div></div></div>
    <div class="toolbar">
      <select id="rel-tipo">
        <option value="fiado">Fiado</option>
        <option value="locacoes">Locação</option>
        <option value="vendas">Venda</option>
      </select>
      <input type="date" id="rel-inicio" title="De" />
      <input type="date" id="rel-fim" title="Até" />
      <button class="btn-secundario" id="btn-gerar-relatorio">Gerar</button>
      <button class="btn-primario" id="btn-exportar-relatorio">Exportar CSV</button>
    </div>
    <div id="rel-resumo" class="indicadores" style="margin-bottom:16px"></div>
    <div class="tabela-wrap"><table><thead id="rel-thead"></thead><tbody id="rel-tbody"></tbody></table></div>
  `;
  document.getElementById('btn-gerar-relatorio').onclick = gerarRelatorio;
  document.getElementById('btn-exportar-relatorio').onclick = exportarRelatorioCSV;
  await gerarRelatorio();
}

async function gerarRelatorio() {
  const tipo = document.getElementById('rel-tipo').value;
  const inicio = document.getElementById('rel-inicio').value;
  const fim = document.getElementById('rel-fim').value;
  try {
    let linhas = [];
    if (tipo === 'fiado') linhas = await fiadoApi.listar();
    else if (tipo === 'locacoes') linhas = await locacoesApi.listar();
    else linhas = await vendasApi.listar();

    const campoData = { fiado: 'data_venda', locacoes: 'data_inicio', vendas: 'data_venda' }[tipo];
    if (inicio) linhas = linhas.filter(l => l[campoData] && String(l[campoData]).slice(0, 10) >= inicio);
    if (fim) linhas = linhas.filter(l => l[campoData] && String(l[campoData]).slice(0, 10) <= fim);

    RELATORIO_ATUAL = { tipo, linhas };
    renderRelatorio(tipo, linhas);
  } catch (err) { toast(err.message, true); }
}

function renderRelatorio(tipo, linhas) {
  const thead = document.getElementById('rel-thead');
  const tbody = document.getElementById('rel-tbody');
  const resumo = document.getElementById('rel-resumo');

  if (tipo === 'fiado') {
    thead.innerHTML = `<tr><th>Cliente</th><th>Descrição</th><th>Total</th><th>Saldo</th><th>Status</th><th>Data</th></tr>`;
    tbody.innerHTML = linhas.length
      ? linhas.map(f => `<tr><td>${f.cliente_nome}</td><td>${f.descricao}</td><td>${moeda(f.valor_total)}</td><td>${moeda(f.saldo)}</td><td><span class="tag tag-${f.status}">${rotuloStatusFiado(f.status)}</span></td><td>${dataBr(f.data_venda)}</td></tr>`).join('')
      : `<tr><td colspan="6" class="vazio">Nenhum resultado para o período.</td></tr>`;
    const total = linhas.reduce((s, f) => s + Number(f.valor_total), 0);
    const saldo = linhas.reduce((s, f) => s + Number(f.saldo), 0);
    resumo.innerHTML = `
      <div class="indicador"><div class="rotulo">Total em fiado</div><div class="valor">${moeda(total)}</div></div>
      <div class="indicador destaque"><div class="rotulo">Saldo em aberto</div><div class="valor">${moeda(saldo)}</div></div>
      <div class="indicador"><div class="rotulo">Registros</div><div class="valor">${linhas.length}</div></div>`;
  } else if (tipo === 'locacoes') {
    thead.innerHTML = `<tr><th>Veículo</th><th>Cliente</th><th>Início</th><th>Status</th><th>Valor total</th></tr>`;
    tbody.innerHTML = linhas.length
      ? linhas.map(l => `<tr><td>${l.placa} — ${l.modelo}</td><td>${l.cliente_nome}</td><td>${dataBr(l.data_inicio)}</td><td><span class="tag tag-${statusExibicaoLocacao(l)}">${rotuloStatusLocacao(statusExibicaoLocacao(l))}</span></td><td>${l.valor_total ? moeda(l.valor_total) : '—'}</td></tr>`).join('')
      : `<tr><td colspan="5" class="vazio">Nenhum resultado para o período.</td></tr>`;
    const total = linhas.reduce((s, l) => s + Number(l.valor_total || 0), 0);
    resumo.innerHTML = `
      <div class="indicador destaque"><div class="rotulo">Total faturado</div><div class="valor">${moeda(total)}</div></div>
      <div class="indicador"><div class="rotulo">Registros</div><div class="valor">${linhas.length}</div></div>`;
  } else {
    thead.innerHTML = `<tr><th>Veículo</th><th>Cliente</th><th>Valor</th><th>Forma</th><th>Data</th></tr>`;
    tbody.innerHTML = linhas.length
      ? linhas.map(v => `<tr><td>${v.placa} — ${v.modelo}</td><td>${v.cliente_nome}</td><td>${moeda(v.valor)}</td><td>${v.forma_pagamento || '—'}</td><td>${dataBr(v.data_venda)}</td></tr>`).join('')
      : `<tr><td colspan="5" class="vazio">Nenhum resultado para o período.</td></tr>`;
    const total = linhas.reduce((s, v) => s + Number(v.valor), 0);
    resumo.innerHTML = `
      <div class="indicador destaque"><div class="rotulo">Total vendido</div><div class="valor">${moeda(total)}</div></div>
      <div class="indicador"><div class="rotulo">Registros</div><div class="valor">${linhas.length}</div></div>`;
  }
}

function exportarRelatorioCSV() {
  const { tipo, linhas } = RELATORIO_ATUAL;
  if (!linhas.length) { toast('Nada para exportar.', true); return; }
  let colunas, linhasCSV;
  if (tipo === 'fiado') {
    colunas = ['Cliente', 'Descrição', 'Total', 'Saldo', 'Status', 'Data'];
    linhasCSV = linhas.map(f => [f.cliente_nome, f.descricao, f.valor_total, f.saldo, f.status, f.data_venda]);
  } else if (tipo === 'locacoes') {
    colunas = ['Placa', 'Modelo', 'Cliente', 'Início', 'Status', 'Valor total'];
    linhasCSV = linhas.map(l => [l.placa, l.modelo, l.cliente_nome, l.data_inicio, l.status, l.valor_total || '']);
  } else {
    colunas = ['Placa', 'Modelo', 'Cliente', 'Valor', 'Forma', 'Data'];
    linhasCSV = linhas.map(v => [v.placa, v.modelo, v.cliente_nome, v.valor, v.forma_pagamento, v.data_venda]);
  }
  const csv = [colunas.join(';'), ...linhasCSV.map(l => l.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `relatorio-${tipo}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- VEÍCULOS ----------
async function carregarVeiculos() {
  const el = document.getElementById('view-veiculos');
  el.innerHTML = `
    <div class="view-header">
      <div><h1>Veículos</h1><div class="sub">Estoque do pátio</div></div>
      <button class="btn-primario" id="btn-novo-veiculo">+ Novo veículo</button>
    </div>
    <div class="toolbar">
      <select id="filtro-status-veiculo">
        <option value="">Todos os status</option>
        <option value="disponivel">Disponível</option>
        <option value="alugado">Alugado</option>
        <option value="vendido">Vendido</option>
        <option value="manutencao">Manutenção</option>
      </select>
      <button class="btn-secundario" id="btn-exportar-veiculos">Exportar CSV</button>
    </div>
    <div class="tabela-wrap"><table><thead><tr><th>Foto</th><th>Placa</th><th>Veículo</th><th>Ano</th><th>Status</th><th>Venda</th><th>Diária</th><th></th></tr></thead><tbody id="tbody-veiculos"></tbody></table></div>
  `;
  document.getElementById('btn-exportar-veiculos').onclick = () => exportarCSV('veiculos',
    [{ titulo: 'Placa', campo: 'placa' }, { titulo: 'Marca', campo: 'marca' }, { titulo: 'Modelo', campo: 'modelo' },
     { titulo: 'Ano', campo: 'ano' }, { titulo: 'Status', campo: 'status' }, { titulo: 'Valor venda', campo: 'valor_venda' },
     { titulo: 'Valor diária', campo: 'valor_diaria' }, { titulo: 'KM', campo: 'km' }], CACHE_VEICULOS);
  document.getElementById('btn-novo-veiculo').onclick = () => formVeiculo();
  document.getElementById('filtro-status-veiculo').addEventListener('change', (e) => renderVeiculos(e.target.value));
  await renderVeiculos();
}
async function renderVeiculos(status) {
  try {
    const lista = await veiculosApi.listar(status);
    CACHE_VEICULOS = lista;
    const tbody = document.getElementById('tbody-veiculos');
    if (!lista.length) { tbody.innerHTML = `<tr><td colspan="7" class="vazio">Nenhum veículo cadastrado ainda.</td></tr>`; return; }
    tbody.innerHTML = lista.map(v => `
      <tr>
        <td>${v.foto_url ? `<img src="${v.foto_url}" alt="${v.placa}" class="thumb-veiculo" />` : '<span class="sub">sem foto</span>'}</td>
        <td>${v.placa}</td><td>${v.marca ? v.marca + ' ' : ''}${v.modelo}</td><td>${v.ano || '—'}</td>
        <td><span class="tag tag-${v.status}">${rotuloStatusVeiculo(v.status)}</span></td>
        <td>${v.valor_venda ? moeda(v.valor_venda) : '—'}</td>
        <td>${v.valor_diaria ? moeda(v.valor_diaria) : '—'}</td>
        <td>
          <button class="btn-secundario" onclick="formVeiculo(${v.id})">Editar</button>
          ${PERFIL.papel === 'admin' ? `<button class="btn-secundario" onclick="excluirVeiculo(${v.id})">Excluir</button>` : ''}
        </td>
      </tr>`).join('');
  } catch (err) { toast(err.message, true); }
}

async function excluirVeiculo(id) {
  if (!confirm('Excluir este veículo? Só é possível se ele não tiver locação ou venda registrados.')) return;
  try {
    await veiculosApi.excluir(id);
    toast('Veículo excluído.');
    renderVeiculos();
  } catch (err) { toast(err.message, true); }
}
async function formVeiculo(id) {
  let v = { placa: '', marca: '', modelo: '', ano: '', cor: '', status: 'disponivel', valor_venda: '', valor_diaria: '', km: '', foto_url: '' };
  if (id) v = CACHE_VEICULOS.find(x => x.id === id) || v;
  abrirModal(`
    <h2>${id ? 'Editar veículo' : 'Novo veículo'}</h2>
    <form id="form-veiculo">
      ${v.foto_url ? `<img src="${v.foto_url}" alt="Foto atual" class="thumb-preview" />` : ''}
      <label>Foto do veículo<input type="file" id="v-foto" accept="image/*" /></label>
      <div class="form-linha">
        <label>Placa<input required id="v-placa" value="${v.placa}" ${id ? 'disabled' : ''} /></label>
        <label>Ano<input id="v-ano" type="number" value="${v.ano || ''}" /></label>
      </div>
      <div class="form-linha">
        <label>Marca<input id="v-marca" value="${v.marca || ''}" /></label>
        <label>Modelo<input required id="v-modelo" value="${v.modelo}" /></label>
      </div>
      <div class="form-linha">
        <label>Cor<input id="v-cor" value="${v.cor || ''}" /></label>
        <label>KM<input id="v-km" type="number" value="${v.km || ''}" /></label>
      </div>
      <div class="form-linha">
        <label>Valor de venda (R$)<input id="v-venda" type="number" step="0.01" value="${v.valor_venda || ''}" /></label>
        <label>Valor da diária (R$)<input id="v-diaria" type="number" step="0.01" value="${v.valor_diaria || ''}" /></label>
      </div>
      ${id ? `<label>Status
        <select id="v-status">
          ${['disponivel', 'alugado', 'vendido', 'manutencao'].map(s => `<option value="${s}" ${s === v.status ? 'selected' : ''}>${rotuloStatusVeiculo(s)}</option>`).join('')}
        </select></label>` : ''}
      <p class="erro" id="v-erro"></p>
      <div class="modal-acoes">
        <button type="button" class="btn-secundario" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn-primario" id="v-btn-salvar">Salvar</button>
      </div>
    </form>`);
  document.getElementById('form-veiculo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const placa = document.getElementById('v-placa').value.trim().toUpperCase();
    const dados = {
      placa,
      marca: document.getElementById('v-marca').value.trim(),
      modelo: document.getElementById('v-modelo').value.trim(),
      ano: Number(document.getElementById('v-ano').value) || null,
      cor: document.getElementById('v-cor').value.trim(),
      km: Number(document.getElementById('v-km').value) || null,
      valor_venda: Number(document.getElementById('v-venda').value) || null,
      valor_diaria: Number(document.getElementById('v-diaria').value) || null,
    };
    const erroEl = document.getElementById('v-erro');
    const btnSalvar = document.getElementById('v-btn-salvar');
    erroEl.textContent = '';
    try {
      const arquivo = document.getElementById('v-foto').files[0];
      if (arquivo) {
        btnSalvar.textContent = 'Enviando foto...';
        dados.foto_url = await veiculosApi.enviarFoto(placa, arquivo);
      }
      if (id) {
        dados.status = document.getElementById('v-status').value;
        await veiculosApi.atualizar(id, dados);
      } else {
        dados.status = 'disponivel';
        await veiculosApi.criar(dados);
      }
      fecharModal(); toast('Veículo salvo.'); renderVeiculos();
    } catch (err) {
      erroEl.textContent = err.message;
      btnSalvar.textContent = 'Salvar';
    }
  });
}

// ---------- FIADO ----------
async function carregarFiado() {
  const el = document.getElementById('view-fiado');
  el.innerHTML = `
    <div class="view-header">
      <div><h1>Fiado</h1><div class="sub">Vendas a prazo e cobranças</div></div>
      <button class="btn-primario" id="btn-novo-fiado">+ Novo fiado</button>
    </div>
    <div class="toolbar">
      <input type="text" id="busca-fiado" placeholder="Buscar por cliente ou descrição..." />
      <select id="filtro-status-fiado">
        <option value="">Todos os status</option>
        <option value="aberto">Aberto</option>
        <option value="parcial">Pago parcialmente</option>
        <option value="quitado">Quitado</option>
        <option value="atrasado">Atrasado</option>
      </select>
    </div>
    <div class="tabela-wrap"><table><thead><tr><th>Cliente</th><th>Descrição</th><th>Total</th><th>Saldo</th><th>Vencimento</th><th>Status</th><th></th></tr></thead><tbody id="tbody-fiado"></tbody></table></div>
  `;
  if (!CACHE_CLIENTES.length) await clientesApi.listar().then(l => CACHE_CLIENTES = l);
  document.getElementById('btn-novo-fiado').onclick = () => formFiado();
  const disparar = () => renderFiado(document.getElementById('filtro-status-fiado').value, document.getElementById('busca-fiado').value);
  document.getElementById('filtro-status-fiado').addEventListener('change', disparar);
  document.getElementById('busca-fiado').addEventListener('input', disparar);
  await renderFiado();
}
async function renderFiado(status, busca) {
  try {
    let lista = await fiadoApi.listar(status);
    if (busca) {
      const termo = busca.toLowerCase();
      lista = lista.filter(f => f.cliente_nome?.toLowerCase().includes(termo) || f.descricao?.toLowerCase().includes(termo));
    }
    const tbody = document.getElementById('tbody-fiado');
    if (!lista.length) { tbody.innerHTML = `<tr><td colspan="7" class="vazio">Nenhum fiado encontrado.</td></tr>`; return; }
    tbody.innerHTML = lista.map(f => `
      <tr>
        <td>${f.cliente_nome}</td><td>${f.descricao}</td><td>${moeda(f.valor_total)}</td><td>${moeda(f.saldo)}</td>
        <td>${dataBr(f.vencimento)}</td><td><span class="tag tag-${f.status}">${rotuloStatusFiado(f.status)}</span></td>
        <td>
          ${f.saldo > 0 ? `<button class="btn-secundario" onclick="formPagamento(${f.id}, ${f.saldo})">Receber</button>` : ''}
          ${f.valor_pago === 0 ? `<button class="btn-secundario" onclick="editarFiado(${f.id})">Editar</button>` : ''}
          ${PERFIL.papel === 'admin' ? `<button class="btn-secundario" onclick="excluirFiado(${f.id})">Excluir</button>` : ''}
        </td>
      </tr>`).join('');
  } catch (err) { toast(err.message, true); }
}
async function editarFiado(id) {
  try {
    const lista = await fiadoApi.listar();
    const f = lista.find(x => x.id === id);
    if (!f) return;
    if (f.valor_pago > 0) { toast('Não é possível editar um fiado que já recebeu pagamento.', true); return; }
    abrirModal(`
      <h2>Editar fiado</h2>
      <p class="sub" style="margin-bottom:12px">${f.cliente_nome}</p>
      <form id="form-editar-fiado">
        <label>Descrição<input required id="ef-desc" value="${f.descricao}" /></label>
        <div class="form-linha">
          <label>Valor total (R$)<input required id="ef-valor" type="number" step="0.01" value="${f.valor_total}" /></label>
          <label>Vencimento<input id="ef-venc" type="date" value="${f.vencimento || ''}" /></label>
        </div>
        <div class="modal-acoes">
          <button type="button" class="btn-secundario" onclick="fecharModal()">Cancelar</button>
          <button type="submit" class="btn-primario">Salvar</button>
        </div>
      </form>`);
    document.getElementById('form-editar-fiado').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await fiadoApi.atualizar(id, {
          descricao: document.getElementById('ef-desc').value.trim(),
          valor_total: Number(document.getElementById('ef-valor').value),
          vencimento: document.getElementById('ef-venc').value || null,
        });
        fecharModal(); toast('Fiado atualizado.'); renderFiado();
      } catch (err) { toast(err.message, true); }
    });
  } catch (err) { toast(err.message, true); }
}
async function excluirFiado(id) {
  if (!confirm('Excluir este fiado e todos os pagamentos registrados nele? Essa ação não pode ser desfeita.')) return;
  try {
    await fiadoApi.excluir(id);
    toast('Fiado excluído.');
    renderFiado();
  } catch (err) { toast(err.message, true); }
}
async function formFiado() {
  abrirModal(`
    <h2>Novo fiado</h2>
    <form id="form-fiado">
      <label>Cliente<select required id="f-cliente">${opcoesClientes()}</select></label>
      <label>Descrição<input required id="f-desc" placeholder="Ex: peças, manutenção, acessórios..." /></label>
      <div class="form-linha">
        <label>Valor total (R$)<input required id="f-valor" type="number" step="0.01" /></label>
        <label>Vencimento<input id="f-venc" type="date" /></label>
      </div>
      <div class="modal-acoes">
        <button type="button" class="btn-secundario" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn-primario">Registrar</button>
      </div>
    </form>`);
  document.getElementById('form-fiado').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = {
      cliente_id: Number(document.getElementById('f-cliente').value),
      descricao: document.getElementById('f-desc').value.trim(),
      valor_total: Number(document.getElementById('f-valor').value),
      vencimento: document.getElementById('f-venc').value || null,
      criado_por: PERFIL.id,
    };
    try {
      await fiadoApi.criar(dados);
      fecharModal(); toast('Fiado registrado.'); renderFiado();
    } catch (err) { toast(err.message, true); }
  });
}
async function formPagamento(fiadoId, saldo) {
  abrirModal(`
    <h2>Receber pagamento</h2>
    <p class="sub">Saldo devedor atual: <strong>${moeda(saldo)}</strong></p>
    <form id="form-pagamento">
      <label>Valor recebido (R$)<input required id="p-valor" type="number" step="0.01" max="${saldo}" /></label>
      <label>Forma de pagamento
        <select id="p-forma"><option>Dinheiro</option><option>Pix</option><option>Cartão</option><option>Transferência</option></select>
      </label>
      <div class="modal-acoes">
        <button type="button" class="btn-secundario" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn-primario">Confirmar</button>
      </div>
    </form>`);
  document.getElementById('form-pagamento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const valor = Number(document.getElementById('p-valor').value);
    const forma = document.getElementById('p-forma').value;
    try {
      await fiadoApi.registrarPagamento(fiadoId, valor, forma);
      fecharModal(); toast('Pagamento registrado.'); renderFiado();
    } catch (err) { toast(err.message, true); }
  });
}

// ---------- LOCAÇÕES ----------
async function carregarLocacoes() {
  const el = document.getElementById('view-locacoes');
  el.innerHTML = `
    <div class="view-header">
      <div><h1>Locação</h1><div class="sub">Aluguel de veículos</div></div>
      <button class="btn-primario" id="btn-nova-locacao">+ Nova locação</button>
    </div>
    <div class="toolbar"><input type="text" id="busca-locacao" placeholder="Buscar por cliente ou placa..." /></div>
    <div class="tabela-wrap"><table><thead><tr><th>Veículo</th><th>Cliente</th><th>Início</th><th>Fim previsto</th><th>Diária</th><th>Status</th><th></th></tr></thead><tbody id="tbody-locacoes"></tbody></table></div>
  `;
  if (!CACHE_CLIENTES.length) await clientesApi.listar().then(l => CACHE_CLIENTES = l);
  await veiculosApi.listar().then(l => CACHE_VEICULOS = l);
  document.getElementById('btn-nova-locacao').onclick = () => formLocacao();
  document.getElementById('busca-locacao').addEventListener('input', (e) => renderLocacoes(e.target.value));
  await renderLocacoes();
}
async function renderLocacoes(busca) {
  try {
    let lista = await locacoesApi.listar();
    if (busca) {
      const termo = busca.toLowerCase();
      lista = lista.filter(l => l.cliente_nome?.toLowerCase().includes(termo) || l.placa?.toLowerCase().includes(termo));
    }
    const tbody = document.getElementById('tbody-locacoes');
    if (!lista.length) { tbody.innerHTML = `<tr><td colspan="7" class="vazio">Nenhuma locação encontrada.</td></tr>`; return; }
    tbody.innerHTML = lista.map(l => `
      <tr>
        <td>${l.placa} — ${l.modelo}</td><td>${l.cliente_nome}</td><td>${dataBr(l.data_inicio)}</td>
        <td>${dataBr(l.data_fim_prevista)}</td><td>${moeda(l.valor_diaria)}</td>
        <td><span class="tag tag-${statusExibicaoLocacao(l)}">${rotuloStatusLocacao(statusExibicaoLocacao(l))}</span></td>
        <td>${l.status === 'ativa'
          ? `<button class="btn-secundario" onclick="editarLocacao(${l.id})">Editar</button>
             <button class="btn-secundario" onclick="finalizarLocacao(${l.id}, ${l.veiculo_id})">Finalizar</button>
             <button class="btn-secundario" onclick="cancelarLocacao(${l.id}, ${l.veiculo_id})">Cancelar</button>`
          : ''}
          ${PERFIL.papel === 'admin' ? `<button class="btn-secundario" onclick="excluirLocacao(${l.id})">Excluir</button>` : ''}
        </td>
      </tr>`).join('');
  } catch (err) { toast(err.message, true); }
}
async function editarLocacao(id) {
  try {
    const lista = await locacoesApi.listar();
    const l = lista.find(x => x.id === id);
    if (!l) return;
    abrirModal(`
      <h2>Editar locação</h2>
      <p class="sub" style="margin-bottom:12px">${l.placa} — ${l.modelo} · ${l.cliente_nome}</p>
      <form id="form-editar-locacao">
        <div class="form-linha">
          <label>Início<input required id="el-inicio" type="date" value="${l.data_inicio}" /></label>
          <label>Fim previsto<input id="el-fim" type="date" value="${l.data_fim_prevista || ''}" /></label>
        </div>
        <label>Valor da diária (R$)<input required id="el-diaria" type="number" step="0.01" value="${l.valor_diaria}" /></label>
        <div class="modal-acoes">
          <button type="button" class="btn-secundario" onclick="fecharModal()">Cancelar</button>
          <button type="submit" class="btn-primario">Salvar</button>
        </div>
      </form>`);
    document.getElementById('form-editar-locacao').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await locacoesApi.atualizar(id, {
          data_inicio: document.getElementById('el-inicio').value,
          data_fim_prevista: document.getElementById('el-fim').value || null,
          valor_diaria: Number(document.getElementById('el-diaria').value),
        });
        fecharModal(); toast('Locação atualizada.'); renderLocacoes();
      } catch (err) { toast(err.message, true); }
    });
  } catch (err) { toast(err.message, true); }
}
async function excluirLocacao(id) {
  if (!confirm('Excluir esta locação? Essa ação não pode ser desfeita.')) return;
  try {
    await locacoesApi.excluir(id);
    toast('Locação excluída.');
    renderLocacoes();
  } catch (err) { toast(err.message, true); }
}
async function formLocacao() {
  const disponiveis = CACHE_VEICULOS.filter(v => v.status === 'disponivel');
  if (!disponiveis.length) { toast('Não há veículos disponíveis para locação.', true); return; }
  abrirModal(`
    <h2>Nova locação</h2>
    <form id="form-locacao">
      <label>Veículo<select required id="l-veiculo">${opcoesVeiculos(disponiveis)}</select></label>
      <label>Cliente<select required id="l-cliente">${opcoesClientes()}</select></label>
      <div class="form-linha">
        <label>Início<input required id="l-inicio" type="date" /></label>
        <label>Fim previsto<input id="l-fim" type="date" /></label>
      </div>
      <label>Valor da diária (R$)<input required id="l-diaria" type="number" step="0.01" /></label>
      <div class="modal-acoes">
        <button type="button" class="btn-secundario" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn-primario">Registrar</button>
      </div>
    </form>`);
  const vSel = document.getElementById('l-veiculo');
  const preencherDiaria = () => {
    const v = disponiveis.find(x => x.id == vSel.value);
    if (v?.valor_diaria) document.getElementById('l-diaria').value = v.valor_diaria;
  };
  vSel.addEventListener('change', preencherDiaria);
  preencherDiaria();
  document.getElementById('form-locacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = {
      veiculo_id: Number(document.getElementById('l-veiculo').value),
      cliente_id: Number(document.getElementById('l-cliente').value),
      data_inicio: document.getElementById('l-inicio').value,
      data_fim_prevista: document.getElementById('l-fim').value || null,
      valor_diaria: Number(document.getElementById('l-diaria').value),
      criado_por: PERFIL.id,
    };
    try {
      await locacoesApi.criar(dados);
      fecharModal(); toast('Locação registrada.');
      await veiculosApi.listar().then(l => CACHE_VEICULOS = l);
      renderLocacoes();
    } catch (err) { toast(err.message, true); }
  });
}
async function finalizarLocacao(id, veiculoId) {
  abrirModal(`
    <h2>Finalizar locação</h2>
    <form id="form-finalizar">
      <label>Data de devolução<input required id="fl-data" type="date" value="${new Date().toISOString().slice(0,10)}" /></label>
      <label>Valor total cobrado (R$)<input id="fl-valor" type="number" step="0.01" /></label>
      <div class="modal-acoes">
        <button type="button" class="btn-secundario" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn-primario">Finalizar</button>
      </div>
    </form>`);
  document.getElementById('form-finalizar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dataFim = document.getElementById('fl-data').value;
    const valor = Number(document.getElementById('fl-valor').value) || null;
    try {
      await locacoesApi.finalizar(id, veiculoId, dataFim, valor);
      fecharModal(); toast('Locação finalizada.'); renderLocacoes();
    } catch (err) { toast(err.message, true); }
  });
}

async function cancelarLocacao(id, veiculoId) {
  if (!confirm('Cancelar esta locação? O veículo volta a ficar disponível.')) return;
  try {
    await locacoesApi.cancelar(id, veiculoId);
    toast('Locação cancelada.');
    renderLocacoes();
  } catch (err) { toast(err.message, true); }
}

// ---------- VENDAS ----------
async function carregarVendas() {
  const el = document.getElementById('view-vendas');
  el.innerHTML = `
    <div class="view-header">
      <div><h1>Venda</h1><div class="sub">Venda de veículos</div></div>
      <button class="btn-primario" id="btn-nova-venda">+ Nova venda</button>
    </div>
    <div class="toolbar"><input type="text" id="busca-venda" placeholder="Buscar por cliente ou placa..." /></div>
    <div class="tabela-wrap"><table><thead><tr><th>Veículo</th><th>Cliente</th><th>Valor</th><th>Forma</th><th>Data</th><th></th></tr></thead><tbody id="tbody-vendas"></tbody></table></div>
  `;
  if (!CACHE_CLIENTES.length) await clientesApi.listar().then(l => CACHE_CLIENTES = l);
  await veiculosApi.listar().then(l => CACHE_VEICULOS = l);
  document.getElementById('btn-nova-venda').onclick = () => formVenda();
  document.getElementById('busca-venda').addEventListener('input', (e) => renderVendas(e.target.value));
  await renderVendas();
}
async function renderVendas(busca) {
  try {
    let lista = await vendasApi.listar();
    if (busca) {
      const termo = busca.toLowerCase();
      lista = lista.filter(v => v.cliente_nome?.toLowerCase().includes(termo) || v.placa?.toLowerCase().includes(termo));
    }
    const tbody = document.getElementById('tbody-vendas');
    if (!lista.length) { tbody.innerHTML = `<tr><td colspan="6" class="vazio">Nenhuma venda encontrada.</td></tr>`; return; }
    tbody.innerHTML = lista.map(v => `
      <tr>
        <td>${v.placa} — ${v.modelo}</td><td>${v.cliente_nome}</td><td>${moeda(v.valor)}</td><td>${v.forma_pagamento || '—'}</td><td>${dataBr(v.data_venda)}</td>
        <td>
          ${PERFIL.papel === 'admin' ? `<button class="btn-secundario" onclick="editarVenda(${v.id})">Editar</button>` : ''}
          ${PERFIL.papel === 'admin' ? `<button class="btn-secundario" onclick="excluirVenda(${v.id})">Excluir</button>` : ''}
        </td>
      </tr>`).join('');
  } catch (err) { toast(err.message, true); }
}
async function editarVenda(id) {
  try {
    const lista = await vendasApi.listar();
    const v = lista.find(x => x.id === id);
    if (!v) return;
    abrirModal(`
      <h2>Editar venda</h2>
      <p class="sub" style="margin-bottom:12px">${v.placa} — ${v.modelo} · ${v.cliente_nome}</p>
      <form id="form-editar-venda">
        <div class="form-linha">
          <label>Valor (R$)<input required id="ev-valor" type="number" step="0.01" value="${v.valor}" /></label>
          <label>Forma de pagamento
            <select id="ev-forma">
              ${['À vista', 'Financiado', 'Pix', 'Cartão'].map(f => `<option ${f === v.forma_pagamento ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="modal-acoes">
          <button type="button" class="btn-secundario" onclick="fecharModal()">Cancelar</button>
          <button type="submit" class="btn-primario">Salvar</button>
        </div>
      </form>`);
    document.getElementById('form-editar-venda').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await vendasApi.atualizar(id, {
          valor: Number(document.getElementById('ev-valor').value),
          forma_pagamento: document.getElementById('ev-forma').value,
        });
        fecharModal(); toast('Venda atualizada.'); renderVendas();
      } catch (err) { toast(err.message, true); }
    });
  } catch (err) { toast(err.message, true); }
}
async function excluirVenda(id) {
  if (!confirm('Excluir esta venda? O veículo NÃO volta automaticamente a "disponível" — ajuste o status dele em Veículos se for o caso.')) return;
  try {
    await vendasApi.excluir(id);
    toast('Venda excluída.');
    renderVendas();
  } catch (err) { toast(err.message, true); }
}
async function formVenda() {
  const disponiveis = CACHE_VEICULOS.filter(v => v.status === 'disponivel');
  if (!disponiveis.length) { toast('Não há veículos disponíveis para venda.', true); return; }
  abrirModal(`
    <h2>Nova venda</h2>
    <form id="form-venda">
      <label>Veículo<select required id="vd-veiculo">${opcoesVeiculos(disponiveis)}</select></label>
      <label>Cliente<select required id="vd-cliente">${opcoesClientes()}</select></label>
      <div class="form-linha">
        <label>Valor (R$)<input required id="vd-valor" type="number" step="0.01" /></label>
        <label>Forma de pagamento
          <select id="vd-forma"><option>À vista</option><option>Financiado</option><option>Pix</option><option>Cartão</option></select>
        </label>
      </div>
      <div class="modal-acoes">
        <button type="button" class="btn-secundario" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn-primario">Registrar</button>
      </div>
    </form>`);
  const vSel = document.getElementById('vd-veiculo');
  const preencherValor = () => {
    const v = disponiveis.find(x => x.id == vSel.value);
    if (v?.valor_venda) document.getElementById('vd-valor').value = v.valor_venda;
  };
  vSel.addEventListener('change', preencherValor);
  preencherValor();
  document.getElementById('form-venda').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = {
      veiculo_id: Number(document.getElementById('vd-veiculo').value),
      cliente_id: Number(document.getElementById('vd-cliente').value),
      valor: Number(document.getElementById('vd-valor').value),
      forma_pagamento: document.getElementById('vd-forma').value,
      criado_por: PERFIL.id,
    };
    try {
      await vendasApi.criar(dados);
      fecharModal(); toast('Venda registrada.');
      await veiculosApi.listar().then(l => CACHE_VEICULOS = l);
      renderVendas();
    } catch (err) { toast(err.message, true); }
  });
}

// ---------- EQUIPE ----------
async function carregarUsuarios() {
  const el = document.getElementById('view-usuarios');
  if (PERFIL.papel !== 'admin') { el.innerHTML = `<div class="vazio">Apenas administradores podem ver esta área.</div>`; return; }
  el.innerHTML = `
    <div class="view-header">
      <div><h1>Equipe</h1><div class="sub">Funcionários com acesso ao sistema</div></div>
    </div>
    <p class="sub" style="margin-bottom:16px">
      Para adicionar um funcionário, peça para ele criar a própria conta na tela de login
      ("Primeiro acesso"). Ele entra automaticamente como funcionário — use o botão abaixo
      pra promover a administrador quando quiser.
    </p>
    <div class="tabela-wrap"><table><thead><tr><th>Nome</th><th>Papel</th><th>Desde</th><th></th></tr></thead><tbody id="tbody-usuarios"></tbody></table></div>
  `;
  await renderUsuarios();
}
async function renderUsuarios() {
  try {
    const lista = await perfisApi.listar();
    document.getElementById('tbody-usuarios').innerHTML = lista.map(u => `
      <tr>
        <td>${u.nome}</td>
        <td><span class="tag ${u.papel === 'admin' ? 'tag-quitado' : 'tag-aberto'}">${u.papel === 'admin' ? 'Administrador' : 'Funcionário'}</span></td>
        <td>${dataBr(u.criado_em)}</td>
        <td>${u.id === PERFIL.id
          ? '<span class="sub">Você</span>'
          : `<button class="btn-secundario" onclick="alternarPapel('${u.id}', '${u.papel}')">${u.papel === 'admin' ? 'Rebaixar a funcionário' : 'Promover a admin'}</button>`}
        </td>
      </tr>`).join('');
  } catch (err) { toast(err.message, true); }
}
async function alternarPapel(id, papelAtual) {
  const novoPapel = papelAtual === 'admin' ? 'funcionario' : 'admin';
  const confirmacao = novoPapel === 'admin'
    ? 'Promover este usuário a administrador? Ele passará a ver e editar tudo, inclusive a equipe.'
    : 'Rebaixar este administrador a funcionário comum?';
  if (!confirm(confirmacao)) return;
  try {
    await perfisApi.atualizarPapel(id, novoPapel);
    toast('Papel atualizado.');
    renderUsuarios();
  } catch (err) { toast(err.message, true); }
}
