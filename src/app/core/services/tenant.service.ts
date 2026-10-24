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

  /**
   * Define a escola ativa. Um valor vazio (ex.: usuário multi-escola que ainda
   * não escolheu) volta ao padrão, evitando que o tenant anterior vaze para a
   * próxima sessão.
   */
  definir(institutionId: string | null): void {
    const limpo = (institutionId ?? '').trim();
    this._institutionId.set(limpo || INSTITUICAO_PADRAO_ID);
  }
}
