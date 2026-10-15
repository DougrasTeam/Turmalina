import { Credenciais } from '../../models/credenciais.model';
import { Sessao } from '../../models/sessao.model';

/**
 * Contrato de autenticação/sessão.
 *
 * A UI e os serviços dependem apenas desta abstração. Para uso real,
 * substitua por uma implementação SupabaseAuthRepository (ou API própria)
 * registrada em app.config.ts, sem alterar consumidores.
 */
export abstract class AuthRepository {
  abstract autenticar(credenciais: Credenciais): Promise<Sessao>;
  abstract restaurarSessao(): Promise<Sessao | null>;
  abstract encerrarSessao(): Promise<void>;
}
