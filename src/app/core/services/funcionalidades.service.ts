import { Injectable, computed, inject, signal } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Funcionalidade } from '../models/funcionalidade.model';
import {
  FuncionalidadeEscola,
  PapelEscolar,
  PAPEIS_ESCOLARES,
  PermissaoPapel,
  resolverAcessoFuncionalidades,
} from '../models/permissao.model';
import { paraCamelCaseLista } from '../data/supabase-mapper';

/**
 * Resolve quais funcionalidades estão disponíveis para o usuário atual.
 *
 * Combina duas fontes:
 *   * a matriz de permissões por papel (`permissoes_papel`);
 *   * as feature flags da escola (`escola_funcionalidades`).
 *
 * O resultado efetivo é mantido em `chavesPermitidas` e consultado pelo menu e
 * pelos guards. O `super_admin` tem acesso a tudo por definição e não passa por
 * essa resolução.
 */
@Injectable({ providedIn: 'root' })
export class FuncionalidadesService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  private readonly _catalogo = signal<Funcionalidade[]>([]);
  private readonly _chavesPermitidas = signal<ReadonlySet<string>>(new Set());

  readonly catalogo = this._catalogo.asReadonly();
  readonly chavesPermitidas = this._chavesPermitidas.asReadonly();

  /** Funcionalidades visíveis ao usuário, ordenadas, para montar o menu. */
  readonly funcionalidadesVisiveis = computed(() =>
    this._catalogo()
      .filter((funcionalidade) => this._chavesPermitidas().has(funcionalidade.chave))
      .sort((a, b) => a.ordem - b.ordem),
  );

  /** Indica se a funcionalidade está liberada para o usuário atual. */
  possui(chave: string): boolean {
    return this._chavesPermitidas().has(chave);
  }

  /**
   * Carrega o catálogo e resolve o acesso do usuário atual.
   * Deve ser chamado após a sessão estar disponível.
   */
  async load(): Promise<void> {
    const cliente = await this.obterCliente();
    if (!cliente) {
      this._catalogo.set([]);
      this._chavesPermitidas.set(new Set());
      return;
    }

    const catalogo = await this.carregarCatalogo(cliente);
    this._catalogo.set(catalogo);

    const chaves = await this.resolverAcessoDoUsuario(cliente);
    this._chavesPermitidas.set(chaves);
  }

  /** Recarrega apenas o catálogo (usado pelo painel do SaaS). */
  async carregarCatalogoAtualizado(): Promise<Funcionalidade[]> {
    const cliente = await this.obterCliente();
    if (!cliente) return [];
    const catalogo = await this.carregarCatalogo(cliente);
    this._catalogo.set(catalogo);
    return catalogo;
  }

  private async obterCliente(): Promise<SupabaseClient | null> {
    if (!this.supabase.disponivel) return null;
    try {
      return await this.supabase.obterCliente();
    } catch {
      return null;
    }
  }

  private async carregarCatalogo(cliente: SupabaseClient): Promise<Funcionalidade[]> {
    const { data, error } = await cliente.from('funcionalidades').select('*').order('ordem');
    if (error) throw new Error(error.message);
    return paraCamelCaseLista<Funcionalidade>(data);
  }

  private async resolverAcessoDoUsuario(cliente: SupabaseClient): Promise<Set<string>> {
    const papel = this.auth.papel();
    if (papel === null) return new Set();
    if (papel === 'super_admin') {
      return new Set(this._catalogo().map((funcionalidade) => funcionalidade.chave));
    }

    const institutionId = this.auth.sessao()?.usuario.institutionId ?? null;
    const [permissoes, flags] = await Promise.all([
      this.carregarPermissoesDoPapel(cliente, papel as PapelEscolar),
      institutionId ? this.carregarFlagsDaEscola(cliente, institutionId) : Promise.resolve([]),
    ]);

    return resolverAcessoFuncionalidades(permissoes, flags);
  }

  private async carregarPermissoesDoPapel(
    cliente: SupabaseClient,
    papel: PapelEscolar,
  ): Promise<PermissaoPapel[]> {
    const { data, error } = await cliente.from('permissoes_papel').select('*').eq('papel', papel);
    if (error) throw new Error(error.message);
    return paraCamelCaseLista<PermissaoPapel>(data);
  }

  private async carregarFlagsDaEscola(
    cliente: SupabaseClient,
    institutionId: string,
  ): Promise<FuncionalidadeEscola[]> {
    const { data, error } = await cliente
      .from('escola_funcionalidades')
      .select('*')
      .eq('institution_id', institutionId);
    if (error) throw new Error(error.message);
    return paraCamelCaseLista<FuncionalidadeEscola>(data);
  }

  /** Papéis escolares válidos para a matriz de permissões. */
  papeisEscolares(): readonly PapelEscolar[] {
    return PAPEIS_ESCOLARES;
  }
}
