import { Component, input, output } from '@angular/core';

import {
  Evento,
  classeTipoEvento,
  eventoPassado,
  iconeTipoEvento,
  rotuloTipoEvento,
} from '../../../core/models/evento.model';

/**
 * Lista cronológica de eventos da agenda (RF-023), usada pela equipe e pelo
 * aluno. É apenas apresentação: recebe a lista já filtrada e autorizada e, na
 * visão da equipe (`gerenciar`), emite as intenções de editar/excluir.
 */
@Component({
  selector: 'app-lista-eventos',
  templateUrl: './lista-eventos.component.html',
  styleUrl: './lista-eventos.component.scss',
})
export class ListaEventosComponent {
  readonly eventos = input<readonly Evento[]>([]);
  /** Nome de cada turma por id, usado para exibir o destino do evento. */
  readonly nomesTurmas = input<Readonly<Record<string, string>>>({});
  /** Quando `true`, exibe as ações de editar e excluir. */
  readonly gerenciar = input(false);
  readonly vazioTitulo = input('Nenhum evento por aqui');
  readonly vazioTexto = input('Os próximos eventos aparecerão neste espaço.');

  readonly editar = output<Evento>();
  readonly excluir = output<Evento>();

  protected tipo(evento: Evento): string {
    return rotuloTipoEvento(evento.tipo);
  }

  protected classeTipo(evento: Evento): string {
    return classeTipoEvento(evento.tipo);
  }

  protected iconeTipo(evento: Evento): string {
    return iconeTipoEvento(evento.tipo);
  }

  protected destino(evento: Evento): string {
    if (evento.turmaId === null) return 'Escola toda';
    return this.nomesTurmas()[evento.turmaId] ?? 'Turma';
  }

  protected passado(evento: Evento): boolean {
    return eventoPassado(evento);
  }

  protected dia(evento: Evento): string {
    return this.data(evento).toLocaleDateString('pt-BR', { day: '2-digit' });
  }

  protected mes(evento: Evento): string {
    return this.data(evento)
      .toLocaleDateString('pt-BR', { month: 'short' })
      .replace('.', '')
      .toUpperCase();
  }

  protected hora(evento: Evento): string {
    return this.data(evento).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private data(evento: Evento): Date {
    return new Date(evento.inicioEm);
  }
}
