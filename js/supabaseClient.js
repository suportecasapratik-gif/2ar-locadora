// ==================================================================
// Conexão com o Supabase.
// ==================================================================
const SUPABASE_URL = 'https://twnhwzuwankvzsrctvqh.supabase.co'; // <-- sua URL real
const SUPABASE_ANON_KEY = 'sb_anonkey_ZWABTMRodGlCtgsF7KVKTw_6-Pi0EGK';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
