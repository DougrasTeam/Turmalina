/** Plano comercial do SaaS, vinculado a uma ou mais escolas. */
export interface Plano {
  id: string;
  nome: string;
  descricao: string;
  /** Preço mensal em reais. Zero representa plano gratuito. */
  precoMensal: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

/**
 * Inclusão de uma funcionalidade em um plano.
 * A presença do vínculo indica que o plano concede a funcionalidade.
 */
export interface PlanoFuncionalidade {
  id: string;
  planoId: string;
  funcionalidade: string;
  criadoEm: string;
}

export function formatarPrecoMensal(precoMensal: number): string {
  return precoMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
