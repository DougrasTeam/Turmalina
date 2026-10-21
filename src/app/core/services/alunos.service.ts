import { Injectable, computed, inject, signal } from '@angular/core';
import { Aluno } from '../models';
import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';

@Injectable({ providedIn: 'root' })
export class AlunosService {
  private readonly repo: Repository<Aluno> = inject(RepositoryFactory).create<Aluno>(
    'turmalina.alunos',
    () => ({
      nome: '',
      email: '',
      matricula: '',
      turmaId: '',
      dataNascimento: '',
      responsavel: '',
      telefoneResponsavel: '',
      ativo: true,
      xp: 0,
      moedas: 0,
    }),
  );

  private readonly _alunos = signal<Aluno[]>([]);
  private carregado = false;

  readonly alunos = this._alunos.asReadonly();
  readonly total = computed(() => this._alunos().length);
  readonly ativos = computed(() => this._alunos().filter((a) => a.ativo).length);

  async load(): Promise<void> {
    if (this.carregado) return;
    this._alunos.set(await this.repo.list());
    this.carregado = true;
  }

  /**
   * Relê a lista ignorando o cache de carga. Usado quando a sessão muda ou uma
   * leitura anterior aconteceu antes de o token do usuário estar disponível.
   */
  async recarregar(): Promise<void> {
    this.carregado = false;
    await this.load();
  }

  /**
   * Localiza o cadastro de aluno de um usuário autenticado.
   *
   * Prioriza o vínculo pela conta (`userId`), que é o elo confiável com o
   * Supabase Auth. Se o vínculo ainda não estiver presente, compara pelo e-mail
   * normalizado como alternativa.
   */
  encontrarPorUsuario(usuarioId: string | null | undefined, email: string | null | undefined): Aluno | null {
    if (usuarioId) {
      const porConta = this._alunos().find((aluno) => aluno.userId === usuarioId);
      if (porConta) return porConta;
    }

    const emailNormalizado = email?.trim().toLowerCase();
    if (!emailNormalizado) return null;

    return (
      this._alunos().find((aluno) => aluno.email.trim().toLowerCase() === emailNormalizado) ?? null
    );
  }

  porTurma(turmaId: string): Aluno[] {
    return this._alunos().filter((a) => a.turmaId === turmaId);
  }

  contarPorTurma(turmaId: string): number {
    return this._alunos().filter((a) => a.turmaId === turmaId).length;
  }

  async create(input: Partial<Aluno>): Promise<Aluno> {
    const aluno = await this.repo.create(input);
    this._alunos.update((lista) => [...lista, aluno]);
    return aluno;
  }

  async createMuitos(inputs: Partial<Aluno>[]): Promise<Aluno[]> {
    const listaAtual = this._alunos();
    const novos: Aluno[] = [];
    for (const input of inputs) {
      novos.push(await this.repo.create(input));
    }
    this._alunos.set([...listaAtual, ...novos]);
    return novos;
  }

  async update(id: string, patch: Partial<Aluno>): Promise<Aluno> {
    const aluno = await this.repo.update(id, patch);
    this._alunos.update((lista) => lista.map((a) => (a.id === id ? aluno : a)));
    return aluno;
  }

  async remove(id: string): Promise<void> {
    await this.repo.remove(id);
    this._alunos.update((lista) => lista.filter((a) => a.id !== id));
  }

  async removeTodos(): Promise<void> {
    for (const aluno of this._alunos()) {
      await this.repo.remove(aluno.id);
    }
    this._alunos.set([]);
  }

  async limparTurmas(): Promise<void> {
    const atualizados: Aluno[] = [];
    for (const aluno of this._alunos()) {
      if (!aluno.turmaId) {
        atualizados.push(aluno);
        continue;
      }
      atualizados.push(await this.repo.update(aluno.id, { turmaId: '' }));
    }
    this._alunos.set(atualizados);
  }
}
