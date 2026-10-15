import { Usuario } from './usuario.model';

export interface Sessao {
  token: string;
  usuario: Usuario;
  expiraEm: string;
}
