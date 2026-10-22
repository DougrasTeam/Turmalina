import { Injectable, computed, inject, signal } from '@angular/core';
import { Professor } from '../models';
import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import { GestaoUsuariosService } from './gestao-usuarios.service';

@Injectable({ providedIn: 'root' })
export class ProfessoresService {
  private readonly repo: Repository<Professor> = inject(RepositoryFactory).create<Professor>(
    'turmalina.professores',
    () => ({ nome: '', email: '', telefone: '', disciplinas: [], ativo: true }),
  );
  private readonly gestao = inject(GestaoUsuariosService);

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

  /**
   * Exclui o professor e encerra a conta de acesso vinculada, quando existir.
   *
   * A exclusão do cadastro só surte efeito no acesso se a conta de Auth também
   * for removida; se a remoção da conta falhar, o cadastro é preservado e o erro
   * é propagado para o chamador exibir.
   */
  async remove(id: string): Promise<void> {
    const professor = this.porId(id);
    if (professor?.userId) {
      await this.gestao.excluirConta(professor.userId);
    }
    await this.repo.remove(id);
    this._professores.update((lista) => lista.filter((p) => p.id !== id));
  }

  async removeTodos(): Promise<void> {
    for (const professor of this._professores()) {
      await this.repo.remove(professor.id);
    }
    this._professores.set([]);
  }
}
