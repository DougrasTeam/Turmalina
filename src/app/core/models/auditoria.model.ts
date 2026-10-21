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

  // Mural e comunicados
  { codigo: 'publicacao.criada', rotulo: 'Publicação criada', icone: 'campaign', classe: 'badge-success' },
  { codigo: 'publicacao.atualizada', rotulo: 'Publicação atualizada', icone: 'edit', classe: 'badge-info' },
  { codigo: 'publicacao.arquivada', rotulo: 'Publicação arquivada', icone: 'archive', classe: 'badge-warning' },
  { codigo: 'publicacao.republicada', rotulo: 'Publicação republicada', icone: 'publish', classe: 'badge-info' },
  { codigo: 'publicacao.removida', rotulo: 'Publicação excluída', icone: 'delete', classe: 'badge-danger' },
  { codigo: 'publicacao.removidas-todas', rotulo: 'Publicações excluídas', icone: 'delete_sweep', classe: 'badge-danger' },
  { codigo: 'publicacao.removidas-por-turma', rotulo: 'Publicações de turmas excluídas', icone: 'delete_sweep', classe: 'badge-danger' },
  { codigo: 'recado.enviado', rotulo: 'Recado enviado', icone: 'chat', classe: 'badge-info' },
  { codigo: 'observacao.registrada', rotulo: 'Observação registrada', icone: 'note_add', classe: 'badge-info' },
  { codigo: 'comunicado.removido', rotulo: 'Comunicado excluído', icone: 'delete', classe: 'badge-danger' },
  { codigo: 'comunicado.removidos-todos', rotulo: 'Comunicados excluídos', icone: 'delete_sweep', classe: 'badge-danger' },

  // Exportações e importações
  { codigo: 'aluno.exportado', rotulo: 'Alunos exportados', icone: 'file_download', classe: 'badge-neutral' },
  { codigo: 'aluno.importado', rotulo: 'Alunos importados', icone: 'file_upload', classe: 'badge-info' },
  { codigo: 'professor.exportado', rotulo: 'Professores exportados', icone: 'file_download', classe: 'badge-neutral' },
  { codigo: 'turma.exportado', rotulo: 'Turmas exportadas', icone: 'file_download', classe: 'badge-neutral' },
  { codigo: 'relatorio.exportado', rotulo: 'Relatório exportado', icone: 'file_download', classe: 'badge-neutral' },
  { codigo: 'boletim.exportado', rotulo: 'Boletim exportado', icone: 'file_download', classe: 'badge-neutral' },

  // Agenda
  { codigo: 'evento.criado', rotulo: 'Evento criado', icone: 'event', classe: 'badge-success' },
  { codigo: 'evento.atualizado', rotulo: 'Evento atualizado', icone: 'edit', classe: 'badge-info' },
  { codigo: 'evento.removido', rotulo: 'Evento excluído', icone: 'delete', classe: 'badge-danger' },
  { codigo: 'evento.removidos-todos', rotulo: 'Eventos excluídos', icone: 'delete_sweep', classe: 'badge-danger' },
  { codigo: 'evento.removidos-por-turma', rotulo: 'Eventos de turmas excluídos', icone: 'delete_sweep', classe: 'badge-danger' },

  // Gamificação
  { codigo: 'acao.criada', rotulo: 'Ação de XP criada', icone: 'add_circle', classe: 'badge-success' },
  { codigo: 'acao.atualizada', rotulo: 'Ação de XP atualizada', icone: 'edit', classe: 'badge-info' },
  { codigo: 'acao.ativada', rotulo: 'Ação de XP ativada', icone: 'toggle_on', classe: 'badge-success' },
  { codigo: 'acao.desativada', rotulo: 'Ação de XP desativada', icone: 'toggle_off', classe: 'badge-warning' },
  { codigo: 'acao.excluida', rotulo: 'Ação de XP excluída', icone: 'delete', classe: 'badge-danger' },
  { codigo: 'acao.excluidas-todas', rotulo: 'Ações de XP excluídas', icone: 'delete_sweep', classe: 'badge-danger' },
  { codigo: 'xp.concedido', rotulo: 'XP concedido', icone: 'stars', classe: 'badge-success' },
  { codigo: 'xp.estornado', rotulo: 'XP estornado', icone: 'undo', classe: 'badge-warning' },
  { codigo: 'xp.removidos-todos', rotulo: 'Lançamentos de XP excluídos', icone: 'delete_sweep', classe: 'badge-danger' },
  { codigo: 'xp.removidos-por-turma', rotulo: 'XP de turmas excluído', icone: 'delete_sweep', classe: 'badge-danger' },

  // Moedas virtuais
  { codigo: 'moedas.movimentadas', rotulo: 'Moedas movimentadas', icone: 'monetization_on', classe: 'badge-info' },
  { codigo: 'moedas.estornadas', rotulo: 'Moedas estornadas', icone: 'undo', classe: 'badge-warning' },
  { codigo: 'moedas.removidas-por-turma', rotulo: 'Moedas de turmas excluídas', icone: 'delete_sweep', classe: 'badge-danger' },
  { codigo: 'moedas.removidas-todas', rotulo: 'Moedas excluídas', icone: 'delete_sweep', classe: 'badge-danger' },

  // Conquistas e álbum
  { codigo: 'conquista.criada', rotulo: 'Conquista criada', icone: 'add_circle', classe: 'badge-success' },
  { codigo: 'conquista.atualizada', rotulo: 'Conquista atualizada', icone: 'edit', classe: 'badge-info' },
  { codigo: 'conquista.ativada', rotulo: 'Conquista ativada', icone: 'toggle_on', classe: 'badge-success' },
  { codigo: 'conquista.desativada', rotulo: 'Conquista desativada', icone: 'toggle_off', classe: 'badge-warning' },
  { codigo: 'conquista.excluida', rotulo: 'Conquista excluída', icone: 'delete', classe: 'badge-danger' },
  { codigo: 'conquista.excluidas-todas', rotulo: 'Conquistas excluídas', icone: 'delete_sweep', classe: 'badge-danger' },
  { codigo: 'conquista.desbloqueada', rotulo: 'Conquista desbloqueada', icone: 'military_tech', classe: 'badge-success' },
  { codigo: 'conquista.revertida', rotulo: 'Conquista revertida', icone: 'undo', classe: 'badge-warning' },

  // Equipes
  { codigo: 'equipe.criada', rotulo: 'Equipe criada', icone: 'add_circle', classe: 'badge-success' },
  { codigo: 'equipe.atualizada', rotulo: 'Equipe atualizada', icone: 'edit', classe: 'badge-info' },
  { codigo: 'equipe.ativada', rotulo: 'Equipe ativada', icone: 'toggle_on', classe: 'badge-success' },
  { codigo: 'equipe.desativada', rotulo: 'Equipe desativada', icone: 'toggle_off', classe: 'badge-warning' },
  { codigo: 'equipe.excluida', rotulo: 'Equipe excluída', icone: 'delete', classe: 'badge-danger' },
  { codigo: 'equipe.excluidas-todas', rotulo: 'Equipes excluídas', icone: 'delete_sweep', classe: 'badge-danger' },
  { codigo: 'equipe.removidas-por-turma', rotulo: 'Equipes de turmas excluídas', icone: 'delete_sweep', classe: 'badge-danger' },
  { codigo: 'equipe.membros-removidos-todos', rotulo: 'Vínculos de equipe removidos', icone: 'group_remove', classe: 'badge-warning' },
  { codigo: 'equipe.associado', rotulo: 'Aluno associado à equipe', icone: 'group_add', classe: 'badge-success' },
  { codigo: 'equipe.transferido', rotulo: 'Aluno transferido de equipe', icone: 'swap_horiz', classe: 'badge-info' },
  { codigo: 'equipe.desassociado', rotulo: 'Aluno removido da equipe', icone: 'group_remove', classe: 'badge-warning' },

  // Instituição
  { codigo: 'instituicao.salva', rotulo: 'Instituição salva', icone: 'account_balance', classe: 'badge-info' },
];

const ROTULOS_ENTIDADE: Record<string, string> = {
  AcaoGamificacao: 'Ação de XP',
  Aluno: 'Aluno',
  Avaliacao: 'Avaliação',
  Boletim: 'Boletim',
  Comunicado: 'Comunicado',
  Conquista: 'Conquista',
  ConquistaAluno: 'Conquista desbloqueada',
  Disciplina: 'Disciplina',
  Equipe: 'Equipe',
  EquipeMembro: 'Vínculo de equipe',
  Evento: 'Evento',
  EventoXp: 'Lançamento de XP',
  Frequencia: 'Frequência',
  Instituicao: 'Instituição',
  Matricula: 'Matrícula',
  MovimentacaoMoeda: 'Movimentação de moedas',
  PeriodoLetivo: 'Período letivo',
  Professor: 'Professor',
  Publicacao: 'Publicação',
  Relatorio: 'Relatório',
  Turma: 'Turma',
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
