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

// Exporta uma lista de objetos para CSV e dispara o download.
// colunas: [{ titulo: 'Nome', campo: 'nome' }, ...]
function exportarCSV(nomeArquivo, colunas, linhas) {
  if (!linhas.length) { toast('Nada para exportar.', true); return; }
  const cabecalho = colunas.map(c => c.titulo).join(';');
  const corpo = linhas.map(linha =>
    colunas.map(c => `"${String(linha[c.campo] ?? '').replace(/"/g, '""')}"`).join(';')
  ).join('\n');
  const csv = '\uFEFF' + cabecalho + '\n' + corpo;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${nomeArquivo}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
