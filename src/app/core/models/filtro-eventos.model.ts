import { Evento, ordenarEventosPorInicio } from './evento.model';

/**
 * Filtro de visualização da agenda (RF-023).
 *
 * - `tudo`: todos os eventos visíveis ao usuário.
 * - `escola`: apenas os eventos institucionais (`turmaId` nulo).
 * - `turma`: apenas os eventos destinados à turma de `turmaId`.
 */
export type EscopoFiltroEventos = 'tudo' | 'escola' | 'turma';

/**
 * Recorte temporal da agenda:
 *
 * - `proximos`: apenas eventos ainda não iniciados.
 * - `semana`: eventos nos próximos 7 dias.
 * - `mes`: eventos nos próximos 30 dias.
 * - `todos`: inclui também os eventos passados (histórico).
 */
export type PeriodoFiltroEventos = 'proximos' | 'semana' | 'mes' | 'todos';

export interface FiltroEventos {
  escopo: EscopoFiltroEventos;
  /** Turma considerada quando `escopo` é `'turma'`. */
  turmaId: string;
  periodo: PeriodoFiltroEventos;
}

export const FILTRO_EVENTOS_PADRAO: FiltroEventos = {
  escopo: 'tudo',
  turmaId: '',
  periodo: 'proximos',
};

export interface PeriodoFiltroEventosOpcao {
  value: PeriodoFiltroEventos;
  label: string;
}

export const PERIODOS_FILTRO_EVENTOS: readonly PeriodoFiltroEventosOpcao[] = [
  { value: 'proximos', label: 'Próximos eventos' },
  { value: 'semana', label: 'Próximos 7 dias' },
  { value: 'mes', label: 'Próximos 30 dias' },
  { value: 'todos', label: 'Incluir passados' },
];

const DIAS_SEMANA = 7;
const DIAS_MES = 30;
const MILISSEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Aplica o filtro de visualização a uma lista de eventos já restrita pelas
 * permissões do usuário. O resultado sai em ordem cronológica crescente.
 */
export function aplicarFiltroEventos(
  eventos: readonly Evento[],
  filtro: FiltroEventos,
  referencia: Date = new Date(),
): Evento[] {
  return ordenarEventosPorInicio(eventos).filter((evento) => {
    if (filtro.escopo === 'escola' && evento.turmaId !== null) return false;
    if (filtro.escopo === 'turma' && evento.turmaId !== filtro.turmaId) return false;
    return dentroDoPeriodo(evento, filtro.periodo, referencia);
  });
}

function dentroDoPeriodo(evento: Evento, periodo: PeriodoFiltroEventos, referencia: Date): boolean {
  if (periodo === 'todos') return true;

  const inicio = new Date(evento.inicioEm).getTime();
  if (Number.isNaN(inicio)) return false;

  const agora = referencia.getTime();
  if (inicio < agora) return false;
  if (periodo === 'proximos') return true;

  const limiteEmDias = periodo === 'semana' ? DIAS_SEMANA : DIAS_MES;
  return inicio <= agora + limiteEmDias * MILISSEGUNDOS_POR_DIA;
}
