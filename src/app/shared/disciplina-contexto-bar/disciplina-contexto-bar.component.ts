import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DisciplinasService } from '../../core/services/disciplinas.service';
import { TurmasService } from '../../core/services/turmas.service';

@Component({
  selector: 'app-disciplina-contexto-bar',
  imports: [RouterLink],
  templateUrl: './disciplina-contexto-bar.component.html',
  styleUrl: './disciplina-contexto-bar.component.scss',
})
export class DisciplinaContextoBarComponent {
  private readonly turmas = inject(TurmasService);
  private readonly disciplinas = inject(DisciplinasService);

  readonly turmaId = input.required<string>();
  readonly disciplinaId = input.required<string>();

  protected readonly turma = computed(() => this.turmas.porId(this.turmaId()));
  protected readonly disciplina = computed(() => this.disciplinas.porId(this.disciplinaId()));
}
