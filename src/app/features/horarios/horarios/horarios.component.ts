import { Component, computed, effect, inject, signal } from '@angular/core';

import { Disciplina } from '../../../core/models/disciplina.model';
import { Turma } from '../../../core/models';
import { DisciplinasService } from '../../../core/services/disciplinas.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { TurmaHorariosComponent } from '../../turma/turma-horarios/turma-horarios.component';

@Component({
  selector: 'app-horarios',
  imports: [TurmaHorariosComponent],
  templateUrl: './horarios.component.html',
  styleUrl: './horarios.component.scss',
})
export class HorariosComponent {
  private readonly turmasService = inject(TurmasService);
  private readonly disciplinasService = inject(DisciplinasService);

  protected readonly turmaSelecionadaId = signal('');
  protected readonly turmas = computed(() =>
    this.turmasService.turmas().filter((turma) => turma.ativa),
  );
  protected readonly turmaSelecionada = computed<Turma | undefined>(() => {
    const turmaId = this.turmaSelecionadaId();
    return this.turmas().find((turma) => turma.id === turmaId) ?? this.turmas()[0];
  });
  protected readonly disciplinasDaTurma = computed<Disciplina[]>(() => {
    const turma = this.turmaSelecionada();
    if (!turma) return [];
    return this.disciplinasService.porIds(turma.disciplinaIds);
  });

  constructor() {
    effect(() => {
      const turmas = this.turmas();
      if (this.turmaSelecionadaId() || turmas.length === 0) return;
      this.turmaSelecionadaId.set(turmas[0].id);
    });
  }

  protected selecionarTurma(evento: Event): void {
    this.turmaSelecionadaId.set((evento.target as HTMLSelectElement).value);
  }
}
