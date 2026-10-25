import { BaseEntity } from '../models';

/**
 * Contrato de persistência usado pelos services.
 * É implementado sobre localStorage e Supabase, preservando o mesmo contrato.
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
  /** Remove todos os registros do tenant ativo em uma única operação de escrita. */
  removeAll(): Promise<void>;
  saveAll(items: T[]): Promise<void>;
}
