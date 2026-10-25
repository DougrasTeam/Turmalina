import { BaseEntity } from './index';

export type StatusPresenca = 'presente' | 'falta' | 'falta_justificada';

export interface RegistroPresenca {
  alunoId: string;
  status: StatusPresenca;
  justificativa: string | null;
}

/**
 * Chamada (registro de frequência) de uma turma em uma data (RF-010).
 * `disciplinaId` pode ser nulo apenas em chamadas históricas gerais. Novas
 * chamadas devem sempre estar vinculadas à disciplina da aula.
 */
export interface Frequencia extends BaseEntity {
  turmaId: string;
  periodoLetivoId: string;
  disciplinaId: string | null;
  data: string;
  registros: RegistroPresenca[];
  observacao: string | null;
}

export interface DadosFrequencia {
  turmaId: string;
  periodoLetivoId?: string;
  disciplinaId: string;
  data: string;
  registros: RegistroPresenca[];
  observacao?: string | null;
}

export interface StatusPresencaOpcao {
  value: StatusPresenca;
  label: string;
  icone: string;
  classe: string;
}

export const STATUS_PRESENCA: readonly StatusPresencaOpcao[] = [
  { value: 'presente', label: 'Presente', icone: 'check_circle', classe: 'presenca-presente' },
  { value: 'falta', label: 'Falta', icone: 'cancel', classe: 'presenca-falta' },
  { value: 'falta_justificada', label: 'Falta justificada', icone: 'event_busy', classe: 'presenca-justificada' },
];

export function labelPresenca(status: StatusPresenca): string {
  return STATUS_PRESENCA.find((opcao) => opcao.value === status)?.label ?? status;
}

export function formatarDataFrequencia(iso: string | null): string {
  if (!iso) return '—';
  const partes = iso.split('-');
  if (partes.length !== 3) return iso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export function dataHoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface ResumoFrequencia {
  total: number;
  presentes: number;
  faltas: number;
  justificadas: number;
  computaveis: number;
  percentual: number | null;
}

/**
 * Calcula o resumo de frequência (RF-010).
 * percentual = presenças computáveis / total de registros válidos × 100.
 * "presenças computáveis" inclui faltas justificadas quando a instituição
 * configurar que elas abonam. Sem registros, o percentual é `null`
 * ("sem registros"), nunca 0%.
 */
export function calcularResumoFrequencia(
  registros: readonly RegistroPresenca[],
  abonaJustificada: boolean,
): ResumoFrequencia {
  const total = registros.length;
  const presentes = registros.filter((registro) => registro.status === 'presente').length;
  const faltas = registros.filter((registro) => registro.status === 'falta').length;
  const justificadas = registros.filter((registro) => registro.status === 'falta_justificada').length;
  const computaveis = presentes + (abonaJustificada ? justificadas : 0);
  const percentual = total === 0 ? null : Math.round((computaveis / total) * 1000) / 10;
  return { total, presentes, faltas, justificadas, computaveis, percentual };
}

export function formatarPercentual(percentual: number | null): string {
  if (percentual === null) return 'Sem registros';
  return `${percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

/**
 * Valida uma chamada antes de gravar (RF-010).
 * Regras: turma e data obrigatórias; sem duas chamadas para o mesmo
 * turma/data/disciplina (a não ser que seja a própria, em edição).
 */
export function validarFrequencia(
  dados: DadosFrequencia,
  existentes: readonly Frequencia[],
  idAtual?: string,
): string[] {
  const erros: string[] = [];
  if (!dados.turmaId) {
    erros.push('Selecione a turma.');
  }
  if (!dados.data) {
    erros.push('Informe a data da chamada.');
  }
  if (!dados.disciplinaId?.trim()) {
    erros.push('Selecione a disciplina da aula.');
  }

  const disciplinaAtual = dados.disciplinaId?.trim() || null;
  if (dados.turmaId && dados.data) {
    const duplicada = existentes.find(
      (outra) =>
        outra.id !== idAtual &&
        outra.turmaId === dados.turmaId &&
        outra.data === dados.data &&
        (outra.disciplinaId || null) === disciplinaAtual,
    );
    if (duplicada) {
      erros.push('Já existe uma chamada para esta turma, data e disciplina.');
    }
  }

  return erros;
}
