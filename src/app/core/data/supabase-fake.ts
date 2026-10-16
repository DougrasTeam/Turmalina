import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseService } from '../services/supabase.service';
import { TenantService } from '../services/tenant.service';

/**
 * Dublê de teste para o cliente Supabase. Ele registra as chamadas feitas pelos
 * repositórios e devolve respostas pré-configuradas por tabela, permitindo
 * testar mapeamento de colunas, normalização e operações de escrita sem banco.
 */
export interface ResultadoSupabase {
  data?: unknown;
  error?: { message: string } | null;
}

export interface ChamadaRegistrada {
  tabela: string;
  metodo: string;
  argumentos: unknown[];
}

export class SupabaseFake {
  readonly chamadas: ChamadaRegistrada[] = [];
  private readonly filas = new Map<string, ResultadoSupabase[]>();

  definirRespostas(tabela: string, respostas: ResultadoSupabase[]): void {
    this.filas.set(tabela, [...respostas]);
  }

  proximaResposta(tabela: string): ResultadoSupabase {
    const fila = this.filas.get(tabela);
    if (!fila || fila.length === 0) {
      return { data: null, error: null };
    }
    return fila.length === 1 ? fila[0] : (fila.shift() as ResultadoSupabase);
  }

  from(tabela: string): ConsultaFake {
    return new ConsultaFake(tabela, this);
  }

  registrar(tabela: string, metodo: string, argumentos: unknown[]): void {
    this.chamadas.push({ tabela, metodo, argumentos });
  }

  chamada(tabela: string, metodo: string): ChamadaRegistrada | undefined {
    return this.chamadas.find((chamada) => chamada.tabela === tabela && chamada.metodo === metodo);
  }

  chamadasDe(tabela: string, metodo: string): ChamadaRegistrada[] {
    return this.chamadas.filter((chamada) => chamada.tabela === tabela && chamada.metodo === metodo);
  }
}

/** Construtor de consultas encadeáveis equivalente ao do supabase-js. */
export class ConsultaFake implements PromiseLike<ResultadoSupabase> {
  constructor(
    private readonly tabela: string,
    private readonly servidor: SupabaseFake,
  ) {}

  private registrar(metodo: string, ...argumentos: unknown[]): this {
    this.servidor.registrar(this.tabela, metodo, argumentos);
    return this;
  }

  select(...argumentos: unknown[]): this {
    return this.registrar('select', ...argumentos);
  }

  insert(...argumentos: unknown[]): this {
    return this.registrar('insert', ...argumentos);
  }

  update(...argumentos: unknown[]): this {
    return this.registrar('update', ...argumentos);
  }

  upsert(...argumentos: unknown[]): this {
    return this.registrar('upsert', ...argumentos);
  }

  delete(): this {
    return this.registrar('delete');
  }

  eq(...argumentos: unknown[]): this {
    return this.registrar('eq', ...argumentos);
  }

  in(...argumentos: unknown[]): this {
    return this.registrar('in', ...argumentos);
  }

  order(...argumentos: unknown[]): this {
    return this.registrar('order', ...argumentos);
  }

  single(): this {
    return this.registrar('single');
  }

  maybeSingle(): this {
    return this.registrar('maybeSingle');
  }

  then<TResult1 = ResultadoSupabase, TResult2 = never>(
    onfulfilled?: ((value: ResultadoSupabase) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.servidor.proximaResposta(this.tabela)).then(onfulfilled, onrejected);
  }
}

/** Devolve um `SupabaseService` que entrega o dublê como cliente. */
export function criarSupabaseFake(servidor: SupabaseFake): SupabaseService {
  return {
    disponivel: true,
    obterCliente: async (): Promise<SupabaseClient> => servidor as unknown as SupabaseClient,
  } as unknown as SupabaseService;
}

/** Devolve um `TenantService` fixo na instituição informada. */
export function criarTenantFake(institutionId = 'instituicao-padrao'): TenantService {
  return { atual: () => institutionId } as unknown as TenantService;
}
