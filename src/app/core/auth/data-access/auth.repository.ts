import { Credenciais } from '../../models/credenciais.model';
import { Sessao } from '../../models/sessao.model';

/** Provedores externos de login suportados. */
export type ProvedorOAuth = 'google';

/**
 * Contrato de autenticação/sessão.
 *
 * A UI e os serviços dependem apenas desta abstração. A implementação real
 * (SupabaseAuthRepository) é registrada em app.config.ts, sem alterar
 * consumidores.
 */
export abstract class AuthRepository {
  abstract autenticar(credenciais: Credenciais): Promise<Sessao>;
  abstract restaurarSessao(): Promise<Sessao | null>;
  abstract encerrarSessao(): Promise<void>;

  /** Indica se o repositório oferece login por provedor externo (OAuth). */
  abstract suportaOAuth(): boolean;

  /**
   * Inicia o login por provedor externo. No navegador, redireciona o usuário
   * ao provedor; a sessão é restaurada quando o usuário retorna ao app.
   */
  abstract entrarComProvedor(provedor: ProvedorOAuth): Promise<void>;

  /** Define uma nova senha para o usuário autenticado (primeiro acesso). */
  abstract alterarSenha(novaSenha: string): Promise<void>;

  /** Marca como concluída a troca obrigatória de senha do primeiro acesso. */
  abstract concluirPrimeiroAcesso(): Promise<void>;

  /**
   * Define a escola ativa do usuário. A sessão que carrega os dados acadêmicos
   * passa a ser resolvida nesse contexto.
   */
  abstract selecionarInstituicao(institutionId: string): Promise<void>;

  /**
   * Remove a seleção de escola, voltando ao estado "escolher escola" quando o
   * usuário possui mais de um vínculo.
   */
  abstract limparInstituicaoSelecionada(): Promise<void>;
}
