import { Injectable, inject } from '@angular/core';

import { EscolaPublica } from '../models/escola-publica.model';
import { SupabaseService } from './supabase.service';

interface LinhaEscolaPublica {
  institution_id: string;
  nome: string;
  slug: string;
  status: string;
}

/**
 * Resolve uma escola pelo slug público (`/e/:slug`).
 *
 * Usa a RPC `escola_por_slug`, liberada para visitantes, que devolve somente
 * identificação e status — nunca dados acadêmicos.
 */
@Injectable({ providedIn: 'root' })
export class EscolaPublicaService {
  private readonly supabase = inject(SupabaseService);

  async buscarPorSlug(slug: string): Promise<EscolaPublica | null> {
    if (!this.supabase.disponivel) {
      return null;
    }

    const cliente = await this.supabase.obterCliente();
    const { data, error } = await cliente.rpc('escola_por_slug', { p_slug: slug });

    if (error) {
      throw new Error(error.message);
    }

    const linha = ((data ?? []) as unknown as LinhaEscolaPublica[])[0];
    if (!linha) {
      return null;
    }

    return {
      institutionId: linha.institution_id,
      nome: linha.nome,
      slug: linha.slug,
      status: linha.status === 'inativa' ? 'inativa' : 'ativa',
    };
  }
}
