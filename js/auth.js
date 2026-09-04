// ==================================================================
// Autenticação (usado por index.html e app.html)
// ==================================================================

async function obterSessao() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

async function obterPerfil() {
  const sessao = await obterSessao();
  if (!sessao) return null;
  const { data, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', sessao.user.id)
    .single();
  if (error) { console.error(error); return null; }
  return { ...data, email: sessao.user.email };
}

async function entrar(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error(traduzErroAuth(error.message));
  return data;
}

async function cadastrar(nome, email, senha) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });
  if (error) throw new Error(traduzErroAuth(error.message));
  return data;
}

async function sair() {
  await supabase.auth.signOut();
  location.href = 'index.html';
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
