import { BaseEntity } from './index';

/**
 * Moedas virtuais (RF-016).
 *
 * As moedas são um saldo interno de gamificação — nunca dinheiro real. Todo o
 * saldo é consequência de um ledger imutável de movimentações: o saldo é a soma
 * dos deltas, e correções acontecem por estorno, sem exclusão silenciosa.
 */

/** Moedas concedidas por cada nível conquistado pelo aluno. */
export const MOEDAS_POR_NIVEL = 10;

/** Origens possíveis de uma movimentação de moedas. */
export const ORIGENS_MOEDA = ['nivel', 'manual', 'recompensa', 'estorno'] as const;
export type OrigemMoeda = (typeof ORIGENS_MOEDA)[number];

export interface MovimentacaoMoeda extends BaseEntity {
  alunoId: string;
  turmaId: string | null;
  delta: number;
  origem: OrigemMoeda;
  descricao: string;
  autorId: string | null;
  autorNome: string;
  idempotencyKey: string;
  estornoDe: string | null;
  /** Referência que originou a movimentação (por exemplo, o id do evento de XP). */
  referenciaId: string | null;
}

export interface DadosMovimentacaoMoeda {
  alunoId: string;
  turmaId: string | null;
  delta: number;
  origem: OrigemMoeda;
  descricao: string;
  autorId: string | null;
  autorNome: string;
  idempotencyKey: string;
  estornoDe: string | null;
  referenciaId: string | null;
}

/** Linha pronta para exibição no extrato de moedas. */
export interface LinhaExtratoMoeda {
  movimentacao: MovimentacaoMoeda;
  alunoNome: string;
  estornada: boolean;
}

export const ROTULOS_ORIGEM_MOEDA: Record<OrigemMoeda, string> = {
  nivel: 'Subida de nível',
  manual: 'Ajuste manual',
  recompensa: 'Recompensa',
  estorno: 'Estorno',
};

export function rotuloOrigemMoeda(origem: OrigemMoeda): string {
  return ROTULOS_ORIGEM_MOEDA[origem] ?? origem;
}

/** Saldo de moedas calculado a partir de um ledger de movimentações. */
export function saldoDeMovimentacoes(movimentacoes: MovimentacaoMoeda[]): number {
  const saldo = movimentacoes.reduce((total, movimentacao) => total + movimentacao.delta, 0);
  return Math.max(0, saldo);
}

export function formatarDeltaMoedas(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export function validarMovimentacaoMoeda(dados: DadosMovimentacaoMoeda): string[] {
  const erros: string[] = [];
  const delta = Number(dados.delta);

  if (!dados.alunoId.trim()) erros.push('Selecione o aluno da movimentação.');
  if (!Number.isInteger(delta)) {
    erros.push('O valor em moedas deve ser um número inteiro.');
  } else if (delta === 0) {
    erros.push('O valor em moedas não pode ser zero.');
  }
  if (!dados.descricao.trim()) erros.push('Descreva a movimentação de moedas.');

  return erros;
}
