import { BaseEntity } from './index';

/** Registro de auditoria de operações críticas (RF-027). */
export interface EventoAuditoria extends BaseEntity {
  atorId: string | null;
  atorNome: string | null;
  acao: string;
  entidade: string;
  referencia: string | null;
  detalhes: string | null;
}

/** Apresentação de uma ação registrada na trilha de auditoria. */
export interface AcaoAuditoria {
  /** Código gravado pelo serviço, por exemplo `periodo.ativado`. */
  codigo: string;
  rotulo: string;
  icone: string;
  /** Classe utilitária de badge do design system. */
  classe: string;
}

export const ACOES_AUDITORIA: readonly AcaoAuditoria[] = [
  // Disciplinas
  { codigo: 'disciplina.criada', rotulo: 'Disciplina criada', icone: 'add_circle', classe: 'badge-success' },
  { codigo: 'disciplina.atualizada', rotulo: 'Disciplina atualizada', icone: 'edit', classe: 'badge-info' },
  { codigo: 'disciplina.ativada', rotulo: 'Disciplina ativada', icone: 'toggle_on', classe: 'badge-success' },
  { codigo: 'disciplina.desativada', rotulo: 'Disciplina desativada', icone: 'toggle_off', classe: 'badge-warning' },
  { codigo: 'disciplina.excluida', rotulo: 'Disciplina excluída', icone: 'delete', classe: 'badge-danger' },
  { codigo: 'disciplina.excluidas-todas', rotulo: 'Disciplinas excluídas', icone: 'delete_sweep', classe: 'badge-danger' },

  // Períodos letivos
  { codigo: 'periodo.criado', rotulo: 'Período criado', icone: 'add_circle', classe: 'badge-success' },
  { codigo: 'periodo.atualizado', rotulo: 'Período atualizado', icone: 'edit', classe: 'badge-info' },
  { codigo: 'periodo.ativado', rotulo: 'Período ativado', icone: 'play_arrow', classe: 'badge-success' },
  { codigo: 'periodo.encerrado', rotulo: 'Período encerrado', icone: 'lock', classe: 'badge-warning' },
  { codigo: 'periodo.reaberto', rotulo: 'Período reaberto', icone: 'lock_open', classe: 'badge-info' },
  { codigo: 'periodo.excluido', rotulo: 'Período excluído', icone: 'delete', classe: 'badge-danger' },
  { codigo: 'periodo.excluidos-todos', rotulo: 'Períodos excluídos', icone: 'delete_sweep', classe: 'badge-danger' },

  // Avaliações e notas
  { codigo: 'avaliacao.criada', rotulo: 'Avaliação criada', icone: 'add_circle', classe: 'badge-success' },
  { codigo: 'avaliacao.atualizada', rotulo: 'Avaliação atualizada', icone: 'edit', classe: 'badge-info' },
  { codigo: 'avaliacao.notas-lancadas', rotulo: 'Notas lançadas', icone: 'grading', classe: 'badge-info' },
  { codigo: 'avaliacao.rascunho', rotulo: 'Avaliação em rascunho', icone: 'edit_note', classe: 'badge-neutral' },
  { codigo: 'avaliacao.publicada', rotulo: 'Avaliação publicada', icone: 'task_alt', classe: 'badge-success' },
  { codigo: 'avaliacao.arquivada', rotulo: 'Avaliação arquivada', icone: 'archive', classe: 'badge-warning' },
  { codigo: 'avaliacao.excluida', rotulo: 'Avaliação excluída', icone: 'delete', classe: 'badge-danger' },
  { codigo: 'avaliacao.excluidas-todas', rotulo: 'Avaliações excluídas', icone: 'delete_sweep', classe: 'badge-danger' },

  // Matrículas
  { codigo: 'matricula.matricular', rotulo: 'Aluno matriculado', icone: 'how_to_reg', classe: 'badge-success' },
  { codigo: 'matricula.transferir', rotulo: 'Matrícula transferida', icone: 'swap_horiz', classe: 'badge-info' },
  { codigo: 'matricula.encerrar', rotulo: 'Matrícula encerrada', icone: 'flag', classe: 'badge-warning' },
  { codigo: 'matricula.excluidas-todas', rotulo: 'Matrículas excluídas', icone: 'delete_sweep', classe: 'badge-danger' },

  // Frequência
  { codigo: 'frequencia.salva', rotulo: 'Chamada salva', icone: 'fact_check', classe: 'badge-success' },
  { codigo: 'frequencia.excluida', rotulo: 'Chamada excluída', icone: 'delete', classe: 'badge-danger' },
  { codigo: 'frequencia.excluidas-todas', rotulo: 'Chamadas excluídas', icone: 'delete_sweep', classe: 'badge-danger' },

  // Vínculos docentes
  { codigo: 'vinculo.criado', rotulo: 'Vínculo docente criado', icone: 'handshake', classe: 'badge-success' },
  { codigo: 'vinculo.removido', rotulo: 'Vínculo docente removido', icone: 'link_off', classe: 'badge-danger' },
  { codigo: 'vinculo.removidos-todos', rotulo: 'Vínculos docentes removidos', icone: 'link_off', classe: 'badge-danger' },

  // Agenda
  { codigo: 'evento.criado', rotulo: 'Evento criado', icone: 'event', classe: 'badge-success' },
  { codigo: 'evento.atualizado', rotulo: 'Evento atualizado', icone: 'edit', classe: 'badge-info' },
  { codigo: 'evento.removido', rotulo: 'Evento excluído', icone: 'delete', classe: 'badge-danger' },
  { codigo: 'evento.removidos-todos', rotulo: 'Eventos excluídos', icone: 'delete_sweep', classe: 'badge-danger' },
  { codigo: 'evento.removidos-por-turma', rotulo: 'Eventos de turmas excluídos', icone: 'delete_sweep', classe: 'badge-danger' },

  // Instituição
  { codigo: 'instituicao.salva', rotulo: 'Instituição salva', icone: 'account_balance', classe: 'badge-info' },
];

const ROTULOS_ENTIDADE: Record<string, string> = {
  Avaliacao: 'Avaliação',
  Disciplina: 'Disciplina',
  Evento: 'Evento',
  Frequencia: 'Frequência',
  Instituicao: 'Instituição',
  Matricula: 'Matrícula',
  PeriodoLetivo: 'Período letivo',
  VinculoDocente: 'Vínculo docente',
};

/**
 * Descreve o código da ação para exibição. Códigos ainda não mapeados
 * são mostrados como estão, para nenhuma alteração ficar invisível.
 */
export function descreverAcaoAuditoria(acao: string): AcaoAuditoria {
  const descricaoConhecida = ACOES_AUDITORIA.find((descricao) => descricao.codigo === acao);
  if (descricaoConhecida) return descricaoConhecida;
  return { codigo: acao, rotulo: acao, icone: 'history', classe: 'badge-neutral' };
}

export function rotuloEntidadeAuditoria(entidade: string): string {
  return ROTULOS_ENTIDADE[entidade] ?? entidade;
}

export function formatarDataHoraAuditoria(iso: string): string {
  const momento = new Date(iso);
  if (Number.isNaN(momento.getTime())) return iso;
  return momento.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
