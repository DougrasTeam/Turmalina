import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { ContextoProfessorService } from '../../../core/services/contexto-professor.service';
import { DisciplinasService } from '../../../core/services/disciplinas.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { VinculosDocentesService } from '../../../core/services/vinculos-docentes.service';

@Component({
  selector: 'app-turma-disciplina',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './turma-disciplina.component.html',
  styleUrl: './turma-disciplina.component.scss',
})
export class TurmaDisciplinaComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly turmas = inject(TurmasService);
  protected readonly disciplinas = inject(DisciplinasService);
  protected readonly vinculos = inject(VinculosDocentesService);
  protected readonly auth = inject(AuthService);
  protected readonly contexto = inject(ContextoProfessorService);

  protected readonly turmaId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  protected readonly disciplinaId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('disciplinaId') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('disciplinaId') ?? '' },
  );

  protected readonly turma = computed(() => this.turmas.porId(this.turmaId()));
  protected readonly disciplina = computed(() => this.disciplinas.porId(this.disciplinaId()));

  protected readonly vinculoAtivo = computed(() => {
    if (this.auth.temPapel('administrador')) {
      return (
        this.vinculos
          .porTurma(this.turmaId())
          .find((vinculo) => vinculo.disciplinaId === this.disciplinaId() && vinculo.ativo) ?? null
      );
    }

    const professorId = this.contexto.professorAtual()?.id ?? null;
    if (!professorId) return null;

    return (
      this.vinculos
        .porTurma(this.turmaId())
        .find(
          (vinculo) =>
            vinculo.professorId === professorId &&
            vinculo.disciplinaId === this.disciplinaId() &&
            vinculo.ativo,
        ) ?? null
    );
  });

  protected readonly autorizado = computed(() => {
    if (this.auth.temPapel('administrador')) return true;
    if (this.auth.temPapel('professor')) return Boolean(this.vinculoAtivo());
    return false;
  });
}

