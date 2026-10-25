import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { ListaEventosComponent } from '../lista-eventos/lista-eventos.component';
import { EventoFormComponent } from '../evento-form/evento-form.component';
import { AuthService } from '../../../core/services/auth.service';
import { ContextoProfessorService } from '../../../core/services/contexto-professor.service';
import { EventosService } from '../../../core/services/eventos.service';
import { ToastService } from '../../../core/services/toast.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { Turma } from '../../../core/models';
import { Evento } from '../../../core/models/evento.model';
import {
  FILTRO_EVENTOS_PADRAO,
  FiltroEventos,
  PERIODOS_FILTRO_EVENTOS,
  aplicarFiltroEventos,
} from '../../../core/models/filtro-eventos.model';

/**
 * Agenda da equipe (RF-023). A equipe gerencia os eventos; o professor vê
 * apenas as suas turmas e os eventos institucionais.
 */
@Component({
  selector: 'app-agenda',
  imports: [ModalComponent, ListaEventosComponent, EventoFormComponent],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss',
})
export class AgendaComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);
  protected readonly eventos = inject(EventosService);
  protected readonly contexto = inject(ContextoProfessorService);
  private readonly turmas = inject(TurmasService);
  private readonly toast = inject(ToastService);

  private readonly routePai = this.route.parent;

  protected readonly turmaIdQuery = toSignal(
    (this.routePai?.paramMap ?? this.route.queryParamMap).pipe(
      map((params) => params.get('id') ?? params.get('turmaId') ?? ''),
    ),
    {
      initialValue:
        this.routePai?.snapshot.paramMap.get('id') ??
        this.route.snapshot.queryParamMap.get('turmaId') ??
        '',
    },
  );
  protected readonly disciplinaIdQuery = toSignal(
    (this.routePai?.paramMap ?? this.route.queryParamMap).pipe(
      map((params) => params.get('disciplinaId') ?? ''),
    ),
    {
      initialValue:
        this.routePai?.snapshot.paramMap.get('disciplinaId') ??
        this.route.snapshot.queryParamMap.get('disciplinaId') ??
        '',
    },
  );

  protected readonly periodos = PERIODOS_FILTRO_EVENTOS;
  protected readonly filtro = signal<FiltroEventos>(FILTRO_EVENTOS_PADRAO);

  protected readonly formAberto = signal(false);
  protected readonly eventoEditando = signal<Evento | null>(null);
  protected readonly eventoExcluindo = signal<Evento | null>(null);

  /** Turmas que o usuário pode agendar: todas para admin, as próprias para o professor. */
  protected readonly turmasDisponiveis = computed<Turma[]>(() => {
    if (this.auth.papel() === 'administrador') return this.turmas.turmas();
    return this.contexto.turmasDoProfessor();
  });

  private readonly turmasPermitidas = computed(
    () => new Set(this.turmasDisponiveis().map((turma) => turma.id)),
  );

  /** Nome de cada turma por id, usado pela lista para exibir o destino. */
  protected readonly nomesTurmas = computed<Record<string, string>>(() => {
    const mapa: Record<string, string> = {};
    for (const turma of this.turmas.turmas()) {
      mapa[turma.id] = turma.nome;
    }
    return mapa;
  });

  /** Eventos que o usuário pode ver, antes do filtro de visualização. */
  protected readonly eventosVisiveis = computed<Evento[]>(() => {
    const eventos =
      this.auth.papel() === 'administrador'
        ? this.eventos.ordenados()
        : this.eventos
            .ordenados()
            .filter(
              (evento) => evento.turmaId === null || this.turmasPermitidas().has(evento.turmaId),
            );
    const turmaId = this.turmaIdQuery();
    return turmaId
      ? eventos.filter((evento) => evento.turmaId === null || evento.turmaId === turmaId)
      : eventos;
  });

  protected readonly turmaFixa = computed(() => this.turmaIdQuery() || null);

  protected readonly eventosFiltrados = computed<Evento[]>(() =>
    aplicarFiltroEventos(this.eventosVisiveis(), this.filtro()),
  );

  protected readonly valorFiltro = computed(() => {
    const filtro = this.filtro();
    if (filtro.escopo === 'escola') return 'escola';
    if (filtro.escopo === 'turma') return filtro.turmaId;
    return '';
  });

  protected alterarEscopo(evento: Event): void {
    const valor = this.valor(evento);
    const escopo = valor === 'escola' ? 'escola' : valor ? 'turma' : 'tudo';
    this.filtro.update((atual) => ({
      ...atual,
      escopo,
      turmaId: escopo === 'turma' ? valor : '',
    }));
  }

  protected alterarPeriodo(evento: Event): void {
    const periodo = this.valor(evento) as FiltroEventos['periodo'];
    this.filtro.update((atual) => ({ ...atual, periodo }));
  }

  protected abrirNovoEvento(): void {
    this.eventoEditando.set(null);
    this.formAberto.set(true);
  }

  protected abrirEdicao(evento: Evento): void {
    this.eventoEditando.set(evento);
    this.formAberto.set(true);
  }

  protected fecharForm(): void {
    this.formAberto.set(false);
  }

  protected onEventoSalvo(): void {
    this.formAberto.set(false);
  }

  protected pedirExclusao(evento: Evento): void {
    this.eventoExcluindo.set(evento);
  }

  protected cancelarExclusao(): void {
    this.eventoExcluindo.set(null);
  }

  protected async confirmarExclusao(): Promise<void> {
    const evento = this.eventoExcluindo();
    if (!evento) return;
    await this.eventos.remover(evento.id);
    this.toast.mostrar('Evento excluído.', 'info');
    this.eventoExcluindo.set(null);
  }

  private valor(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }
}
