import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { EscolaPublica } from '../models/escola-publica.model';

const CHAVE_CONTEXTO = 'turmalina.escola-contexto';

/**
 * Contexto da escola acessada por link público (`/e/:slug`).
 *
 * Guarda apenas a escola resolvida (nome, slug e status) para orientar o login
 * e a escolha automática. É limpo após o login/entrada na escola para não
 * direcionar uma sessão futura indevidamente.
 */
@Injectable({ providedIn: 'root' })
export class ContextoEscolaService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly _escola = signal<EscolaPublica | null>(this.lerDoArmazenamento());

  readonly escola = this._escola.asReadonly();

  definir(escola: EscolaPublica): void {
    this._escola.set(escola);
    this.salvarNoArmazenamento(escola);
  }

  limpar(): void {
    this._escola.set(null);
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(CHAVE_CONTEXTO);
    }
  }

  private lerDoArmazenamento(): EscolaPublica | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    try {
      const bruto = sessionStorage.getItem(CHAVE_CONTEXTO);
      if (!bruto) return null;
      return JSON.parse(bruto) as EscolaPublica;
    } catch {
      return null;
    }
  }

  private salvarNoArmazenamento(escola: EscolaPublica): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      sessionStorage.setItem(CHAVE_CONTEXTO, JSON.stringify(escola));
    } catch {
      /* navegação privada sem armazenamento: segue apenas em memória */
    }
  }
}
