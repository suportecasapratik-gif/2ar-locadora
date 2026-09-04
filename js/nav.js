// ==================================================================
// Navegação e inicialização do app.html
// ==================================================================

let PERFIL = null;

async function iniciarApp() {
  try {
    console.log('Iniciando app...');
    const sessao = await exigirSessao();
    if (!sessao) {
      console.log('Sem sessão, redirecionando para login');
      return;
    }

    PERFIL = await obterPerfil();
    if (!PERFIL) { 
      toast('Não foi possível carregar seu perfil.', true); 
      return; 
    }

    console.log('Perfil carregado:', PERFIL);
    document.getElementById('usuario-info').innerHTML =
      `<strong>${PERFIL.nome}</strong><br/>${PERFIL.papel === 'admin' ? 'Administrador' : 'Funcionário'}`;
    document.getElementById('nav-usuarios').style.display = PERFIL.papel === 'admin' ? '' : 'none';

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.onclick = () => mostrarView(btn.dataset.view);
    });
    document.getElementById('btn-sair').onclick = sair;

    mostrarView('dashboard');
  } catch (err) {
    console.error('Erro ao iniciar app:', err);
    toast('Erro ao iniciar: ' + err.message, true);
  }
}

function mostrarView(nome) {
  try {
    console.log('Mostrando view:', nome);
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
    if (carregadores[nome]) {
      carregadores[nome]();
    } else {
      console.error('Carregador não encontrado para view:', nome);
    }
  } catch (err) {
    console.error('Erro ao mostrar view:', err);
    toast('Erro: ' + err.message, true);
  }
}

document.addEventListener('DOMContentLoaded', iniciarApp);
