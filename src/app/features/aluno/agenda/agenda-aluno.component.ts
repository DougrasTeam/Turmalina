import { Component, computed, inject, signal } from '@angular/core';

import { ListaEventosComponent } from '../../agenda/lista-eventos/lista-eventos.component';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { EventosService } from '../../../core/services/eventos.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { Aluno } from '../../../core/models';
import { Evento } from '../../../core/models/evento.model';
import {
  EscopoFiltroEventos,
  PERIODOS_FILTRO_EVENTOS,
  PeriodoFiltroEventos,
  aplicarFiltroEventos,
} from '../../../core/models/filtro-eventos.model';

/**
 * Agenda do aluno (RF-023): apresenta os eventos futuros (e o histórico) da sua
 * turma e os institucionais, com filtro entre eles e recorte temporal.
 */
@Component({
  selector: 'app-agenda-aluno',
  imports: [ListaEventosComponent],
  templateUrl: './agenda-aluno.component.html',
  styleUrl: './agenda-aluno.component.scss',
})
export class AgendaAlunoComponent {
  private readonly auth = inject(AuthService);
  private readonly alunos = inject(AlunosService);
  protected readonly eventos = inject(EventosService);
  private readonly turmas = inject(TurmasService);

  protected readonly periodos = PERIODOS_FILTRO_EVENTOS;
  protected readonly escopo = signal<EscopoFiltroEventos>('tudo');
  protected readonly periodo = signal<PeriodoFiltroEventos>('proximos');

  protected readonly alunoProprio = computed<Aluno | null>(() => {
    const email = this.auth.usuario()?.email;
    if (!email) return null;
    return this.alunos.alunos().find((aluno) => aluno.email === email) ?? null;
  });

  protected readonly nomesTurmas = computed<Record<string, string>>(() => {
    const mapa: Record<string, string> = {};
    for (const turma of this.turmas.turmas()) {
      mapa[turma.id] = turma.nome;
    }
    return mapa;
  });

  protected readonly eventosVisiveis = computed<Evento[]>(() => {
    const aluno = this.alunoProprio();
    if (!aluno) return [];
    return aplicarFiltroEventos(this.eventos.eventosParaTurma(aluno.turmaId), {
      escopo: this.escopo(),
      turmaId: aluno.turmaId,
      periodo: this.periodo(),
    });
  });

  protected definirEscopo(escopo: EscopoFiltroEventos): void {
    this.escopo.set(escopo);
  }

  protected definirPeriodo(evento: Event): void {
    this.periodo.set((evento.target as HTMLSelectElement).value as PeriodoFiltroEventos);
  }
}
