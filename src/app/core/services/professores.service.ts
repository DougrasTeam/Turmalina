import { Injectable, computed, inject, signal } from '@angular/core';
import { Professor } from '../models';
import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';

@Injectable({ providedIn: 'root' })
export class ProfessoresService {
  private readonly repo: Repository<Professor> = inject(RepositoryFactory).create<Professor>(
    'turmalina.professores',
    () => ({ nome: '', email: '', telefone: '', disciplinas: [], ativo: true }),
  );

  private readonly _professores = signal<Professor[]>([]);
  private carregado = false;

  readonly professores = this._professores.asReadonly();
  readonly total = computed(() => this._professores().length);
  readonly ativos = computed(() => this._professores().filter((p) => p.ativo).length);

  async load(): Promise<void> {
    if (this.carregado) return;
    this._professores.set(await this.repo.list());
    this.carregado = true;
  }

  porId(id: string): Professor | undefined {
    return this._professores().find((p) => p.id === id);
  }

  nomesDe(ids: string[]): string[] {
    return ids
      .map((id) => this.porId(id)?.nome)
      .filter((nome): nome is string => Boolean(nome));
  }

  async create(input: Partial<Professor>): Promise<Professor> {
    const professor = await this.repo.create(input);
    this._professores.update((lista) => [...lista, professor]);
    return professor;
  }

  async update(id: string, patch: Partial<Professor>): Promise<Professor> {
    const professor = await this.repo.update(id, patch);
    this._professores.update((lista) => lista.map((p) => (p.id === id ? professor : p)));
    return professor;
  }

  async remove(id: string): Promise<void> {
    await this.repo.remove(id);
    this._professores.update((lista) => lista.filter((p) => p.id !== id));
  }
}
