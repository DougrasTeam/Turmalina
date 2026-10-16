import { Papel } from './papel.model';

/** Tabela de domínio à qual a conta de acesso pode ser vinculada. */
export type TabelaReferencia = 'professores' | 'alunos';

/** Vínculo entre a conta de acesso e um registro acadêmico existente. */
export interface ReferenciaAcademica {
  tabela: TabelaReferencia;
  id: string;
}

/** Dados necessários para criar uma conta de acesso pelo painel administrativo. */
export interface NovaContaUsuario {
  email: string;
  nome: string;
  papel: Papel;
  referencia?: ReferenciaAcademica;
}

/** Credenciais geradas pelo sistema, exibidas uma única vez ao administrador. */
export interface CredenciaisContaUsuario {
  userId: string;
  email: string;
  senha: string;
}
