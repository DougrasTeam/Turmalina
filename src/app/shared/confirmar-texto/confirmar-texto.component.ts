import { Component, computed, effect, input, output, signal } from '@angular/core';

import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-confirmar-texto',
  imports: [ModalComponent],
  templateUrl: './confirmar-texto.component.html',
  styleUrl: './confirmar-texto.component.scss',
})
export class ConfirmarTextoComponent {
  readonly open = input(false);
  readonly titulo = input('Confirmar ação');
  readonly mensagem = input('');
  readonly detalhes = input<string[]>([]);
  readonly palavra = input('EXCLUIR');
  readonly rotuloConfirmar = input('Excluir');
  readonly tipo = input<'danger' | 'primary'>('danger');

  readonly confirmado = output<void>();
  readonly fechado = output<void>();

  protected readonly digitado = signal('');

  protected readonly podeConfirmar = computed(
    () =>
      this.digitado().trim().length > 0 &&
      this.normalizar(this.digitado()) === this.normalizar(this.palavra()),
  );

  constructor() {
    effect(() => {
      if (!this.open()) this.digitado.set('');
    });
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected confirmar(): void {
    if (!this.podeConfirmar()) return;
    this.confirmado.emit();
  }

  private normalizar(texto: string): string {
    return texto.trim().toUpperCase();
  }
}
