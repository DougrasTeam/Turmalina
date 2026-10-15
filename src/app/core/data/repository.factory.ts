import { Injectable, inject } from '@angular/core';
import { StorageService } from '../services/storage.service';
import { BaseEntity } from '../models';
import { Repository } from './repository';
import { LocalStorageRepository } from './local-storage.repository';

/**
 * Ponto único para trocar a fonte de dados.
 * Para migrar ao Supabase, crie um SupabaseRepository e retorne-o aqui.
 */
@Injectable({ providedIn: 'root' })
export class RepositoryFactory {
  private readonly storage = inject(StorageService);

  create<T extends BaseEntity>(chave: string, defaults: () => Partial<T>): Repository<T> {
    return new LocalStorageRepository<T>(this.storage, chave, defaults);
  }
}
