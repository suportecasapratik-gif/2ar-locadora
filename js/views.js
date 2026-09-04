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

// ---------- PAINEL ----------
async function carregarDashboard() {
  const el = document.getElementById('view-dashboard');
  el.innerHTML = `<div class="view-header"><div><h1>Painel</h1><div class="sub">Visão geral do pátio</div></div></div><div class="indicadores" id="ind-grid"></div>`;
  try {
    const d = await dashboardApi.resumo();
    document.getElementById('ind-grid').innerHTML = `
      <div class="indicador destaque"><div class="rotulo">A receber (fiado)</div><div class="valor">${moeda(d.fiado_a_receber)}</div></div>
      <div class="indicador ${d.fiados_atrasados > 0 ? 'alerta' : ''}"><div class="rotulo">Fiados atrasados</div><div class="valor">${d.fiados_atrasados}</div></div>
      <div class="indicador"><div class="rotulo">Locações ativas</div><div class="valor">${d.locacoes_ativas}</div></div>
      <div class="indicador"><div class="rotulo">Veículos disponíveis</div><div class="valor">${d.veiculos_disponiveis}</div></div>
      <div class="indicador"><div class="rotulo">Vendas do mês</div><div class="valor">${moeda(d.vendas_mes)}</div></div>
      <div class="indicador"><div class="rotulo">Clientes cadastrados</div><div class="valor">${d.clientes_total}</div></div>
    `;
  } catch (err) { toast(err.message, true); }
}

