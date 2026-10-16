import { BaseEntity } from './index';

export type StatusMatricula = 'ativa' | 'transferida' | 'encerrada';

export interface Matricula extends BaseEntity {
  alunoId: string;
  turmaId: string;
  periodoLetivoId: string;
  status: StatusMatricula;
  /** Data de início da vigência (YYYY-MM-DD). */
  inicioEm: string;
  /** Data de fim da vigência (YYYY-MM-DD) ou nulo enquanto ativa. */
  fimEm: string | null;
  motivoSaida: string | null;
}

export interface DadosMatricula {
  alunoId: string;
  turmaId: string;
  periodoLetivoId?: string;
  inicioEm?: string;
}

export const ROTULOS_STATUS_MATRICULA: Record<StatusMatricula, string> = {
  ativa: 'Ativa',
  transferida: 'Transferida',
  encerrada: 'Encerrada',
};

export function labelStatusMatricula(status: StatusMatricula): string {
  return ROTULOS_STATUS_MATRICULA[status] ?? status;
}

export function formatarDataMatricula(data: string | null): string {
  if (!data) return '—';
  const [ano, mes, dia] = data.split('-');
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

/**
 * Valida uma matrícula antes de gravar (RF-005).
 * Regras: aluno e turma obrigatórios e sem matrícula ativa duplicada na mesma
 * turma (impede duplicação evidente no mesmo contexto).
 */
export function validarMatricula(
  dados: DadosMatricula,
  existentes: readonly Matricula[],
  idAtual?: string,
): string[] {
  const erros: string[] = [];
  if (!dados.alunoId) erros.push('Selecione o aluno.');
  if (!dados.turmaId) erros.push('Selecione a turma.');

  const duplicada = existentes.some(
    (matricula) =>
      matricula.id !== idAtual &&
      matricula.alunoId === dados.alunoId &&
      matricula.turmaId === dados.turmaId &&
      matricula.status === 'ativa',
  );
  if (dados.alunoId && dados.turmaId && duplicada) {
    erros.push('O aluno já possui matrícula ativa nesta turma.');
  }

  return erros;
}
