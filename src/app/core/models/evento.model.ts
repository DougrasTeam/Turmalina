import { BaseEntity } from './index';

/** Tipo do evento exibido na agenda (RF-023). */
export type TipoEvento = 'aula' | 'avaliacao' | 'entrega' | 'atividade' | 'aviso';

/** Evento da agenda escolar (RF-023). */
export interface Evento extends BaseEntity {
  titulo: string;
  descricao: string;
  tipo: TipoEvento;
  /** Início do evento em ISO 8601, com data e hora. */
  inicioEm: string;
  /** Turma destinatária; `null` indica evento para toda a instituição. */
  turmaId: string | null;
  autorId: string;
  autorNome: string;
}

export interface DadosEvento {
  titulo: string;
  descricao: string;
  tipo: TipoEvento;
  inicioEm: string;
  turmaId: string | null;
}

export const TITULO_EVENTO_MAX = 120;
export const DESCRICAO_EVENTO_MAX = 2000;

export interface TipoEventoOpcao {
  value: TipoEvento;
  label: string;
  icone: string;
  /** Classe utilitária de badge do design system. */
  classe: string;
}

export const TIPOS_EVENTO: readonly TipoEventoOpcao[] = [
  { value: 'aula', label: 'Aula', icone: 'menu_book', classe: 'badge-info' },
  { value: 'avaliacao', label: 'Avaliação', icone: 'grading', classe: 'badge-warning' },
  { value: 'entrega', label: 'Entrega', icone: 'assignment_turned_in', classe: 'badge-success' },
  { value: 'atividade', label: 'Atividade', icone: 'edit_note', classe: 'badge-neutral' },
  { value: 'aviso', label: 'Aviso', icone: 'campaign', classe: 'badge-primary' },
];

export function rotuloTipoEvento(tipo: TipoEvento): string {
  return TIPOS_EVENTO.find((opcao) => opcao.value === tipo)?.label ?? tipo;
}

export function iconeTipoEvento(tipo: TipoEvento): string {
  return TIPOS_EVENTO.find((opcao) => opcao.value === tipo)?.icone ?? 'event';
}

export function classeTipoEvento(tipo: TipoEvento): string {
  return TIPOS_EVENTO.find((opcao) => opcao.value === tipo)?.classe ?? 'badge-neutral';
}

export function validarEvento(dados: DadosEvento): string[] {
  const erros: string[] = [];
  const titulo = dados.titulo.trim();
  const descricao = dados.descricao.trim();

  if (!titulo) erros.push('Informe o título do evento.');
  if (titulo.length > TITULO_EVENTO_MAX) {
    erros.push(`O título deve ter até ${TITULO_EVENTO_MAX} caracteres.`);
  }
  if (!TIPOS_EVENTO.some((opcao) => opcao.value === dados.tipo)) {
    erros.push('Selecione o tipo do evento.');
  }
  if (!dados.inicioEm) {
    erros.push('Informe a data e a hora do evento.');
  } else if (Number.isNaN(new Date(dados.inicioEm).getTime())) {
    erros.push('A data e a hora do evento são inválidas.');
  }
  if (descricao.length > DESCRICAO_EVENTO_MAX) {
    erros.push(`A descrição deve ter até ${DESCRICAO_EVENTO_MAX} caracteres.`);
  }

  return erros;
}

/** Indica se o evento alcança a turma informada (`null` = todas as turmas). */
export function alcanceEvento(evento: Evento, turmaId: string | null): boolean {
  if (evento.turmaId === null) return true;
  return evento.turmaId === turmaId;
}

/** Momento de início do evento em milissegundos, ou `NaN` quando inválido. */
export function inicioEventoEm(evento: Evento): number {
  return new Date(evento.inicioEm).getTime();
}

/** Um evento é passado quando o seu início é anterior ao momento de referência. */
export function eventoPassado(evento: Evento, referencia: Date = new Date()): boolean {
  const inicio = inicioEventoEm(evento);
  return !Number.isNaN(inicio) && inicio < referencia.getTime();
}

/** Eventos em ordem cronológica crescente de início. */
export function ordenarEventosPorInicio(eventos: readonly Evento[]): Evento[] {
  return [...eventos].sort((primeiro, segundo) =>
    primeiro.inicioEm.localeCompare(segundo.inicioEm),
  );
}

/** Formata o início para exibição no fuso local do navegador. */
export function formatarInicioEvento(iso: string): string {
  const momento = new Date(iso);
  if (Number.isNaN(momento.getTime())) return iso;
  return momento.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Converte um instante ISO para o valor aceito por `<input type="datetime-local">`. */
export function paraValorInputDataHora(iso: string): string {
  const momento = new Date(iso);
  if (Number.isNaN(momento.getTime())) return '';
  const doisDigitos = (numero: number): string => String(numero).padStart(2, '0');
  const data = `${momento.getFullYear()}-${doisDigitos(momento.getMonth() + 1)}-${doisDigitos(
    momento.getDate(),
  )}`;
  const hora = `${doisDigitos(momento.getHours())}:${doisDigitos(momento.getMinutes())}`;
  return `${data}T${hora}`;
}

/** Converte o valor de `<input type="datetime-local">` para ISO 8601. */
export function deValorInputDataHora(valor: string): string {
  if (!valor) return '';
  const momento = new Date(valor);
  return Number.isNaN(momento.getTime()) ? '' : momento.toISOString();
}

function normalizarTitulo(titulo: string): string {
  return titulo.trim().toLocaleLowerCase('pt-BR');
}

/**
 * Detecta duplicidade acidental: mesmo título, tipo, momento de início e turma.
 * A verificação é usada como alerta antes de confirmar o cadastro.
 */
export function eventoDuplicado(evento: Evento, dados: DadosEvento): boolean {
  const mesmoInicio = new Date(evento.inicioEm).getTime() === new Date(dados.inicioEm).getTime();
  return (
    normalizarTitulo(evento.titulo) === normalizarTitulo(dados.titulo) &&
    evento.tipo === dados.tipo &&
    mesmoInicio &&
    (evento.turmaId ?? null) === (dados.turmaId ?? null)
  );
}
