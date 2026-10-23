import { Injectable, inject } from '@angular/core';

import { SupabaseService } from './supabase.service';

export interface DadosContratacao {
  planoId: string;
  escola: { nome: string };
  admin: { nome: string; email: string; senha: string };
}

@Injectable({ providedIn: 'root' })
export class ContratacaoService {
  private readonly supabase = inject(SupabaseService);

  async contratar(dados: DadosContratacao): Promise<void> {
    if (!this.supabase.disponivel) {
      throw new Error('Contratação indisponível fora do navegador.');
    }

    const cliente = await this.supabase.obterCliente();
    const { error } = await cliente.functions.invoke('contratar-plano', {
      body: dados,
    });

    if (error) {
      throw error;
    }
  }
}
