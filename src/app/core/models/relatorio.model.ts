import { StatusAvaliacao } from './avaliacao.model';

/**
 * Tipos de relatório acadêmico disponíveis (RF-014).
 * Nesta fase cobrimos os relatórios acadêmicos; itens que dependem de
 * gamificação (pontos extras, evolução de XP/conquistas) ficam para a Fase 3.
 */
export type TipoRelatorio = 'frequencia' | 'desempenho' | 'avaliacoes-pendentes';

export interface OpcaoRelatorio {
  value: TipoRelatorio;
  label: string;
  icone: string;
  descricao: string;
}

export const TIPOS_RELATORIO: readonly OpcaoRelatorio[] = [
  {
    value: 'frequencia',
    label: 'Frequência',
    icone: 'fact_check',
    descricao: 'Presenças, faltas e percentual por aluno, com alerta abaixo do limite.',
  },
  {
    value: 'desempenho',
    label: 'Desempenho',
    icone: 'grading',
    descricao: 'Médias por disciplina e média geral por aluno, com alerta abaixo da média.',
  },
  {
    value: 'avaliacoes-pendentes',
    label: 'Avaliações pendentes',
    icone: 'pending_actions',
    descricao: 'Avaliações com notas ainda não lançadas por completo.',
  },
];

export function opcaoRelatorio(tipo: TipoRelatorio): OpcaoRelatorio {
  return TIPOS_RELATORIO.find((opcao) => opcao.value === tipo) ?? TIPOS_RELATORIO[0];
}

/** Linha do relatório de frequência por turma (RF-014). */
export interface LinhaRelatorioFrequencia {
  alunoId: string;
  alunoNome: string;
  alunoMatricula: string;
  total: number;
  presentes: number;
  faltas: number;
  justificadas: number;
  percentual: number | null;
  abaixoDoLimite: boolean;
}

export interface RelatorioFrequencia {
  turmaId: string;
  turmaNome: string;
  periodoLetivoId: string;
  periodoNome: string;
  frequenciaMinima: number;
  abonaJustificada: boolean;
  geradoEm: string;
  totalAlunos: number;
  percentualMedio: number | null;
  alunosAbaixoDoLimite: number;
  linhas: LinhaRelatorioFrequencia[];
}

export interface ColunaDisciplinaRelatorio {
  disciplinaId: string;
  disciplinaNome: string;
}

/** Linha do relatório de desempenho por turma (RF-014). */
export interface LinhaRelatorioDesempenho {
  alunoId: string;
  alunoNome: string;
  alunoMatricula: string;
  /** Média por disciplina, na mesma ordem de `RelatorioDesempenho.colunas`. */
  mediasPorDisciplina: (number | null)[];
  mediaGeral: number | null;
  notasLancadas: number;
  abaixoDaMedia: boolean;
}

export interface RelatorioDesempenho {
  turmaId: string;
  turmaNome: string;
  periodoLetivoId: string;
  periodoNome: string;
  mediaMinima: number;
  casasDecimais: number;
  geradoEm: string;
  totalAlunos: number;
  mediaGeral: number | null;
  alunosAbaixoDaMedia: number;
  colunas: ColunaDisciplinaRelatorio[];
  linhas: LinhaRelatorioDesempenho[];
}

/** Linha do relatório de avaliações sem lançamento completo (RF-014). */
export interface LinhaRelatorioAvaliacaoPendente {
  avaliacaoId: string;
  nome: string;
  disciplinaNome: string;
  data: string | null;
  status: StatusAvaliacao;
  total: number;
  lancadas: number;
  pendentes: number;
}

export interface RelatorioAvaliacoesPendentes {
  turmaId: string;
  turmaNome: string;
  periodoLetivoId: string;
  periodoNome: string;
  geradoEm: string;
  totalAvaliacoes: number;
  totalPendentes: number;
  linhas: LinhaRelatorioAvaliacaoPendente[];
}

/** Resumo agregado institucional (RF-014): visão de gestão autorizada. */
export interface ResumoInstitucional {
  periodoLetivoId: string;
  periodoNome: string;
  geradoEm: string;
  turmasAtivas: number;
  alunosAtivos: number;
  frequenciaMedia: number | null;
  mediaGeral: number | null;
  alunosAbaixoDoLimite: number;
  alunosAbaixoDaMedia: number;
  avaliacoesComPendencia: number;
}
