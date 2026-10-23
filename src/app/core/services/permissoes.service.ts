import { Injectable, computed, inject, signal } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';
import { createId } from '../models';
import {
  FuncionalidadeEscola,
  OrigemFuncionalidadeEscola,
  PapelEscolar,
  PAPEIS_ESCOLARES,
  PermissaoPapel,
} from '../models/permissao.model';
import { paraCamelCaseLista } from '../data/supabase-mapper';

/** Mapa papel → conjunto de funcionalidades habilitadas. */
type MatrizPermissoes = ReadonlyMap<PapelEscolar, ReadonlySet<string>>;

/**
 * Gestão da matriz de permissões por papel e das feature flags por escola.
 * Uso restrito ao `super_admin` (garantido pelo RLS).
 */
@Injectable({ providedIn: 'root' })
export class PermissoesService {
  private readonly supabase = inject(SupabaseService);

  private readonly _permissoes = signal<PermissaoPapel[]>([]);
  private readonly _flagsPorEscola = signal<ReadonlyMap<string, FuncionalidadeEscola[]>>(new Map());

  readonly permissoes = this._permissoes.asReadonly();

  readonly papeis = PAPEIS_ESCOLARES;

  /** Matriz pronta para a UI: para cada papel, quais funcionalidades estão ativas. */
  readonly matriz = computed<MatrizPermissoes>(() => {
    const matriz = new Map<PapelEscolar, Set<string>>();
    for (const papel of PAPEIS_ESCOLARES) {
      matriz.set(papel, new Set());
    }
    for (const permissao of this._permissoes()) {
      if (!permissao.habilitado) continue;
      matriz.get(permissao.papel)?.add(permissao.funcionalidade);
    }
    return matriz;
  });

  papelPossui(papel: PapelEscolar, funcionalidade: string): boolean {
    return this.matriz().get(papel)?.has(funcionalidade) ?? false;
  }

  /** Flags de funcionalidades configuradas para uma escola. */
  flagsDaEscola(institutionId: string): FuncionalidadeEscola[] {
    return this._flagsPorEscola().get(institutionId) ?? [];
  }

  async load(): Promise<void> {
    const cliente = await this.obterCliente();
    if (!cliente) {
      this._permissoes.set([]);
      this._flagsPorEscola.set(new Map());
      return;
    }

    const [permissoes, flags] = await Promise.all([
      this.carregarPermissoes(cliente),
      this.carregarFlags(cliente),
    ]);

    this._permissoes.set(permissoes);
    this._flagsPorEscola.set(this.agruparFlagsPorEscola(flags));
  }

  /** Liga ou desliga uma funcionalidade para um papel, persistindo o ajuste. */
  async definirPermissao(
    papel: PapelEscolar,
    funcionalidade: string,
    habilitado: boolean,
  ): Promise<void> {
    const cliente = await this.obterCliente();
    if (!cliente) throw new Error('Supabase indisponível.');

    const agora = new Date().toISOString();
    const { error } = await cliente
      .from('permissoes_papel')
      .upsert(
        {
          id: createId(),
          papel,
          funcionalidade,
          habilitado,
          criado_em: agora,
          atualizado_em: agora,
        },
        { onConflict: 'papel,funcionalidade' },
      );
    if (error) throw new Error(error.message);
    await this.load();
  }

  /** Libera ou bloqueia uma funcionalidade para uma escola específica. */
  async definirFuncionalidadeEscola(
    institutionId: string,
    funcionalidade: string,
    habilitado: boolean,
    origem: OrigemFuncionalidadeEscola = 'manual',
  ): Promise<void> {
    const cliente = await this.obterCliente();
    if (!cliente) throw new Error('Supabase indisponível.');

    const agora = new Date().toISOString();
    const { error } = await cliente
      .from('escola_funcionalidades')
      .upsert(
        {
          id: createId(),
          institution_id: institutionId,
          funcionalidade,
          habilitado,
          origem,
          criado_em: agora,
          atualizado_em: agora,
        },
        { onConflict: 'institution_id,funcionalidade' },
      );
    if (error) throw new Error(error.message);
    await this.load();
  }

  private async carregarPermissoes(cliente: SupabaseClient): Promise<PermissaoPapel[]> {
    const { data, error } = await cliente.from('permissoes_papel').select('*');
    if (error) throw new Error(error.message);
    return paraCamelCaseLista<PermissaoPapel>(data);
  }

  private async carregarFlags(cliente: SupabaseClient): Promise<FuncionalidadeEscola[]> {
    const { data, error } = await cliente.from('escola_funcionalidades').select('*');
    if (error) throw new Error(error.message);
    return paraCamelCaseLista<FuncionalidadeEscola>(data);
  }

  private agruparFlagsPorEscola(
    flags: readonly FuncionalidadeEscola[],
  ): Map<string, FuncionalidadeEscola[]> {
    const mapa = new Map<string, FuncionalidadeEscola[]>();
    for (const flag of flags) {
      if (!flag.institutionId) continue;
      const lista = mapa.get(flag.institutionId) ?? [];
      lista.push(flag);
      mapa.set(flag.institutionId, lista);
    }
    return mapa;
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
