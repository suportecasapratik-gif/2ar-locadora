// ==================================================================
// API — funções de acesso a dados (Supabase) por módulo.
// Cada função lança um Error com mensagem em português quando falha.
// ==================================================================

function checarErro(error, mensagemPadrao) {
  if (error) throw new Error(error.message || mensagemPadrao);
}

// ---------- DASHBOARD ----------
const dashboardApi = {
  async resumo() {
    const [{ data: fiados }, { data: pagamentos }, { data: veiculos },
           { data: locacoesAtivas }, { data: clientes }, { data: vendas }] = await Promise.all([
      sb.from('fiados').select('valor_total,status'),
      sb.from('fiado_pagamentos').select('valor'),
      sb.from('veiculos').select('status'),
      sb.from('locacoes').select('id').eq('status', 'ativa'),
      sb.from('clientes').select('id'),
      sb.from('vendas').select('valor,data_venda'),
    ]);

    const totalDevido = (fiados || []).reduce((s, f) => s + Number(f.valor_total), 0);
    const totalPago = (pagamentos || []).reduce((s, p) => s + Number(p.valor), 0);
    const fiadosAtrasados = (fiados || []).filter(f => f.status === 'atrasado').length;

    const porStatusVeiculo = {};
    (veiculos || []).forEach(v => { porStatusVeiculo[v.status] = (porStatusVeiculo[v.status] || 0) + 1; });

    const hoje = new Date();
    const vendasMes = (vendas || [])
      .filter(v => {
        const d = new Date(v.data_venda);
        return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
      })
      .reduce((s, v) => s + Number(v.valor), 0);

    return {
      fiado_a_receber: totalDevido - totalPago,
      fiados_atrasados: fiadosAtrasados,
      locacoes_ativas: (locacoesAtivas || []).length,
      clientes_total: (clientes || []).length,
      vendas_mes: vendasMes,
      veiculos_disponiveis: porStatusVeiculo.disponivel || 0,
    };
  },

  // Receita mensal (últimos N meses) para o gráfico do painel.
  async receitaMensal(meses = 6) {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1), 1);
    const inicioISO = inicio.toISOString();
    const inicioData = inicioISO.slice(0, 10);

    const [{ data: pagamentos }, { data: locacoes }, { data: vendas }] = await Promise.all([
      sb.from('fiado_pagamentos').select('valor,data_pagamento').gte('data_pagamento', inicioISO),
      sb.from('locacoes').select('valor_total,data_fim_real').eq('status', 'finalizada').gte('data_fim_real', inicioData),
      sb.from('vendas').select('valor,data_venda').gte('data_venda', inicioISO),
    ]);

    const chaveMes = (dataStr) => {
      const d = new Date(dataStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const chaves = [];
    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      chaves.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const zerar = () => Object.fromEntries(chaves.map(k => [k, 0]));
    const fiadoPorMes = zerar(), locacaoPorMes = zerar(), vendaPorMes = zerar();

    (pagamentos || []).forEach(p => { const k = chaveMes(p.data_pagamento); if (k in fiadoPorMes) fiadoPorMes[k] += Number(p.valor); });
    (locacoes || []).forEach(l => { if (!l.data_fim_real) return; const k = chaveMes(l.data_fim_real); if (k in locacaoPorMes) locacaoPorMes[k] += Number(l.valor_total || 0); });
    (vendas || []).forEach(v => { const k = chaveMes(v.data_venda); if (k in vendaPorMes) vendaPorMes[k] += Number(v.valor); });

    return {
      labels: chaves,
      fiado: chaves.map(k => fiadoPorMes[k]),
      locacao: chaves.map(k => locacaoPorMes[k]),
      venda: chaves.map(k => vendaPorMes[k]),
    };
  },
};

// ---------- CLIENTES ----------
const clientesApi = {
  async listar(busca) {
    let query = sb.from('clientes').select('*').order('nome');
    if (busca) query = query.or(`nome.ilike.%${busca}%,cpf.ilike.%${busca}%,telefone.ilike.%${busca}%`);
    const { data, error } = await query;
    checarErro(error, 'Erro ao carregar clientes.');
    return data;
  },
  async obter(id) {
    const { data, error } = await sb.from('clientes').select('*').eq('id', id).single();
    checarErro(error, 'Cliente não encontrado.');
    return data;
  },
  async criar(dados) {
    const { data, error } = await sb.from('clientes').insert(dados).select().single();
    checarErro(error, 'Erro ao criar cliente.');
    return data;
  },
  async atualizar(id, dados) {
    const { error } = await sb.from('clientes').update(dados).eq('id', id);
    checarErro(error, 'Erro ao atualizar cliente.');
  },
};

