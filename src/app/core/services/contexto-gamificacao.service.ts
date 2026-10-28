import { Injectable, computed, inject, signal } from '@angular/core';

import { Disciplina } from '../models/disciplina.model';
import { Turma } from '../models';
import { ContextoGamificacao } from '../models/gamificacao.model';
import { ContextoProfessorService } from './contexto-professor.service';
import { DisciplinasService } from './disciplinas.service';
import { TurmasService } from './turmas.service';

/**
 * Contexto compartilhado das telas de gamificação.
 *
 * Administradores escolhem entre todas as turmas e disciplinas ativas. Professores
 * veem apenas as turmas e disciplinas em que possuem vínculo ativo. A seleção é
 * global durante a sessão e sempre cai para a primeira opção válida quando o
 * valor atual deixa de existir.
 */
@Injectable({ providedIn: 'root' })
export class ContextoGamificacaoService {
  private readonly auth = inject(ContextoProfessorService);
  private readonly turmas = inject(TurmasService);
  private readonly disciplinas = inject(DisciplinasService);

  private readonly _turmaId = signal('');
  private readonly _disciplinaId = signal('');

  readonly turmasDisponiveis = computed<Turma[]>(() =>
    this.auth
      .turmasDoProfessor()
      .filter((turma) => turma.ativa)
      .sort((primeira, segunda) => primeira.nome.localeCompare(segunda.nome, 'pt-BR')),
  );

  readonly turmaId = computed(() => {
    const turmaSelecionada = this._turmaId();
    if (this.turmasDisponiveis().some((turma) => turma.id === turmaSelecionada)) {
      return turmaSelecionada;
    }
    return this.turmasDisponiveis()[0]?.id ?? '';
  });

  readonly disciplinasDisponiveis = computed<Disciplina[]>(() => {
    const turmaId = this.turmaId();
    if (!turmaId) return [];

    if (this.auth.ehAdministrador()) {
      const turma = this.turmas.porId(turmaId);
      if (!turma) return [];
      return this.disciplinas
        .porIds(turma.disciplinaIds)
        .filter((disciplina) => disciplina.ativa)
        .sort((primeira, segunda) => primeira.nome.localeCompare(segunda.nome, 'pt-BR'));
    }

    return this.auth
      .disciplinasDoProfessorNaTurma(turmaId)
      .sort((primeira, segunda) => primeira.nome.localeCompare(segunda.nome, 'pt-BR'));
  });

  readonly disciplinaId = computed(() => {
    const disciplinaSelecionada = this._disciplinaId();
    if (
      this.disciplinasDisponiveis().some((disciplina) => disciplina.id === disciplinaSelecionada)
    ) {
      return disciplinaSelecionada;
    }
    return this.disciplinasDisponiveis()[0]?.id ?? '';
  });

  readonly turmaAtual = computed(() => this.turmas.porId(this.turmaId()) ?? null);

  readonly disciplinaAtual = computed(
    () =>
      this.disciplinasDisponiveis().find((disciplina) => disciplina.id === this.disciplinaId()) ??
      null,
  );

  readonly contextoAtivo = computed(() => Boolean(this.turmaId() && this.disciplinaId()));

  readonly contexto = computed<ContextoGamificacao | null>(() => {
    const turmaId = this.turmaId();
    const disciplinaId = this.disciplinaId();
    if (!turmaId || !disciplinaId) return null;
    return { turmaId, disciplinaId };
  });

  selecionarTurma(turmaId: string): void {
    this._turmaId.set(turmaId);
    this._disciplinaId.set('');
  }

  selecionarDisciplina(disciplinaId: string): void {
    this._disciplinaId.set(disciplinaId);
  }

  selecionarContexto(turmaId: string, disciplinaId: string): void {
    if (!turmaId) return;
    this._turmaId.set(turmaId);
    const disciplinaValida = this.disciplinasDisponiveis().some(
      (disciplina) => disciplina.id === disciplinaId,
    );
    this._disciplinaId.set(disciplinaValida ? disciplinaId : '');
  }
}
