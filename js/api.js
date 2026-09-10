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
      sb.from('clientes').select('id,status'),
      sb.from('vendas').select('valor,data_venda'),
    ]);

    const totalDevido = (fiados || []).reduce((s, f) => s + Number(f.valor_total), 0);
    const totalPago = (pagamentos || []).reduce((s, p) => s + Number(p.valor), 0);
    const fiadosAtrasados = (fiados || []).filter(f => f.status === 'atrasado').length;

    const porStatusVeiculo = {};
    (veiculos || []).forEach(v => { porStatusVeiculo[v.status] = (porStatusVeiculo[v.status] || 0) + 1; });

    const clientesInativos = (clientes || []).filter(c => c.status === 'inativo').length;

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
      clientes_inativos: clientesInativos,
      vendas_mes: vendasMes,
      veiculos_disponiveis: porStatusVeiculo.disponivel || 0,
      veiculos_manutencao: porStatusVeiculo.manutencao || 0,
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

  // Fiados com vencimento nos próximos 7 dias, ainda não quitados.
  async vencendoEmBreve() {
    const hoje = new Date().toISOString().slice(0, 10);
    const em7dias = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    const { data: parcelas, error: e1 } = await sb
      .from('fiado_parcelas')
      .select('*, fiados(descricao, clientes(nome))')
      .eq('status', 'pendente')
      .gte('vencimento', hoje)
      .lte('vencimento', em7dias)
      .order('vencimento', { ascending: true });
    checarErro(e1, 'Erro ao carregar parcelas a vencer.');

    const { data: fiadosSimples, error: e2 } = await sb
      .from('fiados')
      .select('*, clientes(nome), fiado_pagamentos(valor), fiado_parcelas(id)')
      .neq('status', 'quitado')
      .gte('vencimento', hoje)
      .lte('vencimento', em7dias);
    checarErro(e2, 'Erro ao carregar fiados a vencer.');

    const doParcelas = (parcelas || []).map(p => ({
      cliente_nome: p.fiados?.clientes?.nome, descricao: `${p.fiados?.descricao} (parcela ${p.numero})`,
      saldo: p.valor, vencimento: p.vencimento,
    }));
    const doSimples = (fiadosSimples || [])
      .filter(f => !f.fiado_parcelas?.length) // evita duplicar quem já apareceu via parcelas
      .map(f => {
        const pago = (f.fiado_pagamentos || []).reduce((s, p) => s + Number(p.valor), 0);
        return { cliente_nome: f.clientes?.nome, descricao: f.descricao, saldo: f.valor_total - pago, vencimento: f.vencimento };
      });

    return [...doParcelas, ...doSimples].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  },

  // Clientes ativos com CNH cadastrada e vencida (ou vencendo em 30 dias) —
  // relevante pra locação, que exige CNH válida.
  async cnhVencendo() {
    const em30dias = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const { data, error } = await sb
      .from('clientes')
      .select('id,nome,cnh,cnh_vencimento')
      .eq('status', 'ativo')
      .not('cnh', 'is', null)
      .not('cnh_vencimento', 'is', null)
      .lte('cnh_vencimento', em30dias)
      .order('cnh_vencimento', { ascending: true });
    checarErro(error, 'Erro ao carregar CNHs a vencer.');
    return data || [];
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
  async excluir(id) {
    const { error } = await sb.from('clientes').delete().eq('id', id);
    checarErro(error, 'Erro ao excluir cliente. Verifique se ele não tem fiados, locações ou vendas vinculados.');
  },
  async historico(id) {
    const [{ data: fiados, error: e1 }, { data: locacoes, error: e2 }, { data: vendas, error: e3 }] = await Promise.all([
      sb.from('fiados').select('*, fiado_pagamentos(valor)').eq('cliente_id', id).order('data_venda', { ascending: false }),
      sb.from('locacoes').select('*, veiculos(placa,modelo)').eq('cliente_id', id).order('data_inicio', { ascending: false }),
      sb.from('vendas').select('*, veiculos(placa,modelo)').eq('cliente_id', id).order('data_venda', { ascending: false }),
    ]);
    checarErro(e1 || e2 || e3, 'Erro ao carregar histórico do cliente.');
    return {
      fiados: (fiados || []).map(f => {
        const pago = (f.fiado_pagamentos || []).reduce((s, p) => s + Number(p.valor), 0);
        return { ...f, saldo: f.valor_total - pago };
      }),
      locacoes: (locacoes || []).map(l => ({ ...l, placa: l.veiculos?.placa, modelo: l.veiculos?.modelo })),
      vendas: (vendas || []).map(v => ({ ...v, placa: v.veiculos?.placa, modelo: v.veiculos?.modelo })),
    };
  },
  async enviarFoto(cpfOuId, arquivo) {
    const extensao = arquivo.name.split('.').pop();
    const base = String(cpfOuId).replace(/\D/g, '') || 'cliente';
    const caminho = `${base}-${Date.now()}.${extensao}`;
    const { error } = await sb.storage.from('clientes-fotos').upload(caminho, arquivo, { upsert: true });
    checarErro(error, 'Erro ao enviar a foto.');
    const { data } = sb.storage.from('clientes-fotos').getPublicUrl(caminho);
    return data.publicUrl;
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
  async excluir(id) {
    const { error } = await sb.from('veiculos').delete().eq('id', id);
    checarErro(error, 'Erro ao excluir veículo. Verifique se ele não tem locações ou vendas vinculadas.');
  },
  // Envia a foto para o Storage e retorna a URL pública para salvar em foto_url.
  async enviarFoto(placa, arquivo) {
    const extensao = arquivo.name.split('.').pop();
    const caminho = `${placa}-${Date.now()}.${extensao}`;
    const { error } = await sb.storage.from('veiculos-fotos').upload(caminho, arquivo, { upsert: true });
    checarErro(error, 'Erro ao enviar a foto.');
    const { data } = sb.storage.from('veiculos-fotos').getPublicUrl(caminho);
    return data.publicUrl;
  },
};

// ---------- FIADO ----------
const fiadoApi = {
  async listar(status) {
    let query = sb
      .from('fiados')
      .select('*, clientes(nome), veiculos(placa,modelo), fiado_pagamentos(valor), fiado_parcelas(*)')
      .order('data_venda', { ascending: false });
    const { data, error } = await query;
    checarErro(error, 'Erro ao carregar fiados.');
    let lista = (data || []).map(f => enriquecerFiado(f));
    if (status) lista = lista.filter(f => f.status === status);
    return lista;
  },
  async criar(dados) {
    const { data, error } = await sb.from('fiados').insert(dados).select().single();
    checarErro(error, 'Erro ao registrar fiado.');
    if (dados.veiculo_id) await marcarVeiculoFiado(dados.veiculo_id);
    return data;
  },
  // Cria um fiado já com N parcelas geradas (mensal, a partir da primeira data).
  async criarComParcelas({ cliente_id, descricao, veiculo_id, numero_parcelas, valor_parcela, primeira_data, criado_por }) {
    const valorTotal = numero_parcelas * valor_parcela;
    const { data: fiado, error: e1 } = await sb
      .from('fiados')
      .insert({ cliente_id, descricao, veiculo_id: veiculo_id || null, valor_total: valorTotal, vencimento: primeira_data, criado_por })
      .select().single();
    checarErro(e1, 'Erro ao registrar fiado.');

    const parcelas = [];
    for (let i = 0; i < numero_parcelas; i++) {
      const d = new Date(primeira_data + 'T00:00:00');
      d.setMonth(d.getMonth() + i);
      parcelas.push({
        fiado_id: fiado.id,
        numero: i + 1,
        valor: valor_parcela,
        vencimento: d.toISOString().slice(0, 10),
        registrado_por: criado_por,
      });
    }
    const { error: e2 } = await sb.from('fiado_parcelas').insert(parcelas);
    checarErro(e2, 'Fiado criado, mas houve erro ao gerar as parcelas.');
    if (veiculo_id) await marcarVeiculoFiado(veiculo_id);
    return fiado;
  },
  async atualizar(id, dados) {
    const { error } = await sb.from('fiados').update(dados).eq('id', id);
    checarErro(error, 'Erro ao atualizar fiado.');
  },
  async registrarPagamento(fiadoId, valor, formaPagamento) {
    const { error: e1 } = await sb
      .from('fiado_pagamentos')
      .insert({ fiado_id: fiadoId, valor, forma_pagamento: formaPagamento });
    checarErro(e1, 'Erro ao registrar pagamento.');
    const { error: e2 } = await sb.rpc('recalcular_status_fiado', { p_fiado_id: fiadoId });
    checarErro(e2, 'Pagamento salvo, mas o status não pôde ser recalculado.');
    await liberarVeiculoSeQuitado(fiadoId);
  },
  // Marca uma parcela específica como paga e recalcula o status do fiado.
  async pagarParcela(parcelaId, fiadoId) {
    const { error: e1 } = await sb
      .from('fiado_parcelas')
      .update({ status: 'pago', pago_em: new Date().toISOString().slice(0, 10) })
      .eq('id', parcelaId);
    checarErro(e1, 'Erro ao registrar pagamento da parcela.');

    const { data: parcelas, error: e2 } = await sb.from('fiado_parcelas').select('*').eq('fiado_id', fiadoId);
    checarErro(e2, 'Parcela paga, mas não foi possível atualizar o status geral.');
    const hoje = new Date().toISOString().slice(0, 10);
    const pendentes = parcelas.filter(p => p.status === 'pendente');
    let novoStatus;
    if (!pendentes.length) novoStatus = 'quitado';
    else if (pendentes.some(p => p.vencimento < hoje)) novoStatus = 'atrasado';
    else if (pendentes.length < parcelas.length) novoStatus = 'parcial';
    else novoStatus = 'aberto';
    const proxima = pendentes.sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];
    const { error: e3 } = await sb.from('fiados').update({ status: novoStatus, vencimento: proxima?.vencimento || null }).eq('id', fiadoId);
    checarErro(e3, 'Parcela paga, mas o status do fiado não pôde ser atualizado.');
    if (novoStatus === 'quitado') await liberarVeiculoSeQuitado(fiadoId);
  },
  // Muda o valor e/ou a data de uma parcela específica (ex: mover a entrada pro
  // final, ou ajustar valores desiguais). Também refaz o valor_total do fiado.
  async editarParcela(parcelaId, fiadoId, { valor, vencimento }) {
    const { error: e1 } = await sb.from('fiado_parcelas').update({ valor, vencimento }).eq('id', parcelaId);
    checarErro(e1, 'Erro ao atualizar a parcela.');
    const { data: parcelas, error: e2 } = await sb.from('fiado_parcelas').select('valor').eq('fiado_id', fiadoId);
    checarErro(e2, 'Parcela atualizada, mas não foi possível recalcular o total.');
    const novoTotal = (parcelas || []).reduce((s, p) => s + Number(p.valor), 0);
    const { error: e3 } = await sb.from('fiados').update({ valor_total: novoTotal }).eq('id', fiadoId);
    checarErro(e3, 'Parcela atualizada, mas o total do fiado não pôde ser ajustado.');
  },
  async excluir(id) {
    const { data: fiado } = await sb.from('fiados').select('veiculo_id, status').eq('id', id).single();
    const { error: e0 } = await sb.from('fiado_parcelas').delete().eq('fiado_id', id);
    checarErro(e0, 'Erro ao excluir as parcelas deste fiado.');
    const { error: e1 } = await sb.from('fiado_pagamentos').delete().eq('fiado_id', id);
    checarErro(e1, 'Erro ao excluir os pagamentos deste fiado.');
    const { error: e2 } = await sb.from('fiados').delete().eq('id', id);
    checarErro(e2, 'Erro ao excluir fiado.');
    if (fiado?.veiculo_id) {
      const { error: e3 } = await sb.from('veiculos').update({ status: 'disponivel' }).eq('id', fiado.veiculo_id);
      checarErro(e3, 'Fiado excluído, mas o veículo não pôde ser liberado — ajuste o status dele manualmente.');
    }
  },
};