// ---------- VEÍCULOS ----------
const veiculosApi = {
  async listar(status) {
    let query = sb.from('veiculos').select('*').order('modelo');
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    checarErro(error, 'Erro ao carregar veículos.');
    return data;
  },
  async criar(dados) {
    const { data, error } = await sb.from('veiculos').insert(dados).select().single();
    if (error?.code === '23505') throw new Error('Já existe um veículo com essa placa.');
    checarErro(error, 'Erro ao cadastrar veículo.');
    return data;
  },
  async atualizar(id, dados) {
    const { error } = await sb.from('veiculos').update(dados).eq('id', id);
    checarErro(error, 'Erro ao atualizar veículo.');
  },
};

// ---------- FIADO ----------
const fiadoApi = {
  async listar(status) {
    let query = sb
      .from('fiados')
      .select('*, clientes(nome), fiado_pagamentos(valor)')
      .order('data_venda', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    checarErro(error, 'Erro ao carregar fiados.');
    return (data || []).map(f => {
      const pago = (f.fiado_pagamentos || []).reduce((s, p) => s + Number(p.valor), 0);
      return { ...f, cliente_nome: f.clientes?.nome, valor_pago: pago, saldo: f.valor_total - pago };
    });
  },
  async criar(dados) {
    const { data, error } = await sb.from('fiados').insert(dados).select().single();
    checarErro(error, 'Erro ao registrar fiado.');
    return data;
  },
  async registrarPagamento(fiadoId, valor, formaPagamento) {
    const { error: e1 } = await sb
      .from('fiado_pagamentos')
      .insert({ fiado_id: fiadoId, valor, forma_pagamento: formaPagamento });
    checarErro(e1, 'Erro ao registrar pagamento.');
    const { error: e2 } = await sb.rpc('recalcular_status_fiado', { p_fiado_id: fiadoId });
    checarErro(e2, 'Pagamento salvo, mas o status não pôde ser recalculado.');
  },
};

// ---------- LOCAÇÕES ----------
const locacoesApi = {
  async listar() {
    const { data, error } = await sb
      .from('locacoes')
      .select('*, veiculos(placa,modelo), clientes(nome)')
      .order('data_inicio', { ascending: false });
    checarErro(error, 'Erro ao carregar locações.');
    return (data || []).map(l => ({
      ...l, placa: l.veiculos?.placa, modelo: l.veiculos?.modelo, cliente_nome: l.clientes?.nome,
    }));
  },
  async criar(dados) {
    const { data: veiculo, error: eV } = await sb.from('veiculos').select('status').eq('id', dados.veiculo_id).single();
    checarErro(eV, 'Veículo não encontrado.');
    if (veiculo.status !== 'disponivel') throw new Error('Veículo não está disponível para locação.');

    const { data, error } = await sb.from('locacoes').insert(dados).select().single();
    checarErro(error, 'Erro ao registrar locação.');
    const { error: eU } = await sb.from('veiculos').update({ status: 'alugado' }).eq('id', dados.veiculo_id);
    checarErro(eU, 'Locação criada, mas o status do veículo não pôde ser atualizado.');
    return data;
  },
  async finalizar(id, veiculoId, dataFimReal, valorTotal) {
    const { error: e1 } = await sb
      .from('locacoes')
      .update({ status: 'finalizada', data_fim_real: dataFimReal, valor_total: valorTotal })
      .eq('id', id);
    checarErro(e1, 'Erro ao finalizar locação.');
    const { error: e2 } = await sb.from('veiculos').update({ status: 'disponivel' }).eq('id', veiculoId);
    checarErro(e2, 'Locação finalizada, mas o veículo não pôde ser liberado.');
  },
};

// ---------- VENDAS ----------
const vendasApi = {
  async listar() {
    const { data, error } = await sb
      .from('vendas')
      .select('*, veiculos(placa,modelo), clientes(nome)')
      .order('data_venda', { ascending: false });
    checarErro(error, 'Erro ao carregar vendas.');
    return (data || []).map(v => ({
      ...v, placa: v.veiculos?.placa, modelo: v.veiculos?.modelo, cliente_nome: v.clientes?.nome,
    }));
  },
  async criar(dados) {
    const { data: veiculo, error: eV } = await sb.from('veiculos').select('status').eq('id', dados.veiculo_id).single();
    checarErro(eV, 'Veículo não encontrado.');
    if (veiculo.status === 'vendido') throw new Error('Este veículo já foi vendido.');

    const { data, error } = await sb.from('vendas').insert(dados).select().single();
    checarErro(error, 'Erro ao registrar venda.');
    const { error: eU } = await sb.from('veiculos').update({ status: 'vendido' }).eq('id', dados.veiculo_id);
    checarErro(eU, 'Venda criada, mas o status do veículo não pôde ser atualizado.');
    return data;
  },
};

// ---------- EQUIPE (perfis) ----------
const perfisApi = {
  async listar() {
    const { data, error } = await sb.from('perfis').select('*').order('criado_em');
    checarErro(error, 'Erro ao carregar a equipe.');
    return data;
  },
};
