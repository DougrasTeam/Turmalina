import { Papel } from './papel.model';

/**
 * Perfil de acesso do usuário, persistido na tabela `public.perfis`.
 *
 * É a fonte única do papel e das flags de acesso usadas tanto pelo frontend
 * quanto pelas políticas de RLS do banco.
 */
export interface Perfil {
  userId: string;
  institutionId: string;
  papel: Papel;
  nome: string;
  ativo: boolean;
  precisaTrocarSenha: boolean;
}
