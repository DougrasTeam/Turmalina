import { Injectable, computed, inject, signal } from '@angular/core';
import { Turma } from '../models';
import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';

@Injectable({ providedIn: 'root' })
export class TurmasService {
  private readonly repo: Repository<Turma> = inject(RepositoryFactory).create<Turma>(
    'turmalina.turmas',
    () => ({
      nome: '',
      serie: '',
      turno: 'manha',
      anoLetivo: new Date().getFullYear(),
      codigo: '',
      descricao: '',
      professorIds: [],
      ativa: true,
    }),
  );

  private readonly _turmas = signal<Turma[]>([]);
  private carregado = false;

  readonly turmas = this._turmas.asReadonly();
  readonly total = computed(() => this._turmas().length);
  readonly ativas = computed(() => this._turmas().filter((t) => t.ativa).length);

  async load(): Promise<void> {
    if (this.carregado) return;
    this._turmas.set(await this.repo.list());
    this.carregado = true;
  }

  porId(id: string): Turma | undefined {
    return this._turmas().find((t) => t.id === id);
  }

  porNome(nome: string): Turma | undefined {
    const alvo = nome.trim().toLowerCase();
    return this._turmas().find((t) => t.nome.trim().toLowerCase() === alvo);
  }

  async create(input: Partial<Turma>): Promise<Turma> {
    const turma = await this.repo.create(input);
    this._turmas.update((lista) => [...lista, turma]);
    return turma;
  }

  async update(id: string, patch: Partial<Turma>): Promise<Turma> {
    const turma = await this.repo.update(id, patch);
    this._turmas.update((lista) => lista.map((t) => (t.id === id ? turma : t)));
    return turma;
  }

  async remove(id: string): Promise<void> {
    await this.repo.remove(id);
    this._turmas.update((lista) => lista.filter((t) => t.id !== id));
  }
}
