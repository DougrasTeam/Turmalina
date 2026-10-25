import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type TemaVisual = 'ludico' | 'corp';

const CHAVE_TEMA_VISUAL = 'turmalina.tema-visual';

@Injectable({ providedIn: 'root' })
export class TemaVisualService {
  private readonly plataforma = inject(PLATFORM_ID);
  private readonly podeAcessarNavegador = isPlatformBrowser(this.plataforma);

  readonly atual = signal<TemaVisual>(this.carregarTemaInicial());

  constructor() {
    this.aplicarTema(this.atual());
  }

  alternar(): void {
    const novoTema = this.atual() === 'corp' ? 'ludico' : 'corp';
    this.atual.set(novoTema);
    this.aplicarTema(novoTema);
  }

  private carregarTemaInicial(): TemaVisual {
    if (!this.podeAcessarNavegador) {
      return 'ludico';
    }

    return localStorage.getItem(CHAVE_TEMA_VISUAL) === 'corp' ? 'corp' : 'ludico';
  }

  private aplicarTema(tema: TemaVisual): void {
    if (!this.podeAcessarNavegador) {
      return;
    }

    document.documentElement.dataset['tema'] = tema;
    localStorage.setItem(CHAVE_TEMA_VISUAL, tema);
  }
}
