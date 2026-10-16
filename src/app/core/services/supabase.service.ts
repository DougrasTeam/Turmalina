import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';

/**
 * Cliente Supabase compartilhado pelo app.
 *
 * A biblioteca `@supabase/supabase-js` é carregada sob demanda (import dinâmico)
 * para não pesar no bundle inicial. O cliente só é criado no browser, porque a
 * sessão é persistida no armazenamento local; durante o SSR
 * (`disponivel === false`) as operações devem ser tratadas como "sem sessão".
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly disponivel = isPlatformBrowser(this.platformId);

  private clienteCriado: SupabaseClient | null = null;
  private criacaoEmAndamento: Promise<SupabaseClient> | null = null;

  /**
   * Devolve o cliente Supabase, criando-o na primeira chamada.
   * Só pode ser usado no navegador; no servidor lança um erro claro.
   */
  async obterCliente(): Promise<SupabaseClient> {
    if (!this.disponivel) {
      throw new Error('O cliente Supabase não está disponível durante a renderização no servidor.');
    }

    if (!this.clienteCriado) {
      this.criacaoEmAndamento ??= this.criarCliente();
      this.clienteCriado = await this.criacaoEmAndamento;
    }

    return this.clienteCriado;
  }

  private async criarCliente(): Promise<SupabaseClient> {
    const { createClient } = await import('@supabase/supabase-js');

    return createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }
}
