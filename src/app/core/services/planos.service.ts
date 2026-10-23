import { Injectable, computed, inject, signal } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';
import { createId } from '../models';
import { Plano, PlanoFuncionalidade } from '../models/plano.model';
import { paraCamelCase, paraCamelCaseLista } from '../data/supabase-mapper';

/** Dados de entrada para criar ou editar um plano. */
export interface DadosPlano {
  nome: string;
  descricao: string;
  precoMensal: number;
  ativo: boolean;
  funcionalidades: string[];
}

/**
 * Gestão de planos comerciais do SaaS. Restrito ao `super_admin` (o RLS garante
 * a escrita). Mantém o catálogo de planos e suas funcionalidades incluídas.
 */
@Injectable({ providedIn: 'root' })
export class PlanosService {
  private readonly supabase = inject(SupabaseService);

  private readonly _planos = signal<Plano[]>([]);
  private readonly _funcionalidadesPorPlano = signal<ReadonlyMap<string, string[]>>(new Map());

  readonly planos = this._planos.asReadonly();

  /** Quantidade de funcionalidades incluídas em cada plano. */
  readonly contagemPorPlano = computed<ReadonlyMap<string, number>>(() => {
    const contagens = new Map<string, number>();
    for (const [planoId, funcionalidades] of this._funcionalidadesPorPlano()) {
      contagens.set(planoId, funcionalidades.length);
    }
    return contagens;
  });

  funcionalidadesDoPlano(planoId: string): string[] {
    return this._funcionalidadesPorPlano().get(planoId) ?? [];
  }

  async load(): Promise<void> {
    const cliente = await this.obterCliente();
    if (!cliente) {
      this._planos.set([]);
      this._funcionalidadesPorPlano.set(new Map());
      return;
    }

    const [planos, vinculos] = await Promise.all([
      this.carregarPlanos(cliente),
      this.carregarVinculos(cliente),
    ]);

    this._planos.set(planos);
    this._funcionalidadesPorPlano.set(this.agruparPorPlano(vinculos));
  }

  async salvar(planoId: string | null, dados: DadosPlano): Promise<Plano> {
    const cliente = await this.obterCliente();
    if (!cliente) throw new Error('Supabase indisponível.');

    this.validar(dados);

    const plano = planoId
      ? await this.atualizarPlano(cliente, planoId, dados)
      : await this.criarPlano(cliente, dados);

    await this.salvarFuncionalidades(cliente, plano.id, dados.funcionalidades);
    await this.load();
    return plano;
  }

  async remover(planoId: string): Promise<void> {
    const cliente = await this.obterCliente();
    if (!cliente) throw new Error('Supabase indisponível.');
    const { error } = await cliente.from('planos').delete().eq('id', planoId);
    if (error) throw new Error(error.message);
    await this.load();
  }

  private validar(dados: DadosPlano): void {
    if (!dados.nome.trim()) {
      throw new Error('Informe o nome do plano.');
    }
    if (Number.isNaN(dados.precoMensal) || dados.precoMensal < 0) {
      throw new Error('O preço mensal não pode ser negativo.');
    }
  }

  private async criarPlano(cliente: SupabaseClient, dados: DadosPlano): Promise<Plano> {
    const agora = new Date().toISOString();
    const { data, error } = await cliente
      .from('planos')
      .insert({
        id: createId(),
        nome: dados.nome.trim(),
        descricao: dados.descricao.trim(),
        preco_mensal: dados.precoMensal,
        ativo: dados.ativo,
        criado_em: agora,
        atualizado_em: agora,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return paraCamelCase<Plano>(data);
  }

  private async atualizarPlano(
    cliente: SupabaseClient,
    planoId: string,
    dados: DadosPlano,
  ): Promise<Plano> {
    const { data, error } = await cliente
      .from('planos')
      .update({
        nome: dados.nome.trim(),
        descricao: dados.descricao.trim(),
        preco_mensal: dados.precoMensal,
        ativo: dados.ativo,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', planoId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return paraCamelCase<Plano>(data);
  }

  /** Substitui as funcionalidades do plano pelas selecionadas. */
  private async salvarFuncionalidades(
    cliente: SupabaseClient,
    planoId: string,
    funcionalidades: string[],
  ): Promise<void> {
    const { error } = await cliente
      .from('planos_funcionalidades')
      .delete()
      .eq('plano_id', planoId);
    if (error) throw new Error(error.message);

    if (!funcionalidades.length) return;

    const agora = new Date().toISOString();
    const linhas = funcionalidades.map((funcionalidade) => ({
      id: createId(),
      plano_id: planoId,
      funcionalidade,
      criado_em: agora,
    }));

    const { error: erroInsercao } = await cliente.from('planos_funcionalidades').insert(linhas);
    if (erroInsercao) throw new Error(erroInsercao.message);
  }

  private async carregarPlanos(cliente: SupabaseClient): Promise<Plano[]> {
    const { data, error } = await cliente.from('planos').select('*').order('nome');
    if (error) throw new Error(error.message);
    return paraCamelCaseLista<Plano>(data);
  }

  private async carregarVinculos(cliente: SupabaseClient): Promise<PlanoFuncionalidade[]> {
    const { data, error } = await cliente.from('planos_funcionalidades').select('*');
    if (error) throw new Error(error.message);
    return paraCamelCaseLista<PlanoFuncionalidade>(data);
  }

  private agruparPorPlano(vinculos: readonly PlanoFuncionalidade[]): Map<string, string[]> {
    const mapa = new Map<string, string[]>();
    for (const vinculo of vinculos) {
      const lista = mapa.get(vinculo.planoId) ?? [];
      lista.push(vinculo.funcionalidade);
      mapa.set(vinculo.planoId, lista);
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
