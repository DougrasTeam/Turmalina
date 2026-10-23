import { Papel } from './papel.model';

/**
 * Identidade de acesso, separada do registro acadêmico do aluno.
 * No MVP o vínculo acadêmico ainda será resolvido por outra entidade.
 */
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  /**
   * Identificador da instituição (escola) à qual o usuário pertence. Fica vazio
   * para o `super_admin`, que é global e não está vinculado a uma escola.
   */
  institutionId: string;
  /**
   * Quando verdadeiro, o usuário foi criado pelo painel administrativo com uma
   * senha provisória e precisa definir uma nova senha antes de usar o sistema.
   */
  precisaTrocarSenha: boolean;
}
