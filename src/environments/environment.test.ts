/**
 * Ambiente usado pelos testes unitários (substitui `environment.ts` via
 * `fileReplacements` no `angular.json`). Mantém o armazenamento local para que
 * os testes não dependam do Supabase nem de rede.
 */
export const environment = {
  producao: false,
  SUPABASE_URL: 'https://yrxztrhpdianpljdbkdm.supabase.co',
  SUPABASE_KEY: 'sb_publishable_LuHlCkeY83YPxE9CpGkURA_w67MgSiY',
  usarSupabaseDados: false,
};
