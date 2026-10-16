import { Papel } from '../models/papel.model';

/**
 * Contas de demonstração usadas em desenvolvimento.
 *
 * Com o Supabase Auth, esses usuários precisam existir no provedor (criados no
 * painel do Supabase) com estes e-mails. A senha é definida por quem cria a
 * conta no painel, portanto não fica no código.
 */
export const EMAIL_ADMIN_DEMO = 'adm@turmalina.com';
export const EMAIL_PROFESSOR_DEMO = 'professor@turmalina.com';
export const EMAIL_ALUNO_DEMO = 'aluno@turmalina.com';

/**
 * Papel padrão de cada conta de demonstração.
 *
 * Usado como alternativa enquanto não existe uma tabela de perfis ligando
 * `auth.users` ao papel no domínio. Sem essa referência, o papel de um usuário
 * do Supabase é lido dos metadados da conta.
 */
export const PAPEL_POR_CONTA_DEMO: Readonly<Record<string, Papel>> = {
  [EMAIL_ADMIN_DEMO]: 'administrador',
  [EMAIL_PROFESSOR_DEMO]: 'professor',
  [EMAIL_ALUNO_DEMO]: 'aluno',
};
