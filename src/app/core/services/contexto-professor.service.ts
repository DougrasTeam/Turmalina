import { Injectable, computed, inject } from '@angular/core';

import { Disciplina } from '../models/disciplina.model';
import { Professor, Turma } from '../models';
import { AuthService } from './auth.service';
import { DisciplinasService } from './disciplinas.service';
import { ProfessoresService } from './professores.service';
import { TurmasService } from './turmas.service';
import { VinculosDocentesService } from './vinculos-docentes.service';

/**
 * Contexto do professor autenticado.
 *
 * Centraliza a identificação do professor logado e o cálculo das turmas e
 * disciplinas sob sua responsabilidade, evitando que cada tela reimplemente
 * a regra de visibilidade.
 */
@Injectable({ providedIn: 'root' })
export class ContextoProfessorService {
  private readonly auth = inject(AuthService);
  private readonly professores = inject(ProfessoresService);
  private readonly turmas = inject(TurmasService);
  private readonly vinculos = inject(VinculosDocentesService);
  private readonly disciplinas = inject(DisciplinasService);

  /** Professor autenticado, priorizando o vínculo estável com a conta Auth. */
  readonly professorAtual = computed<Professor | null>(() => {
    const usuario = this.auth.usuario();
    if (!usuario) return null;

    const professores = this.professores.professores();
    const professorVinculado = professores.find(
      (professor) => professor.userId === usuario.id && professor.ativo,
    );
    if (professorVinculado) return professorVinculado;

    const emailAtual = usuario.email.trim().toLowerCase();
    if (!emailAtual) return null;

    const professoresLegados = professores.filter(
      (professor) =>
        !professor.userId &&
        professor.ativo &&
        professor.email.trim().toLowerCase() === emailAtual,
    );

    return professoresLegados.length === 1 ? professoresLegados[0] : null;
  });

  /** Administradores têm visão global; professores ficam restritos à responsabilidade. */
  readonly ehAdministrador = computed(() => this.auth.temPapel('administrador'));

  /** Turmas do professor: vínculos docentes e indicação direta na equipe da turma. */
  readonly turmasDoProfessor = computed<Turma[]>(() => {
    if (this.ehAdministrador()) return this.turmas.turmas();

    const professor = this.professorAtual();
    if (!professor) return [];

    const turmasVinculadas = new Set(
      this.vinculos
        .porProfessor(professor.id)
        .filter((vinculo) => vinculo.ativo)
        .map((vinculo) => vinculo.turmaId),
    );
    return this.turmas
      .turmas()
      .filter((turma) => turma.professorIds.includes(professor.id) || turmasVinculadas.has(turma.id));
  });

  /** Disciplinas em que o professor possui vínculo ativo na turma informada. */
  disciplinasDoProfessorNaTurma(turmaId: string): Disciplina[] {
    const professor = this.professorAtual();
    const turma = this.turmas.porId(turmaId);
    if (!professor || !turma) return [];

    const disciplinasOfertadasAtivas = this.disciplinas
      .porIds(turma.disciplinaIds)
      .filter((disciplina) => disciplina.ativa);
    const disciplinasVinculadas = new Set(
      this.vinculos
        .porTurma(turmaId)
        .filter((vinculo) => vinculo.professorId === professor.id && vinculo.ativo)
        .map((vinculo) => vinculo.disciplinaId),
    );
    return disciplinasOfertadasAtivas.filter((disciplina) =>
      disciplinasVinculadas.has(disciplina.id),
    );
  }

  /** Indica se o professor possui vínculo ativo na combinação turma–disciplina. */
  possuiVinculoAtivo(turmaId: string, disciplinaId: string): boolean {
    return this.disciplinasDoProfessorNaTurma(turmaId).some(
      (disciplina) => disciplina.id === disciplinaId,
    );
  }

  /** Indica se o professor possui algum vínculo ativo na turma informada. */
  possuiAlgumVinculoNaTurma(turmaId: string): boolean {
    const professor = this.professorAtual();
    if (!professor) return false;

    return this.vinculos
      .porTurma(turmaId)
      .some((vinculo) => vinculo.professorId === professor.id && vinculo.ativo);
  }
}