// ---------- CLIENTES ----------
async function carregarClientes() {
  const el = document.getElementById('view-clientes');
  el.innerHTML = `
    <div class="view-header">
      <div><h1>Clientes</h1><div class="sub">Cadastro geral</div></div>
      <button class="btn-primario" id="btn-novo-cliente">+ Novo cliente</button>
    </div>
    <div class="toolbar"><input type="text" id="busca-cliente" placeholder="Buscar por nome, CPF ou telefone..." /></div>
    <div class="tabela-wrap"><table><thead><tr><th>Nome</th><th>Telefone</th><th>CPF</th><th>Endereço</th><th></th></tr></thead><tbody id="tbody-clientes"></tbody></table></div>
  `;
  document.getElementById('btn-novo-cliente').onclick = () => formCliente();
  document.getElementById('busca-cliente').addEventListener('input', (e) => renderClientes(e.target.value));
  await renderClientes();
}
async function renderClientes(busca) {
  try {
    const lista = await clientesApi.listar(busca);
    CACHE_CLIENTES = lista;
    const tbody = document.getElementById('tbody-clientes');
    if (!lista.length) { tbody.innerHTML = `<tr><td colspan="5" class="vazio">Nenhum cliente cadastrado ainda.</td></tr>`; return; }
    tbody.innerHTML = lista.map(c => `
      <tr>
        <td>${c.nome}</td><td>${c.telefone || '—'}</td><td>${c.cpf || '—'}</td><td>${c.endereco || '—'}</td>
        <td><button class="btn-secundario" onclick="formCliente(${c.id})">Editar</button></td>
      </tr>`).join('');
  } catch (err) { toast(err.message, true); }
}
async function formCliente(id) {
  let c = { nome: '', cpf: '', telefone: '', endereco: '', observacoes: '' };
  if (id) c = await clientesApi.obter(id);
  abrirModal(`
    <h2>${id ? 'Editar cliente' : 'Novo cliente'}</h2>
    <form id="form-cliente">
      <label>Nome<input required id="c-nome" value="${c.nome}" /></label>
      <div class="form-linha">
        <label>Telefone<input id="c-telefone" value="${c.telefone || ''}" /></label>
        <label>CPF<input id="c-cpf" value="${c.cpf || ''}" /></label>
      </div>
      <label>Endereço<input id="c-endereco" value="${c.endereco || ''}" /></label>
      <label>Observações<textarea id="c-obs" rows="2">${c.observacoes || ''}</textarea></label>
      <div class="modal-acoes">
        <button type="button" class="btn-secundario" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn-primario">Salvar</button>
      </div>
    </form>`);
  document.getElementById('form-cliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = {
      nome: document.getElementById('c-nome').value.trim(),
      telefone: document.getElementById('c-telefone').value.trim(),
      cpf: document.getElementById('c-cpf').value.trim(),
      endereco: document.getElementById('c-endereco').value.trim(),
      observacoes: document.getElementById('c-obs').value.trim(),
    };
    try {
      if (id) await clientesApi.atualizar(id, dados);
      else await clientesApi.criar(dados);
      fecharModal(); toast('Cliente salvo.'); renderClientes();
    } catch (err) { toast(err.message, true); }
  });
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
    </div>
    <div class="tabela-wrap"><table><thead><tr><th>Placa</th><th>Veículo</th><th>Ano</th><th>Status</th><th>Venda</th><th>Diária</th><th></th></tr></thead><tbody id="tbody-veiculos"></tbody></table></div>
  `;
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
        <td>${v.placa}</td><td>${v.marca ? v.marca + ' ' : ''}${v.modelo}</td><td>${v.ano || '—'}</td>
        <td><span class="tag tag-${v.status}">${rotuloStatusVeiculo(v.status)}</span></td>
        <td>${v.valor_venda ? moeda(v.valor_venda) : '—'}</td>
        <td>${v.valor_diaria ? moeda(v.valor_diaria) : '—'}</td>
        <td><button class="btn-secundario" onclick="formVeiculo(${v.id})">Editar</button></td>
      </tr>`).join('');
  } catch (err) { toast(err.message, true); }
}
async function formVeiculo(id) {
  let v = { placa: '', marca: '', modelo: '', ano: '', cor: '', status: 'disponivel', valor_venda: '', valor_diaria: '', km: '' };
  if (id) v = CACHE_VEICULOS.find(x => x.id === id) || v;
  abrirModal(`
    <h2>${id ? 'Editar veículo' : 'Novo veículo'}</h2>
    <form id="form-veiculo">
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
      <div class="modal-acoes">
        <button type="button" class="btn-secundario" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn-primario">Salvar</button>
      </div>
    </form>`);
  document.getElementById('form-veiculo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = {
      placa: document.getElementById('v-placa').value.trim().toUpperCase(),
      marca: document.getElementById('v-marca').value.trim(),
      modelo: document.getElementById('v-modelo').value.trim(),
      ano: Number(document.getElementById('v-ano').value) || null,
      cor: document.getElementById('v-cor').value.trim(),
      km: Number(document.getElementById('v-km').value) || null,
      valor_venda: Number(document.getElementById('v-venda').value) || null,
      valor_diaria: Number(document.getElementById('v-diaria').value) || null,
    };
    try {
      if (id) {
        dados.status = document.getElementById('v-status').value;
        await veiculosApi.atualizar(id, dados);
      } else {
        dados.status = 'disponivel';
        await veiculosApi.criar(dados);
      }
      fecharModal(); toast('Veículo salvo.'); renderVeiculos();
    } catch (err) { toast(err.message, true); }
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
  document.getElementById('filtro-status-fiado').addEventListener('change', (e) => renderFiado(e.target.value));
  await renderFiado();
}
async function renderFiado(status) {
  try {
    const lista = await fiadoApi.listar(status);
    const tbody = document.getElementById('tbody-fiado');
    if (!lista.length) { tbody.innerHTML = `<tr><td colspan="7" class="vazio">Nenhum fiado registrado ainda.</td></tr>`; return; }
    tbody.innerHTML = lista.map(f => `
      <tr>
        <td>${f.cliente_nome}</td><td>${f.descricao}</td><td>${moeda(f.valor_total)}</td><td>${moeda(f.saldo)}</td>
        <td>${dataBr(f.vencimento)}</td><td><span class="tag tag-${f.status}">${rotuloStatusFiado(f.status)}</span></td>
        <td>${f.saldo > 0 ? `<button class="btn-secundario" onclick="formPagamento(${f.id}, ${f.saldo})">Receber</button>` : ''}</td>
      </tr>`).join('');
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
    <div class="tabela-wrap"><table><thead><tr><th>Veículo</th><th>Cliente</th><th>Início</th><th>Fim previsto</th><th>Diária</th><th>Status</th><th></th></tr></thead><tbody id="tbody-locacoes"></tbody></table></div>
  `;
  if (!CACHE_CLIENTES.length) await clientesApi.listar().then(l => CACHE_CLIENTES = l);
  await veiculosApi.listar().then(l => CACHE_VEICULOS = l);
  document.getElementById('btn-nova-locacao').onclick = () => formLocacao();
  await renderLocacoes();
}
async function renderLocacoes() {
  try {
    const lista = await locacoesApi.listar();
    const tbody = document.getElementById('tbody-locacoes');
    if (!lista.length) { tbody.innerHTML = `<tr><td colspan="7" class="vazio">Nenhuma locação registrada ainda.</td></tr>`; return; }
    tbody.innerHTML = lista.map(l => `
      <tr>
        <td>${l.placa} — ${l.modelo}</td><td>${l.cliente_nome}</td><td>${dataBr(l.data_inicio)}</td>
        <td>${dataBr(l.data_fim_prevista)}</td><td>${moeda(l.valor_diaria)}</td>
        <td><span class="tag tag-${l.status}">${rotuloStatusLocacao(l.status)}</span></td>
        <td>${l.status === 'ativa' ? `<button class="btn-secundario" onclick="finalizarLocacao(${l.id}, ${l.veiculo_id})">Finalizar</button>` : ''}</td>
      </tr>`).join('');
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

// ---------- VENDAS ----------
async function carregarVendas() {
  const el = document.getElementById('view-vendas');
  el.innerHTML = `
    <div class="view-header">
      <div><h1>Venda</h1><div class="sub">Venda de veículos</div></div>
      <button class="btn-primario" id="btn-nova-venda">+ Nova venda</button>
    </div>
    <div class="tabela-wrap"><table><thead><tr><th>Veículo</th><th>Cliente</th><th>Valor</th><th>Forma</th><th>Data</th></tr></thead><tbody id="tbody-vendas"></tbody></table></div>
  `;
  if (!CACHE_CLIENTES.length) await clientesApi.listar().then(l => CACHE_CLIENTES = l);
  await veiculosApi.listar().then(l => CACHE_VEICULOS = l);
  document.getElementById('btn-nova-venda').onclick = () => formVenda();
  await renderVendas();
}
async function renderVendas() {
  try {
    const lista = await vendasApi.listar();
    const tbody = document.getElementById('tbody-vendas');
    if (!lista.length) { tbody.innerHTML = `<tr><td colspan="5" class="vazio">Nenhuma venda registrada ainda.</td></tr>`; return; }
    tbody.innerHTML = lista.map(v => `
      <tr><td>${v.placa} — ${v.modelo}</td><td>${v.cliente_nome}</td><td>${moeda(v.valor)}</td><td>${v.forma_pagamento || '—'}</td><td>${dataBr(v.data_venda)}</td></tr>`).join('');
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
      ("Primeiro acesso"). Ele entra automaticamente como funcionário — você pode promovê-lo
      a administrador depois, editando a tabela <code>perfis</code> no painel do Supabase.
    </p>
    <div class="tabela-wrap"><table><thead><tr><th>Nome</th><th>Papel</th><th>Desde</th></tr></thead><tbody id="tbody-usuarios"></tbody></table></div>
  `;
  try {
    const lista = await perfisApi.listar();
    document.getElementById('tbody-usuarios').innerHTML = lista.map(u => `
      <tr><td>${u.nome}</td><td>${u.papel === 'admin' ? 'Administrador' : 'Funcionário'}</td><td>${dataBr(u.criado_em)}</td></tr>`).join('');
  } catch (err) { toast(err.message, true); }
}
