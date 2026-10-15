import { StorageService } from '../services/storage.service';
import { BaseEntity, createId } from '../models';
import { Repository } from './repository';

export class LocalStorageRepository<T extends BaseEntity> implements Repository<T> {
  constructor(
    private readonly storage: StorageService,
    private readonly chave: string,
    private readonly defaults: () => Partial<T>,
  ) {}

  async list(): Promise<T[]> {
    return this.ler();
  }

  async get(id: string): Promise<T | undefined> {
    return this.ler().find((item) => item.id === id);
  }

  async create(input: Partial<T>): Promise<T> {
    const agora = new Date().toISOString();
    const item = {
      ...this.defaults(),
      ...input,
      id: input.id ?? createId(),
      criadoEm: agora,
      atualizadoEm: agora,
    } as T;
    const itens = this.ler();
    itens.push(item);
    this.escrever(itens);
    return item;
  }

  async update(id: string, patch: Partial<T>): Promise<T> {
    const itens = this.ler();
    const indice = itens.findIndex((item) => item.id === id);
    if (indice < 0) throw new Error('Registro não encontrado');
    const atualizado = {
      ...itens[indice],
      ...patch,
      id,
      atualizadoEm: new Date().toISOString(),
    } as T;
    itens[indice] = atualizado;
    this.escrever(itens);
    return atualizado;
  }

  async remove(id: string): Promise<void> {
    this.escrever(this.ler().filter((item) => item.id !== id));
  }

  async saveAll(items: T[]): Promise<void> {
    this.escrever(items);
  }

  private ler(): T[] {
    const bruto = this.storage.read<T[] | null>(this.chave, null);
    return Array.isArray(bruto) ? bruto : [];
  }

  private escrever(items: T[]): void {
    this.storage.write(this.chave, items);
  }
}
