// ==================================================================
// Autenticação (usado por index.html e app.html)
// ==================================================================

async function obterSessao() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

async function obterPerfil() {
  const sessao = await obterSessao();
  if (!sessao) return null;
  const { data, error } = await sb
    .from('perfis')
    .select('*')
    .eq('id', sessao.user.id)
    .single();
  if (error) { console.error(error); return null; }
  return { ...data, email: sessao.user.email };
}

async function entrar(email, senha) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error(traduzErroAuth(error.message));
  return data;
}

async function cadastrar(nome, email, senha) {
  const { data, error } = await sb.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });
  if (error) throw new Error(traduzErroAuth(error.message));
  return data;
}

async function sair() {
  await sb.auth.signOut();
  location.href = 'index.html';
}

// Envia o email de redefinição de senha. O link do email traz a pessoa de volta
// para index.html já autenticada em modo "recovery" (ver escutarRecuperacaoSenha).
async function recuperarSenha(email) {
  const redirectTo = location.origin + location.pathname.replace(/[^/]*$/, '') + 'index.html';
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(traduzErroAuth(error.message));
}

// Define a nova senha depois que a pessoa clicou no link do email.
async function definirNovaSenha(novaSenha) {
  const { error } = await sb.auth.updateUser({ password: novaSenha });
  if (error) throw new Error(traduzErroAuth(error.message));
}

// Chame isso na página de login: dispara o callback quando o Supabase detecta
// que a pessoa chegou através do link de recuperação de senha.
function escutarRecuperacaoSenha(callback) {
  sb.auth.onAuthStateChange((evento) => {
    if (evento === 'PASSWORD_RECOVERY') callback();
  });
}

function traduzErroAuth(msg) {
  const mapa = {
    'Invalid login credentials': 'Email ou senha incorretos.',
    'User already registered': 'Já existe uma conta com esse email.',
    'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
  };
  return mapa[msg] || msg;
}

// Protege app.html: redireciona para o login se não houver sessão válida.
async function exigirSessao() {
  const sessao = await obterSessao();
  if (!sessao) { location.href = 'index.html'; return null; }
  return sessao;
}
