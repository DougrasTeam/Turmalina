import { BaseEntity } from '../models';

/**
 * Contrato de persistência usado pelos services.
 * Hoje é implementado sobre localStorage; no futuro basta criar um
 * SupabaseRepository que implemente esta mesma interface.
 */
export interface Repository<T extends BaseEntity> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(input: Partial<T>): Promise<T>;
  /** Cria vários registros em uma única operação de escrita. */
  createMany(inputs: Partial<T>[]): Promise<T[]>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
  /** Remove vários registros em uma única operação de escrita. */
  removeMany(ids: string[]): Promise<void>;
  saveAll(items: T[]): Promise<void>;
}
