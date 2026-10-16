import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { environment } from '../../../environments/environment';
import { StorageService } from '../services/storage.service';
import { TenantService } from '../services/tenant.service';
import { SupabaseService } from '../services/supabase.service';
import { BaseEntity } from '../models';
import { Avaliacao } from '../models/avaliacao.model';
import { Frequencia } from '../models/frequencia.model';
import { PeriodoLetivo } from '../models/periodo-letivo.model';
import { Repository } from './repository';
import { LocalStorageRepository } from './local-storage.repository';
import { OpcoesTabelaSupabase, SupabaseRepository } from './supabase.repository';
import { PeriodosLetivosSupabaseRepository } from './supabase/periodos-letivos-supabase.repository';
import { AvaliacoesSupabaseRepository } from './supabase/avaliacoes-supabase.repository';
import { FrequenciasSupabaseRepository } from './supabase/frequencias-supabase.repository';

/**
 * Chaves de armazenamento usadas pelos services mapeadas para a tabela do
 * Supabase e suas particularidades. Só entidades "planas" aparecem aqui; as que
 * têm listas normalizadas (etapas, notas, presenças) são tratadas em
 * `criarRepositorioComRelacionamentos`.
 */
const TABELAS: Record<string, OpcoesTabelaSupabase> = {
  'turmalina.disciplinas': { tabela: 'disciplinas', ordenacao: 'nome' },
  'turmalina.professores': { tabela: 'professores', ordenacao: 'nome' },
  'turmalina.turmas': { tabela: 'turmas', ordenacao: 'codigo' },
  'turmalina.alunos': { tabela: 'alunos', ordenacao: 'nome', nulaveis: ['turma_id'] },
  'turmalina.instituicao': { tabela: 'instituicoes', ordenacao: 'criado_em' },
  'turmalina.matriculas': { tabela: 'matriculas', ordenacao: 'criado_em', nulaveis: ['periodo_letivo_id'] },
  'turmalina.vinculos-docentes': { tabela: 'vinculos_docentes', ordenacao: 'criado_em' },
  'turmalina.publicacoes': {
    tabela: 'publicacoes',
    ordenacao: 'publicada_em',
    nulaveis: ['turma_id', 'imagem_url'],
  },
  'turmalina.comunicados': { tabela: 'comunicados', ordenacao: 'criado_em' },
  'turmalina.eventos': { tabela: 'eventos', ordenacao: 'inicio_em', nulaveis: ['turma_id'] },
  'turmalina.auditoria': { tabela: 'eventos_auditoria', ordenacao: 'criado_em' },
};

/**
 * Ponto único para trocar a fonte de dados.
 *
 * Quando `environment.usarSupabaseDados` está ativo (e no navegador), as
 * entidades passam a ser persistidas no Supabase, respeitando as políticas de
 * RLS por papel. Fora desse cenário (SSR ou testes), mantém o armazenamento
 * local, preservando o comportamento atual.
 *
 * A instituição ativa é resolvida via `TenantService` e usada na escrita; a
 * leitura é limitada pela instituição (e pelo papel) no próprio banco.
 */
@Injectable({ providedIn: 'root' })
export class RepositoryFactory {
  private readonly storage = inject(StorageService);
  private readonly tenant = inject(TenantService);
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);

  create<T extends BaseEntity>(chave: string, defaults: () => Partial<T>): Repository<T> {
    if (this.usarSupabase()) {
      const repositorio = this.criarSupabase<T>(chave, defaults);
      if (repositorio) return repositorio;
    }
    return new LocalStorageRepository<T>(this.storage, chave, defaults, () => this.tenant.atual());
  }

  private usarSupabase(): boolean {
    return environment.usarSupabaseDados && isPlatformBrowser(this.platformId);
  }

  private criarSupabase<T extends BaseEntity>(
    chave: string,
    defaults: () => Partial<T>,
  ): Repository<T> | null {
    switch (chave) {
      case 'turmalina.periodos-letivos':
        return this.comoRepository<T>(
          new PeriodosLetivosSupabaseRepository(
            this.supabase,
            this.tenant,
            defaults as () => Partial<PeriodoLetivo>,
          ),
        );
      case 'turmalina.avaliacoes':
        return this.comoRepository<T>(
          new AvaliacoesSupabaseRepository(
            this.supabase,
            this.tenant,
            defaults as () => Partial<Avaliacao>,
          ),
        );
      case 'turmalina.frequencias':
        return this.comoRepository<T>(
          new FrequenciasSupabaseRepository(
            this.supabase,
            this.tenant,
            defaults as () => Partial<Frequencia>,
          ),
        );
      default: {
        const opcoes = TABELAS[chave];
        if (!opcoes) return null;
        return new SupabaseRepository<T>(this.supabase, this.tenant, defaults, opcoes);
      }
    }
  }

  /**
   * O `create` é genérico (`create<T>`), então um repositório tipado por um
   * modelo concreto é retornado como `Repository<T>`. A conversão é segura
   * porque o chamador sempre usa a chave correspondente ao tipo solicitado.
   */
  private comoRepository<T extends BaseEntity>(repositorio: Repository<BaseEntity>): Repository<T> {
    return repositorio as unknown as Repository<T>;
  }
}
