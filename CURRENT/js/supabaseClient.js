// ==================================================================
// Conexão com o Supabase.
// Troque SUPABASE_URL pela URL do SEU projeto (Project Settings > API).
// A chave abaixo é a "publishable" (anon) key — pode ficar exposta no
// frontend, ela não dá acesso além do que as políticas RLS permitem.
// ==================================================================
const SUPABASE_URL = 'https://twnhwzuwankvzsrctvqh.supabase.co'; // <-- TROQUE AQUI
const SUPABASE_ANON_KEY = 'sb_publishable_ZWABTMRodGlCtgsF7KVKTw_6-Pi0EGK';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
