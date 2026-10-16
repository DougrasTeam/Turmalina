import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import { DadosVinculoDocente, VinculoDocente } from '../models/vinculo-docente.model';
import { AuditoriaService } from './auditoria.service';

@Injectable({ providedIn: 'root' })
export class VinculosDocentesService {
  private readonly repo: Repository<VinculoDocente> = inject(RepositoryFactory).create<VinculoDocente>(
    'turmalina.vinculos-docentes',
    () => ({ professorId: '', turmaId: '', disciplinaId: '', ativo: true }),
  );
  private readonly auditoria = inject(AuditoriaService);

  private readonly _vinculos = signal<VinculoDocente[]>([]);
  private carregado = false;

  readonly vinculos = this._vinculos.asReadonly();
  readonly total = computed(() => this._vinculos().length);

  async load(): Promise<void> {
    if (this.carregado) return;
    this._vinculos.set(await this.repo.list());
    this.carregado = true;
  }

  porTurma(turmaId: string): VinculoDocente[] {
    return this._vinculos().filter((vinculo) => vinculo.turmaId === turmaId);
  }

  porProfessor(professorId: string): VinculoDocente[] {
    return this._vinculos().filter((vinculo) => vinculo.professorId === professorId);
  }

  existe(dados: DadosVinculoDocente): boolean {
    return this._vinculos().some(
      (vinculo) =>
        vinculo.turmaId === dados.turmaId &&
        vinculo.professorId === dados.professorId &&
        vinculo.disciplinaId === dados.disciplinaId,
    );
  }

  async criar(dados: DadosVinculoDocente): Promise<VinculoDocente> {
    if (!dados.professorId || !dados.turmaId || !dados.disciplinaId) {
      throw new Error('Selecione o professor e a disciplina para vincular.');
    }
    if (this.existe(dados)) {
      throw new Error('Este professor já está vinculado a esta disciplina nesta turma.');
    }
    const vinculo = await this.repo.create({ ...dados, ativo: true });
    this._vinculos.update((lista) => [...lista, vinculo]);
    this.auditoria.registrar('vinculo.criado', 'VinculoDocente', vinculo.id, dados.professorId);
    return vinculo;
  }

  async remover(id: string): Promise<void> {
    const vinculo = this._vinculos().find((item) => item.id === id);
    await this.repo.remove(id);
    this._vinculos.update((lista) => lista.filter((item) => item.id !== id));
    if (vinculo) {
      this.auditoria.registrar('vinculo.removido', 'VinculoDocente', id, vinculo.professorId);
    }
  }

  async removerPorTurma(turmaId: string): Promise<void> {
    const alvos = this.porTurma(turmaId);
    for (const vinculo of alvos) {
      await this.repo.remove(vinculo.id);
    }
    if (alvos.length) {
      this._vinculos.update((lista) => lista.filter((vinculo) => vinculo.turmaId !== turmaId));
    }
  }

  async removerTodos(): Promise<void> {
    for (const vinculo of this._vinculos()) {
      await this.repo.remove(vinculo.id);
    }
    this._vinculos.set([]);
    this.auditoria.registrar('vinculo.removidos-todos', 'VinculoDocente', null, null);
  }
}
