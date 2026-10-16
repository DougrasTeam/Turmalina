export type SituacaoAluno = 'aprovado' | 'recuperacao' | 'reprovado' | 'sem_dados';

export interface SituacaoOpcao {
  value: SituacaoAluno;
  label: string;
  classe: string;
  icone: string;
}

export const SITUACOES: readonly SituacaoOpcao[] = [
  { value: 'aprovado', label: 'Aprovado', classe: 'badge-success', icone: 'check_circle' },
  { value: 'recuperacao', label: 'Recuperação', classe: 'badge-warning', icone: 'history_edu' },
  { value: 'reprovado', label: 'Reprovado', classe: 'badge-danger', icone: 'cancel' },
  { value: 'sem_dados', label: 'Sem dados', classe: 'badge-neutral', icone: 'help' },
];

export function rotuloSituacao(situacao: SituacaoAluno): string {
  return SITUACOES.find((opcao) => opcao.value === situacao)?.label ?? situacao;
}

export function classeSituacao(situacao: SituacaoAluno): string {
  return SITUACOES.find((opcao) => opcao.value === situacao)?.classe ?? 'badge-neutral';
}

export interface ResultadoSituacao {
  situacao: SituacaoAluno;
  motivo: string | null;
}

/**
 * Determina a situação do aluno (RF-013) a partir da média e da frequência,
 * conforme as regras da instituição.
 * Regras: frequência abaixo do mínimo reprova por falta; sem nota lançada não
 * há como avaliar ("sem dados"); média abaixo da mínima leva a recuperação.
 */
export function calcularSituacao(
  media: number | null,
  frequencia: number | null,
  mediaMinima: number,
  frequenciaMinima: number,
): ResultadoSituacao {
  if (frequencia !== null && frequencia < frequenciaMinima) {
    return { situacao: 'reprovado', motivo: `Frequência abaixo de ${frequenciaMinima}%` };
  }
  if (media === null) {
    return { situacao: 'sem_dados', motivo: 'Sem notas lançadas' };
  }
  if (media < mediaMinima) {
    return { situacao: 'recuperacao', motivo: `Média abaixo de ${mediaMinima}` };
  }
  return { situacao: 'aprovado', motivo: null };
}

export interface BoletimDisciplina {
  disciplinaId: string;
  disciplinaNome: string;
  media: number | null;
  frequencia: number | null;
  situacao: SituacaoAluno;
  motivo: string | null;
  avaliacoes: number;
  notasLancadas: number;
  registrosFrequencia: number;
}

export interface Boletim {
  alunoId: string;
  alunoNome: string;
  alunoMatricula: string;
  turmaId: string;
  turmaNome: string;
  periodoLetivoId: string;
  periodoNome: string;
  instituicaoNome: string;
  frequenciaMinima: number;
  mediaMinima: number;
  emitidoEm: string;
  disciplinas: BoletimDisciplina[];
  mediaGeral: number | null;
  frequenciaGeral: number | null;
  situacao: SituacaoAluno;
  motivo: string | null;
}
