import { Injectable, signal } from '@angular/core';

/**
 * Identificador da instituição (tenant) usado como padrão na ausência de
 * sessão/backend. Com o backend real, o valor é resolvido pela sessão
 * autenticada (coluna `institution_id` + RLS).
 */
export const INSTITUICAO_PADRAO_ID = 'instituicao-padrao';

/**
 * Contexto de tenancy. Hoje (single-tenant) expõe uma instituição padrão; no
 * futuro, a instituição ativa é definida a partir da sessão. Toda persistência
 * passa por este contexto, então a troca para multi-tenant não toca na UI.
 */
@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly _institutionId = signal(INSTITUICAO_PADRAO_ID);
  readonly institutionId = this._institutionId.asReadonly();

  atual(): string {
    return this._institutionId();
  }

  definir(institutionId: string): void {
    const limpo = institutionId.trim();
    if (limpo) {
      this._institutionId.set(limpo);
    }
  }
}
