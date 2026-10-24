import { StatusInstituicao } from './instituicao.model';
import { Papel } from './papel.model';

/**
 * Vínculo do usuário autenticado com uma escola.
 *
 * Um mesmo usuário pode ter papéis diferentes em escolas diferentes (por
 * exemplo, administrador em uma e professor em outra). O papel e a flag de
 * primeiro acesso são, portanto, propriedades do vínculo — não da conta.
 */
export interface AcessoEscola {
  institutionId: string;
  nome: string;
  slug: string | null;
  papel: Papel;
  nomeUsuario: string;
  status: StatusInstituicao;
  /** Escola salva em `instituicoes_ativas` para este usuário. */
  selecionada: boolean;
  precisaTrocarSenha: boolean;
}

export function acessoEscolaEstaAtiva(acesso: AcessoEscola): boolean {
  return acesso.status === 'ativa';
}
