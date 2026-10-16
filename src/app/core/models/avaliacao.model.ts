import { BaseEntity } from './index';

export type StatusAvaliacao = 'rascunho' | 'publicada' | 'arquivada';

export type FormulaMedia = 'aritmetica' | 'ponderada';

/**
 * Nota de um aluno em uma avaliação (RF-011).
 * `valor` nulo significa "não lançada" — nunca é convertida automaticamente
 * em zero (cenário obrigatório 4 da especificação).
 */
export interface RegistroNota {
  alunoId: string;
  valor: number | null;
  atualizadoEm: string;
}

/**
 * Avaliação de uma turma/disciplina em um período letivo (RF-011).
 * `etapaId` referencia a etapa de avaliação do período, quando existir.
 */
export interface Avaliacao extends BaseEntity {
  nome: string;
  turmaId: string;
  disciplinaId: string;
  periodoLetivoId: string;
  etapaId: string | null;
  data: string | null;
  notaMaxima: number;
  peso: number;
  status: StatusAvaliacao;
  descricao: string | null;
  notas: RegistroNota[];
}

export interface DadosAvaliacao {
  nome: string;
  turmaId: string;
  disciplinaId: string;
  periodoLetivoId: string;
  etapaId?: string | null;
  data?: string | null;
  notaMaxima: number;
  peso: number;
  status: StatusAvaliacao;
  descricao?: string | null;
}

export interface StatusAvaliacaoOpcao {
  value: StatusAvaliacao;
  label: string;
  icone: string;
  classe: string;
}

export const STATUS_AVALIACAO: readonly StatusAvaliacaoOpcao[] = [
  { value: 'rascunho', label: 'Rascunho', icone: 'edit_note', classe: 'badge-neutral' },
  { value: 'publicada', label: 'Publicada', icone: 'task_alt', classe: 'badge-success' },
  { value: 'arquivada', label: 'Arquivada', icone: 'archive', classe: 'badge-warning' },
];

export function rotuloStatusAvaliacao(status: StatusAvaliacao): string {
  return STATUS_AVALIACAO.find((opcao) => opcao.value === status)?.label ?? status;
}

export function classeStatusAvaliacao(status: StatusAvaliacao): string {
  return STATUS_AVALIACAO.find((opcao) => opcao.value === status)?.classe ?? 'badge-neutral';
}

export function rotuloFormula(formula: FormulaMedia): string {
  return formula === 'ponderada' ? 'Média ponderada' : 'Média aritmética';
}

export interface ResumoNotas {
  total: number;
  lancadas: number;
  pendentes: number;
}

export interface ResultadoMedia {
  valor: number | null;
  formula: FormulaMedia;
  lancadas: number;
}

export function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

export function formatarNota(valor: number | null, casas: number): string {
  if (valor === null) return '—';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/**
 * Média de uma avaliação: média aritmética das notas lançadas; notas em branco
 * são ignoradas (não viram zero). Sem notas lançadas, retorna `null`.
 */
export function mediaDaAvaliacao(avaliacao: Avaliacao, casas: number): number | null {
  const lancadas = avaliacao.notas
    .map((nota) => nota.valor)
    .filter((valor): valor is number => valor !== null);
  if (lancadas.length === 0) return null;
  const soma = lancadas.reduce((acumulado, valor) => acumulado + valor, 0);
  return arredondar(soma / lancadas.length, casas);
}

export function resumoNotas(avaliacao: Avaliacao): ResumoNotas {
  const total = avaliacao.notas.length;
  const lancadas = avaliacao.notas.filter((nota) => nota.valor !== null).length;
  return { total, lancadas, pendentes: total - lancadas };
}

/**
 * Calcula a média de um aluno em um conjunto de avaliações (RF-011).
 * Regra explícita e documentada: usa **média ponderada** quando houver pesos
 * configurados (algum peso diferente de 1); caso contrário, **média
 * aritmética**. Avaliações arquivadas são desconsideradas; notas não lançadas
 * não entram no cálculo. Sem notas lançadas, o valor é `null`.
 */
export function calcularMediaAluno(
  avaliacoes: readonly Avaliacao[],
  alunoId: string,
  casas: number,
): ResultadoMedia {
  const consideradas = avaliacoes
    .filter((avaliacao) => avaliacao.status !== 'arquivada')
    .map((avaliacao) => ({
      avaliacao,
      valor: avaliacao.notas.find((nota) => nota.alunoId === alunoId)?.valor ?? null,
    }))
    .filter((item): item is { avaliacao: Avaliacao; valor: number } => item.valor !== null);

  if (consideradas.length === 0) {
    return { valor: null, formula: 'aritmetica', lancadas: 0 };
  }

  const usaPeso = consideradas.some((item) => item.avaliacao.peso !== 1);
  let soma = 0;
  let divisor = 0;
  for (const item of consideradas) {
    const peso = usaPeso ? item.avaliacao.peso : 1;
    soma += item.valor * peso;
    divisor += peso;
  }
  const valor = divisor <= 0 ? null : arredondar(soma / divisor, casas);
  return { valor, formula: usaPeso ? 'ponderada' : 'aritmetica', lancadas: consideradas.length };
}

export function validarNota(valor: number | null, notaMaxima: number): string[] {
  if (valor === null) return [];
  const erros: string[] = [];
  if (!Number.isFinite(valor)) {
    erros.push('Nota inválida.');
    return erros;
  }
  if (valor < 0) {
    erros.push('A nota não pode ser negativa.');
  }
  if (valor > notaMaxima) {
    erros.push(`A nota não pode ser maior que ${notaMaxima}.`);
  }
  return erros;
}

/**
 * Valida uma avaliação antes de gravar (RF-011).
 * Regras: nome, turma, disciplina e período obrigatórios; nota máxima > 0;
 * peso > 0; status conhecido.
 */
export function validarAvaliacao(dados: DadosAvaliacao): string[] {
  const erros: string[] = [];
  if (!dados.nome.trim()) {
    erros.push('Informe o nome da avaliação.');
  }
  if (!dados.turmaId) {
    erros.push('Selecione a turma.');
  }
  if (!dados.disciplinaId) {
    erros.push('Selecione a disciplina.');
  }
  if (!dados.periodoLetivoId) {
    erros.push('Selecione o período letivo.');
  }
  if (!Number.isFinite(dados.notaMaxima) || dados.notaMaxima <= 0) {
    erros.push('A nota máxima deve ser maior que zero.');
  }
  if (!Number.isFinite(dados.peso) || dados.peso <= 0) {
    erros.push('O peso deve ser maior que zero.');
  }
  if (!STATUS_AVALIACAO.some((opcao) => opcao.value === dados.status)) {
    erros.push('Status da avaliação inválido.');
  }
  return erros;
}
