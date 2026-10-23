import { Injectable, computed, inject, signal } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';
import { EscolaResumo, contarEscolasAtivas } from '../models/escola.model';
import { StatusInstituicao } from '../models/instituicao.model';
import { Plano } from '../models/plano.model';
import { paraCamelCaseLista } from '../data/supabase-mapper';

/**
 * Visão do SaaS sobre as escolas (instituições). Lista as escolas com status e
 * plano, permite ativar/inativar e trocar o plano. Restrito ao `super_admin`.
 */
@Injectable({ providedIn: 'root' })
export class EscolasSaasService {
  private readonly supabase = inject(SupabaseService);

  private readonly _escolas = signal<EscolaResumo[]>([]);
  private readonly _carregando = signal(false);

  readonly escolas = this._escolas.asReadonly();
  readonly carregando = this._carregando.asReadonly();

  readonly totalAtivas = computed(() => contarEscolasAtivas(this._escolas()));

  /** Escolas ativas, ordenadas por nome — foco do painel. */
  readonly ativas = computed(() =>
    this._escolas()
      .filter((escola) => escola.status === 'ativa')
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  );

  planoDaEscola(escola: EscolaResumo, planos: readonly Plano[]): Plano | null {
    if (!escola.planoId) return null;
    return planos.find((plano) => plano.id === escola.planoId) ?? null;
  }

  async load(): Promise<void> {
    this._carregando.set(true);
    try {
      const cliente = await this.obterCliente();
      if (!cliente) {
        this._escolas.set([]);
        return;
      }
      this._escolas.set(await this.carregarEscolas(cliente));
    } finally {
      this._carregando.set(false);
    }
  }

  async definirPlano(escolaId: string, planoId: string | null): Promise<void> {
    const cliente = await this.obterCliente();
    if (!cliente) throw new Error('Supabase indisponível.');

    const { error } = await cliente
      .from('instituicoes')
      .update({ plano_id: planoId, atualizado_em: new Date().toISOString() })
      .eq('id', escolaId);
    if (error) throw new Error(error.message);
    await this.load();
  }

  async definirStatus(escolaId: string, status: StatusInstituicao): Promise<void> {
    const cliente = await this.obterCliente();
    if (!cliente) throw new Error('Supabase indisponível.');

    const { error } = await cliente
      .from('instituicoes')
      .update({ status, atualizado_em: new Date().toISOString() })
      .eq('id', escolaId);
    if (error) throw new Error(error.message);
    await this.load();
  }

  private async carregarEscolas(cliente: SupabaseClient): Promise<EscolaResumo[]> {
    const { data, error } = await cliente
      .from('instituicoes')
      .select('id, nome, status, fuso_horario, plano_id, criado_em')
      .order('nome');
    if (error) throw new Error(error.message);
    return paraCamelCaseLista<EscolaResumo>(data);
  }

  private async obterCliente(): Promise<SupabaseClient | null> {
    if (!this.supabase.disponivel) return null;
    try {
      return await this.supabase.obterCliente();
    } catch {
      return null;
    }
  }
}
