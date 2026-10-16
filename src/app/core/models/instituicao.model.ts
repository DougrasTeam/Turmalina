import { BaseEntity } from './index';

export type StatusInstituicao = 'ativa' | 'inativa';

export interface Instituicao extends BaseEntity {
  nome: string;
  fusoHorario: string;
  status: StatusInstituicao;
  /** Limite mínimo de frequência (em %) para alertas (RF-010). */
  frequenciaMinima: number;
  /** Se faltas justificadas contam como presença computável no cálculo (RF-010). */
  faltaJustificadaAbona: boolean;
  /** Nota máxima das avaliações (RF-011). */
  notaMaxima: number;
  /** Média mínima para aprovação (RF-011). */
  mediaMinima: number;
  /** Casas decimais usadas no arredondamento de médias (RF-011). */
  casasDecimaisNota: number;
}

export const FREQUENCIA_MINIMA_PADRAO = 75;
export const NOTA_MAXIMA_PADRAO = 10;
export const MEDIA_MINIMA_PADRAO = 6;
export const CASAS_DECIMAIS_PADRAO = 1;

export const CASAS_DECIMAIS_OPCOES: readonly { value: number; label: string }[] = [
  { value: 0, label: '0 casas (inteiro)' },
  { value: 1, label: '1 casa (ex.: 7,5)' },
  { value: 2, label: '2 casas (ex.: 7,50)' },
];

export interface StatusInstituicaoOpcao {
  value: StatusInstituicao;
  label: string;
}

export const STATUS_INSTITUICAO: readonly StatusInstituicaoOpcao[] = [
  { value: 'ativa', label: 'Ativa' },
  { value: 'inativa', label: 'Inativa' },
];

export const FUSO_PADRAO = 'America/Sao_Paulo';

export const FUSOS_SUGERIDOS: readonly string[] = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Belem',
  'America/Fortaleza',
  'America/Recife',
  'America/Cuiaba',
  'America/Rio_Branco',
];

export function rotuloStatusInstituicao(status: StatusInstituicao): string {
  return STATUS_INSTITUICAO.find((opcao) => opcao.value === status)?.label ?? status;
}
