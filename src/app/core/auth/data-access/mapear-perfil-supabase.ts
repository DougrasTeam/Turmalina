import type { Papel } from '../../models/papel.model';
import { PAPEIS } from '../../models/papel.model';
import { Perfil } from '../../models/perfil.model';
import { Usuario } from '../../models/usuario.model';

/** Linha crua da tabela `public.perfis` (nomes em snake_case). */
export interface LinhaPerfil {
  user_id: string;
  institution_id: string;
  papel: string;
  nome: string | null;
  ativo: boolean;
  precisa_trocar_senha: boolean;
}

/** Converte a linha de `perfis` no modelo de domínio. Retorna null sem dados. */
export function mapearPerfilSupabase(linha: LinhaPerfil | null): Perfil | null {
  if (!linha) {
    return null;
  }

  return {
    userId: linha.user_id,
    institutionId: linha.institution_id,
    papel: normalizarPapel(linha.papel),
    nome: linha.nome ?? '',
    ativo: linha.ativo,
    precisaTrocarSenha: linha.precisa_trocar_senha,
  };
}

/**
 * Sobrepõe o usuário com os dados do perfil, quando existir.
 * O perfil é a fonte autoritativa de papel e da flag de primeiro acesso.
 */
export function aplicarPerfilSupabase(usuario: Usuario, perfil: Perfil | null): Usuario {
  if (!perfil) {
    return usuario;
  }

  return {
    ...usuario,
    papel: perfil.papel,
    nome: perfil.nome.trim() !== '' ? perfil.nome : usuario.nome,
    ativo: perfil.ativo,
    precisaTrocarSenha: perfil.precisaTrocarSenha,
  };
}

function normalizarPapel(papel: string): Papel {
  return (PAPEIS as readonly string[]).includes(papel) ? (papel as Papel) : 'aluno';
}
