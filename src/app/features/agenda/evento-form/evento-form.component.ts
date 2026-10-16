import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { EventosService } from '../../../core/services/eventos.service';
import { ToastService } from '../../../core/services/toast.service';
import { Turma } from '../../../core/models';
import {
  DESCRICAO_EVENTO_MAX,
  DadosEvento,
  Evento,
  TIPOS_EVENTO,
  TITULO_EVENTO_MAX,
  TipoEvento,
  deValorInputDataHora,
  paraValorInputDataHora,
  validarEvento,
} from '../../../core/models/evento.model';

interface EventoFormData {
  titulo: string;
  descricao: string;
  tipo: TipoEvento;
  inicioEm: string;
  turmaId: string;
}

@Component({
  selector: 'app-evento-form',
  imports: [ModalComponent],
  templateUrl: './evento-form.component.html',
  styleUrl: './evento-form.component.scss',
})
export class EventoFormComponent {
  readonly open = input(false);
  readonly evento = input<Evento | null>(null);
  readonly turmas = input<readonly Turma[]>([]);
  /** Permite agendar para toda a instituição (além de uma turma específica). */
  readonly permitirInstitucional = input(true);
  /** Quando definido, o evento fica restrito a esta turma (destino fixo). */
  readonly turmaFixa = input<string | null>(null);

  readonly salvo = output<void>();
  readonly fechado = output<void>();

  private readonly eventos = inject(EventosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly tipos = TIPOS_EVENTO;
  protected readonly tituloMax = TITULO_EVENTO_MAX;
  protected readonly descricaoMax = DESCRICAO_EVENTO_MAX;
  protected readonly salvando = signal(false);
  /** Fuso local do navegador, exibido para dar contexto ao horário informado. */
  protected readonly fusoHorario = Intl.DateTimeFormat().resolvedOptions().timeZone;

  protected readonly form = linkedSignal<EventoFormData>(() => {
    this.open();
    return this.paraForm(this.evento());
  });

  protected readonly nomeTurmaFixa = computed(() => {
    const turmaId = this.turmaFixa();
    if (!turmaId) return '';
    return this.turmas().find((turma) => turma.id === turmaId)?.nome ?? 'Turma';
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected patch<K extends keyof EventoFormData>(campo: K, valorCampo: EventoFormData[K]): void {
    this.form.update((atual) => ({ ...atual, [campo]: valorCampo }));
  }

  protected alterarTipo(evento: Event): void {
    this.patch('tipo', this.valor(evento) as TipoEvento);
  }

  protected fechar(): void {
    this.fechado.emit();
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    const dados = this.paraDados(this.form());
    const erros = validarEvento(dados);
    if (erros.length) {
      this.toast.mostrar(erros[0], 'warning');
      return;
    }

    const autor = this.auth.usuario();
    if (!autor) {
      this.toast.mostrar('Sessão expirada. Entre novamente.', 'danger');
      return;
    }

    this.salvando.set(true);
    try {
      const atual = this.evento();
      if (atual) {
        await this.eventos.atualizar(atual.id, dados);
        this.toast.mostrar('Evento atualizado com sucesso!');
      } else {
        await this.eventos.criar(dados, autor);
        this.toast.mostrar('Evento criado com sucesso!');
      }
      this.salvo.emit();
    } catch (erro) {
      this.toast.mostrar((erro as Error).message, 'danger');
    } finally {
      this.salvando.set(false);
    }
  }

  private paraDados(form: EventoFormData): DadosEvento {
    return {
      titulo: form.titulo,
      descricao: form.descricao,
      tipo: form.tipo,
      inicioEm: deValorInputDataHora(form.inicioEm),
      turmaId: this.turmaFixa() ?? (form.turmaId || null),
    };
  }

  private paraForm(evento: Evento | null): EventoFormData {
    if (evento) {
      return {
        titulo: evento.titulo,
        descricao: evento.descricao,
        tipo: evento.tipo,
        inicioEm: paraValorInputDataHora(evento.inicioEm),
        turmaId: evento.turmaId ?? '',
      };
    }
    return {
      titulo: '',
      descricao: '',
      tipo: 'aula',
      inicioEm: paraValorInputDataHora(new Date().toISOString()),
      turmaId: this.turmaFixa() ?? '',
    };
  }
}
