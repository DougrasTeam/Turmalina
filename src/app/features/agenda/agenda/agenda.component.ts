import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { DisciplinaContextoBarComponent } from '../../../shared/disciplina-contexto-bar/disciplina-contexto-bar.component';
import { ListaEventosComponent } from '../lista-eventos/lista-eventos.component';
import { EventoFormComponent } from '../evento-form/evento-form.component';
import { AuthService } from '../../../core/services/auth.service';
import { EventosService } from '../../../core/services/eventos.service';
import { ProfessoresService } from '../../../core/services/professores.service';
import { ToastService } from '../../../core/services/toast.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { Professor, Turma } from '../../../core/models';
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
  imports: [ModalComponent, ListaEventosComponent, EventoFormComponent, DisciplinaContextoBarComponent],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss',
})
export class AgendaComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);
  protected readonly eventos = inject(EventosService);
  private readonly turmas = inject(TurmasService);
  private readonly professores = inject(ProfessoresService);
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

  private readonly professorProprio = computed<Professor | null>(() => {
    const usuario = this.auth.usuario();
    if (!usuario || usuario.papel !== 'professor') return null;
    return (
      this.professores
        .professores()
        .find(
          (professor) => professor.userId === usuario.id || professor.email === usuario.email,
        ) ?? null
    );
  });

  /** Turmas que o usuário pode agendar: todas para admin, as próprias para o professor. */
  protected readonly turmasDisponiveis = computed<Turma[]>(() => {
    if (this.auth.papel() === 'administrador') return this.turmas.turmas();
    const professor = this.professorProprio();
    if (!professor) return [];
    return this.turmas
      .turmas()
      .filter((turma) => (turma.professorIds ?? []).includes(professor.id));
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
    if (this.auth.papel() === 'administrador') return this.eventos.ordenados();
    const permitidas = this.turmasPermitidas();
    return this.eventos
      .ordenados()
      .filter((evento) => evento.turmaId === null || permitidas.has(evento.turmaId));
  });

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
