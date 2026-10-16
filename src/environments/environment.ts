/**
 * Configuração de ambiente do frontend.
 *
 * A chave abaixo é a chave pública (anon/publishable) do Supabase. Ela pode ser
 * exposta no navegador porque o acesso aos dados é limitado pelas políticas de
 * RLS. Nunca coloque aqui a chave `service_role`.
 */
export const environment = {
  producao: false,
  supabaseUrl: 'https://yrxztrhpdianpljdbkdm.supabase.co',
  supabaseAnonKey: 'sb_publishable_LuHlCkeY83YPxE9CpGkURA_w67MgSiY',
  /**
   * Quando `true`, os dados do domínio são persistidos no Supabase (respeitando
   * as políticas de RLS). Em `false` (e nos testes, via `environment.test.ts`),
   * a aplicação usa o armazenamento local como antes.
   */
  usarSupabaseDados: true,
};
