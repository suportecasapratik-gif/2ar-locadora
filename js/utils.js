// ==================================================================
// Utilitários compartilhados
// ==================================================================

function moeda(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataBr(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d)) return v;
  return d.toLocaleDateString('pt-BR');
}

function toast(msg, isErro) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.toggle('erro-toast', !!isErro);
  el.classList.remove('oculto');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('oculto'), 3500);
}

const modalFundo = () => document.getElementById('modal-fundo');
const modalConteudo = () => document.getElementById('modal-conteudo');

function abrirModal(html) {
  modalConteudo().innerHTML = html;
  modalFundo().classList.remove('oculto');
}
function fecharModal() {
  modalFundo().classList.add('oculto');
}
