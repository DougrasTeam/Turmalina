import type { Session, User } from '@supabase/supabase-js';

import { PAPEIS, Papel } from '../../models/papel.model';
import { Sessao } from '../../models/sessao.model';
import { Usuario } from '../../models/usuario.model';
import { PAPEL_POR_CONTA_DEMO } from '../contas-demo';

const UMA_HORA_EM_MILISSEGUNDOS = 60 * 60 * 1000;

/**
 * Converte objetos do Supabase Auth (`User`/`Session`) nos modelos de domínio.
 *
 * O papel é lido dos metadados da conta (`app_metadata.papel` e, como
 * alternativa, `user_metadata.papel`). É apenas o valor inicial: o perfil em
 * `public.perfis` é aplicado depois por `aplicarPerfilSupabase`, que passa a ser
 * a fonte autoritativa de papel e da flag de primeiro acesso.
 */
export function mapearUsuarioSupabase(usuario: User): Usuario {
  return {
    id: usuario.id,
    nome: nomeDoUsuarioSupabase(usuario),
    email: usuario.email ?? '',
    papel: papelDoUsuarioSupabase(usuario),
    ativo: usuarioSupabaseEstaAtivo(usuario),
    precisaTrocarSenha: false,
  };
}

export function mapearSessaoSupabase(sessao: Session): Sessao {
  const expiraEm = sessao.expires_at
    ? new Date(sessao.expires_at * 1000)
    : new Date(Date.now() + UMA_HORA_EM_MILISSEGUNDOS);

  return {
    token: sessao.access_token,
    usuario: mapearUsuarioSupabase(sessao.user),
    expiraEm: expiraEm.toISOString(),
  };
}

export function papelDoUsuarioSupabase(usuario: User): Papel {
  const papelNosMetadados = usuario.app_metadata?.['papel'] ?? usuario.user_metadata?.['papel'];

  if (typeof papelNosMetadados === 'string' && ehPapel(papelNosMetadados)) {
    return papelNosMetadados;
  }

  const email = usuario.email?.toLowerCase();
  if (email && email in PAPEL_POR_CONTA_DEMO) {
    return PAPEL_POR_CONTA_DEMO[email];
  }

  // Sem papel explícito, assume o perfil de menor privilégio.
  return 'aluno';
}

export function nomeDoUsuarioSupabase(usuario: User): string {
  const nome = usuario.user_metadata?.['nome'];

  if (typeof nome === 'string' && nome.trim() !== '') {
    return nome.trim();
  }

  if (usuario.email) {
    return usuario.email.split('@')[0];
  }

  return 'Usuário';
}

export function usuarioSupabaseEstaAtivo(usuario: User): boolean {
  if (!usuario.banned_until) {
    return true;
  }

  return new Date(usuario.banned_until).getTime() <= Date.now();
}

function ehPapel(valor: string): valor is Papel {
  return (PAPEIS as readonly string[]).includes(valor);
}
