import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { AlunosService } from '../../../../core/services/alunos.service';
import { DisciplinasService } from '../../../../core/services/disciplinas.service';
import { PeriodosLetivosService } from '../../../../core/services/periodos-letivos.service';
import { TurmasService } from '../../../../core/services/turmas.service';

@Component({
  selector: 'app-turma-disciplina-visao-geral',
  templateUrl: './turma-disciplina-visao-geral.component.html',
  styleUrl: './turma-disciplina-visao-geral.component.scss',
})
export class TurmaDisciplinaVisaoGeralComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly turmas = inject(TurmasService);
  protected readonly disciplinas = inject(DisciplinasService);
  protected readonly alunos = inject(AlunosService);
  protected readonly periodos = inject(PeriodosLetivosService);

  private readonly routePai = this.route.parent;

  protected readonly turmaId = toSignal(
    (this.routePai?.paramMap ?? this.route.paramMap).pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.routePai?.snapshot.paramMap.get('id') ?? this.route.snapshot.paramMap.get('id') ?? '' },
  );

  protected readonly disciplinaId = toSignal(
    (this.routePai?.paramMap ?? this.route.paramMap).pipe(map((params) => params.get('disciplinaId') ?? '')),
    {
      initialValue:
        this.routePai?.snapshot.paramMap.get('disciplinaId') ??
        this.route.snapshot.paramMap.get('disciplinaId') ??
        '',
    },
  );

  protected readonly turma = computed(() => this.turmas.porId(this.turmaId()));
  protected readonly disciplina = computed(() => this.disciplinas.porId(this.disciplinaId()));
  protected readonly alunosDaTurma = computed(() => this.alunos.porTurma(this.turmaId()));
  protected readonly periodoAtivo = computed(() => this.periodos.ativo());
}
