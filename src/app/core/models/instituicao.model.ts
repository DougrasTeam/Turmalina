import { BaseEntity } from './index';

export type StatusInstituicao = 'ativa' | 'inativa';

export interface Instituicao extends BaseEntity {
  nome: string;
  fusoHorario: string;
  status: StatusInstituicao;
}

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
