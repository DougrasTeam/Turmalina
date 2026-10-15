import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Acesso a persistência local, seguro para SSR/prerender.
 * Enquanto roda no servidor, os dados ficam em memória e são descartados.
 * Ponto único de troca caso a persistência mude (ex.: IndexedDB).
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly memoria = new Map<string, string>();

  private get ehNavegador(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  read<T>(chave: string, fallback: T): T {
    try {
      const bruto = this.ehNavegador
        ? localStorage.getItem(chave)
        : this.memoria.get(chave) ?? null;
      if (bruto === null) return fallback;
      return JSON.parse(bruto) as T;
    } catch {
      return fallback;
    }
  }

  write<T>(chave: string, valor: T): void {
    try {
      const bruto = JSON.stringify(valor);
      if (this.ehNavegador) {
        localStorage.setItem(chave, bruto);
      } else {
        this.memoria.set(chave, bruto);
      }
    } catch {
      /* quota excedida ou modo privado: ignora silenciosamente */
    }
  }

  remove(chave: string): void {
    if (this.ehNavegador) {
      localStorage.removeItem(chave);
    } else {
      this.memoria.delete(chave);
    }
  }
}
