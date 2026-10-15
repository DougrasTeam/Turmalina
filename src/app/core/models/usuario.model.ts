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
}
