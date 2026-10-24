import { AcessoEscola } from './acesso-escola.model';
import { Usuario } from './usuario.model';

export interface Sessao {
  token: string;
  usuario: Usuario;
  expiraEm: string;
  /**
   * Escolas vinculadas ao usuário. A lista vazia é usada pelo modo de
   * demonstração e pelo fallback legado (antes da migration multi-escola).
   */
  instituicoes?: readonly AcessoEscola[];
}
