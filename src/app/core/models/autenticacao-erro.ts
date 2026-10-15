export type MotivoFalhaAutenticacao =
  | 'credenciais-invalidas'
  | 'usuario-inativo'
  | 'falha-desconhecida';

const MENSAGENS: Record<MotivoFalhaAutenticacao, string> = {
  'credenciais-invalidas': 'E-mail ou senha incorretos.',
  'usuario-inativo': 'Este usuário está inativo. Procure a administração.',
  'falha-desconhecida': 'Não foi possível entrar. Tente novamente.',
};

/**
 * Erro de autenticação com mensagem segura para exibição ao usuário,
 * sem revelar detalhes internos.
 */
export class AutenticacaoErro extends Error {
  constructor(readonly motivo: MotivoFalhaAutenticacao) {
    super(MENSAGENS[motivo]);
    this.name = 'AutenticacaoErro';
  }
}
