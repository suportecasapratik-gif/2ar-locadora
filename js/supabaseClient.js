// ==================================================================
// Conexão com o Supabase.
// ==================================================================
const SUPABASE_URL = 'https://twnhwzuwankvzsrctvqh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_anonkey_ZWABTMRodGlCtgsF7KVKTw_6-Pi0EGK';

// Cria a conexão com Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
