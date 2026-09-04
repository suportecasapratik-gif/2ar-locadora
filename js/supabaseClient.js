// ==================================================================
// Conexão com o Supabase.
// ==================================================================
const SUPABASE_URL = 'https://twnhwzuwankvzsrctvqh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZWABTMRodGlCtgsF7KVKTw_6-Pi0EGK';

// Importa o Supabase
const { createClient } = window.supabase;

// Cria a conexão
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
