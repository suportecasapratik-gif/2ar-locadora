// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// Troque os dois valores abaixo pelos do SEU projeto Supabase:
// Painel do Supabase > Project Settings > API
//   - "Project URL"      -> SUPABASE_URL
//   - "anon public" key  -> SUPABASE_ANON_KEY
// ============================================================
const SUPABASE_URL = "COLE_AQUI_A_URL_DO_SEU_PROJETO";
const SUPABASE_ANON_KEY = "COLE_AQUI_A_CHAVE_ANON_PUBLIC";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
