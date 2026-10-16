export type MotivoFalhaAutenticacao =
  | 'credenciais-invalidas'
  | 'usuario-inativo'
  | 'email-nao-confirmado'
  | 'provedor-indisponivel'
  | 'falha-desconhecida';

const MENSAGENS: Record<MotivoFalhaAutenticacao, string> = {
  'credenciais-invalidas': 'E-mail ou senha incorretos.',
  'usuario-inativo': 'Este usuário está inativo. Procure a administração.',
  'email-nao-confirmado': 'Confirme seu e-mail antes de entrar.',
  'provedor-indisponivel': 'Login por provedor externo não está disponível.',
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
