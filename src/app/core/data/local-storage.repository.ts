import { StorageService } from '../services/storage.service';
import { BaseEntity, createId } from '../models';
import { Repository } from './repository';

export class LocalStorageRepository<T extends BaseEntity> implements Repository<T> {
  constructor(
    private readonly storage: StorageService,
    private readonly chave: string,
    private readonly defaults: () => Partial<T>,
    private readonly institutionId: () => string,
  ) {}

  async list(): Promise<T[]> {
    return this.doTenant();
  }

  async get(id: string): Promise<T | undefined> {
    return this.doTenant().find((item) => item.id === id);
  }

  async create(input: Partial<T>): Promise<T> {
    const agora = new Date().toISOString();
    const item = {
      ...this.defaults(),
      ...input,
      id: input.id ?? createId(),
      institutionId: this.institutionId(),
      criadoEm: agora,
      atualizadoEm: agora,
    } as T;
    const itens = this.ler();
    itens.push(item);
    this.escrever(itens);
    return item;
  }

  async createMany(inputs: Partial<T>[]): Promise<T[]> {
    if (!inputs.length) return [];
    const agora = new Date().toISOString();
    const institutionId = this.institutionId();
    const criados = inputs.map((input) => ({
      ...this.defaults(),
      ...input,
      id: input.id ?? createId(),
      institutionId,
      criadoEm: agora,
      atualizadoEm: agora,
    })) as T[];
    this.escrever([...this.ler(), ...criados]);
    return criados;
  }

  async update(id: string, patch: Partial<T>): Promise<T> {
    const atual = this.institutionId();
    const itens = this.ler();
    const indice = itens.findIndex((item) => item.id === id && item.institutionId === atual);
    if (indice < 0) throw new Error('Registro não encontrado');
    const atualizado = {
      ...itens[indice],
      ...patch,
      id,
      institutionId: atual,
      atualizadoEm: new Date().toISOString(),
    } as T;
    itens[indice] = atualizado;
    this.escrever(itens);
    return atualizado;
  }

  async remove(id: string): Promise<void> {
    const atual = this.institutionId();
    this.escrever(this.ler().filter((item) => !(item.id === id && item.institutionId === atual)));
  }

  async removeMany(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const alvo = new Set(ids);
    const atual = this.institutionId();
    this.escrever(
      this.ler().filter((item) => !(item.institutionId === atual && alvo.has(item.id))),
    );
  }

  async saveAll(items: T[]): Promise<void> {
    this.escrever(items);
  }

  /** Registros de todas as instituições (uso interno de escrita). */
  private ler(): T[] {
    const bruto = this.storage.read<T[] | null>(this.chave, null);
    const itens = Array.isArray(bruto) ? bruto : [];
    const atual = this.institutionId();
    let migrou = false;
    const normalizados = itens.map((item) => {
      if (item.institutionId) return item;
      migrou = true;
      return { ...item, institutionId: atual };
    });
    if (migrou) {
      this.escrever(normalizados);
    }
    return normalizados;
  }

  /** Registros apenas da instituição ativa. */
  private doTenant(): T[] {
    const atual = this.institutionId();
    return this.ler().filter((item) => item.institutionId === atual);
  }

  private escrever(items: T[]): void {
    this.storage.write(this.chave, items);
  }
}