async function marcarVeiculoFiado(veiculoId) {
  const { error } = await sb.from('veiculos').update({ status: 'fiado' }).eq('id', veiculoId);
  checarErro(error, 'Fiado criado, mas o status do veículo não pôde ser atualizado.');
}
async function liberarVeiculoSeQuitado(fiadoId) {
  const { data: fiado } = await sb.from('fiados').select('veiculo_id').eq('id', fiadoId).single();
  if (fiado?.veiculo_id) {
    await sb.from('veiculos').update({ status: 'vendido' }).eq('id', fiado.veiculo_id);
  }
}
function enriquecerFiado(f) {
  const nome = f.clientes?.nome;
  const veiculoTexto = f.veiculos ? `${f.veiculos.placa} — ${f.veiculos.modelo}` : null;
  if (f.fiado_parcelas && f.fiado_parcelas.length) {
    const parcelas = [...f.fiado_parcelas].sort((a, b) => a.numero - b.numero);
    const pagas = parcelas.filter(p => p.status === 'pago');
    const pendentes = parcelas.filter(p => p.status === 'pendente');
    const saldo = pendentes.reduce((s, p) => s + Number(p.valor), 0);
    const hoje = new Date().toISOString().slice(0, 10);
    let status;
    if (!pendentes.length) status = 'quitado';
    else if (pendentes.some(p => p.vencimento < hoje)) status = 'atrasado';
    else if (pagas.length) status = 'parcial';
    else status = 'aberto';
    const proxima = pendentes[0];
    return {
      ...f, cliente_nome: nome, veiculo_texto: veiculoTexto, valor_pago: f.valor_total - saldo, saldo, status,
      parcelas, tem_parcelas: true,
      parcela_atual: pagas.length + (pendentes.length ? 1 : 0), total_parcelas: parcelas.length,
      vencimento: proxima?.vencimento || f.vencimento,
    };
  }
  const pago = (f.fiado_pagamentos || []).reduce((s, p) => s + Number(p.valor), 0);
  return { ...f, cliente_nome: nome, veiculo_texto: veiculoTexto, valor_pago: pago, saldo: f.valor_total - pago, tem_parcelas: false };
}

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
  async cancelar(id, veiculoId) {
    const { error: e1 } = await sb.from('locacoes').update({ status: 'cancelada' }).eq('id', id);
    checarErro(e1, 'Erro ao cancelar locação.');
    const { error: e2 } = await sb.from('veiculos').update({ status: 'disponivel' }).eq('id', veiculoId);
    checarErro(e2, 'Locação cancelada, mas o veículo não pôde ser liberado.');
  },
  async excluir(id) {
    const { error } = await sb.from('locacoes').delete().eq('id', id);
    checarErro(error, 'Erro ao excluir locação.');
  },
  async atualizar(id, dados) {
    const { error } = await sb.from('locacoes').update(dados).eq('id', id);
    checarErro(error, 'Erro ao atualizar locação.');
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
  async excluir(id) {
    const { error } = await sb.from('vendas').delete().eq('id', id);
    checarErro(error, 'Erro ao excluir venda.');
  },
  async atualizar(id, dados) {
    const { error } = await sb.from('vendas').update(dados).eq('id', id);
    checarErro(error, 'Erro ao atualizar venda.');
  },
};

// ---------- EQUIPE (perfis) ----------
const perfisApi = {
  async listar() {
    const { data, error } = await sb.from('perfis').select('*').order('criado_em');
    checarErro(error, 'Erro ao carregar a equipe.');
    return data;
  },
  async atualizarPapel(id, papel) {
    const { error } = await sb.from('perfis').update({ papel }).eq('id', id);
    checarErro(error, 'Erro ao atualizar o papel do usuário.');
  },
};
