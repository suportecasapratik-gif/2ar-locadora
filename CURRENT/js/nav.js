// ==================================================================
// Navegação e inicialização do app.html
// ==================================================================

let PERFIL = null;

async function iniciarApp() {
  const sessao = await exigirSessao();
  if (!sessao) return;

  PERFIL = await obterPerfil();
  if (!PERFIL) { toast('Não foi possível carregar seu perfil.', true); return; }

  document.getElementById('usuario-info').innerHTML =
    `<strong>${PERFIL.nome}</strong>${PERFIL.papel === 'admin' ? 'Administrador' : 'Funcionário'}`;
  document.getElementById('nav-usuarios').style.display = PERFIL.papel === 'admin' ? '' : 'none';

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => mostrarView(btn.dataset.view);
  });
  document.getElementById('btn-sair').onclick = sair;

  mostrarView('dashboard');
}

function mostrarView(nome) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('ativo', b.dataset.view === nome));
  document.querySelectorAll('.view').forEach(v => v.classList.add('oculto'));
  document.getElementById(`view-${nome}`).classList.remove('oculto');
  const carregadores = {
    dashboard: carregarDashboard,
    fiado: carregarFiado,
    locacoes: carregarLocacoes,
    vendas: carregarVendas,
    veiculos: carregarVeiculos,
    clientes: carregarClientes,
    usuarios: carregarUsuarios,
  };
  carregadores[nome]?.();
}

document.addEventListener('DOMContentLoaded', iniciarApp);
