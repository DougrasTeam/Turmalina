import type { SupabaseClient } from '@supabase/supabase-js';

import { BaseEntity, createId } from '../models';
import { Repository } from './repository';
import { SupabaseService } from '../services/supabase.service';
import { TenantService } from '../services/tenant.service';
import { Linha, nomeColuna, paraCamelCase, paraCamelCaseLista, paraSnakeCase } from './supabase-mapper';

/** Configuração de como uma entidade é persistida em uma tabela do Supabase. */
export interface OpcoesTabelaSupabase {
  /** Nome da tabela no PostgreSQL. */
  tabela: string;
  /** Coluna usada em `order by` no `list()`. */
  ordenacao?: string;
  /**
   * Propriedades do modelo que representam relacionamentos (listas) e que não
   * existem como coluna na tabela principal. Elas são removidas da escrita e
   * tratadas por subclasses em `carregarRelacionamentos`/`salvarRelacionamentos`.
   */
  relacionadas?: readonly string[];
  /**
   * Colunas que devem virar `null` quando recebem string vazia. É usado nas
   * chaves estrangeiras opcionais, já que `''` violaria a restrição de chave.
   * Os nomes devem estar em snake_case (nome real da coluna).
   */
  nulaveis?: readonly string[];
}

/**
 * Repositório genérico apoiado no Supabase, que respeita as políticas de RLS do
 * banco (o isolamento por instituição e por papel é resolvido no servidor).
 *
 * Entidades com listas filhas normalizadas (etapas, notas, registros) são
 * atendidas por subclasses neste diretório.
 */
export class SupabaseRepository<T extends BaseEntity> implements Repository<T> {
  protected readonly tabela: string;
  protected readonly ordenacao: string;
  protected readonly relacionadas: readonly string[];
  protected readonly nulaveis: readonly string[];

  constructor(
    protected readonly supabase: SupabaseService,
    protected readonly tenant: TenantService,
    protected readonly defaults: () => Partial<T>,
    opcoes: OpcoesTabelaSupabase,
  ) {
    this.tabela = opcoes.tabela;
    this.ordenacao = opcoes.ordenacao ?? 'criado_em';
    this.relacionadas = opcoes.relacionadas ?? [];
    this.nulaveis = opcoes.nulaveis ?? [];
  }

  protected async cliente(): Promise<SupabaseClient> {
    return this.supabase.obterCliente();
  }

  async list(): Promise<T[]> {
    const cliente = await this.cliente();
    const { data, error } = await cliente
      .from(this.tabela)
      .select('*')
      .order(this.ordenacao, { ascending: true });
    if (error) throw new Error(error.message);
    return this.carregarRelacionamentos(paraCamelCaseLista<T>(data));
  }

  async get(id: string): Promise<T | undefined> {
    const cliente = await this.cliente();
    const { data, error } = await cliente.from(this.tabela).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return undefined;
    const [item] = await this.carregarRelacionamentos([paraCamelCase<T>(data)]);
    return item;
  }

  async create(input: Partial<T>): Promise<T> {
    const agora = new Date().toISOString();
    const modelo = {
      ...this.defaults(),
      ...input,
      id: input.id ?? createId(),
      institutionId: this.tenant.atual(),
      criadoEm: agora,
      atualizadoEm: agora,
    } as T;

    const cliente = await this.cliente();
    const { data, error } = await cliente
      .from(this.tabela)
      .insert(this.paraLinha(modelo))
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    const criado = paraCamelCase<T>(data);
    await this.salvarRelacionamentos({ ...modelo, ...criado });
    const [item] = await this.carregarRelacionamentos([criado]);
    return item ?? criado;
  }

  async createMany(inputs: Partial<T>[]): Promise<T[]> {
    if (!inputs.length) return [];
    const agora = new Date().toISOString();
    const institutionId = this.tenant.atual();
    const modelos = inputs.map((input) => ({
      ...this.defaults(),
      ...input,
      id: input.id ?? createId(),
      institutionId,
      criadoEm: agora,
      atualizadoEm: agora,
    })) as T[];

    const cliente = await this.cliente();
    const { data, error } = await cliente
      .from(this.tabela)
      .insert(modelos.map((modelo) => this.paraLinha(modelo)))
      .select('*');
    if (error) throw new Error(error.message);

    const criados = paraCamelCaseLista<T>(data);
    for (const [indice, criado] of criados.entries()) {
      await this.salvarRelacionamentos({ ...modelos[indice], ...criado });
    }
    return this.carregarRelacionamentos(criados);
  }

  async update(id: string, patch: Partial<T>): Promise<T> {
    const linha = this.paraLinha({ ...patch, atualizadoEm: new Date().toISOString() } as T);
    delete linha['id'];
    delete linha['institution_id'];
    delete linha['criado_em'];

    const cliente = await this.cliente();
    const { data, error } = await cliente
      .from(this.tabela)
      .update(linha)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    const atualizado = paraCamelCase<T>(data);
    await this.salvarRelacionamentos({ ...atualizado, ...patch });
    const [item] = await this.carregarRelacionamentos([atualizado]);
    return item ?? atualizado;
  }

  async remove(id: string): Promise<void> {
    const cliente = await this.cliente();
    const { error } = await cliente.from(this.tabela).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async removeMany(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const cliente = await this.cliente();
    const { error } = await cliente.from(this.tabela).delete().in('id', ids);
    if (error) throw new Error(error.message);
  }

  async removeAll(): Promise<void> {
    const cliente = await this.cliente();
    const { error } = await cliente
      .from(this.tabela)
      .delete()
      .eq('institution_id', this.tenant.atual());
    if (error) throw new Error(error.message);
  }

  async saveAll(items: T[]): Promise<void> {
    if (!items.length) return;
    const cliente = await this.cliente();
    const linhas = items.map((item) => this.paraLinha(item));
    const { error } = await cliente.from(this.tabela).upsert(linhas, { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }

  /** Converte o modelo para uma linha da tabela, removendo relacionamentos. */
  protected paraLinha(modelo: Partial<T>): Linha {
    const linha = paraSnakeCase(modelo as object);
    for (const relacionada of this.relacionadas) {
      delete linha[nomeColuna(relacionada)];
    }
    for (const coluna of this.nulaveis) {
      if (linha[coluna] === '') {
        linha[coluna] = null;
      }
    }
    return linha;
  }

  /** Preenche as listas filhas normalizadas em cada item. */
  protected async carregarRelacionamentos(itens: T[]): Promise<T[]> {
    return itens;
  }

  /** Persiste as listas filhas normalizadas de um item. */
  protected async salvarRelacionamentos(_item: Partial<T>): Promise<void> {
    /* Repositórios sem relacionamentos não persistem nada aqui. */
  }
}
