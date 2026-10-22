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

  /** Professor autenticado, localizado pelo e-mail da conta. */
  readonly professorAtual = computed<Professor | null>(() => {
    const email = this.auth.usuario()?.email?.trim().toLowerCase();
    if (!email) return null;
    return (
      this.professores
        .professores()
        .find((professor) => professor.email.trim().toLowerCase() === email) ?? null
    );
  });

  /** Administradores têm visão global; professores ficam restritos à responsabilidade. */
  readonly ehAdministrador = computed(() => this.auth.temPapel('administrador'));

  /** Turmas do professor: vínculos docentes e indicação direta na equipe da turma. */
  readonly turmasDoProfessor = computed<Turma[]>(() => {
    if (this.ehAdministrador()) return this.turmas.turmas();

    const professor = this.professorAtual();
    if (!professor) return [];

    const turmasVinculadas = new Set(
      this.vinculos.porProfessor(professor.id).map((vinculo) => vinculo.turmaId),
    );
    return this.turmas
      .turmas()
      .filter((turma) => turma.professorIds.includes(professor.id) || turmasVinculadas.has(turma.id));
  });

  /** Disciplinas em que o professor possui vínculo ativo na turma informada. */
  disciplinasDoProfessorNaTurma(turmaId: string): Disciplina[] {
    const professor = this.professorAtual();
    if (!professor) return [];

    const disciplinaIds = new Set(
      this.vinculos
        .porTurma(turmaId)
        .filter((vinculo) => vinculo.professorId === professor.id && vinculo.ativo)
        .map((vinculo) => vinculo.disciplinaId),
    );
    return this.disciplinas.porIds([...disciplinaIds]);
  }

  /** Indica se o professor possui vínculo ativo na combinação turma–disciplina. */
  possuiVinculoAtivo(turmaId: string, disciplinaId: string): boolean {
    const professor = this.professorAtual();
    if (!professor) return false;

    return this.vinculos
      .porTurma(turmaId)
      .some(
        (vinculo) =>
          vinculo.professorId === professor.id &&
          vinculo.disciplinaId === disciplinaId &&
          vinculo.ativo,
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
