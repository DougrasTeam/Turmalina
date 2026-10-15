import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'danger' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  texto: string;
  tipo: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<ToastMessage[]>([]);
  private sequencia = 0;

  readonly toasts = this._toasts.asReadonly();

  mostrar(texto: string, tipo: ToastType = 'success'): void {
    const id = ++this.sequencia;
    this._toasts.update((lista) => [...lista, { id, texto, tipo }]);
    setTimeout(() => this.remover(id), 3600);
  }

  remover(id: number): void {
    this._toasts.update((lista) => lista.filter((t) => t.id !== id));
  }
}
