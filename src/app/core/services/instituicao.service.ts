import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import { AuditoriaService } from './auditoria.service';
import { FUSO_PADRAO, Instituicao, StatusInstituicao } from '../models/instituicao.model';

@Injectable({ providedIn: 'root' })
export class InstituicaoService {
  private readonly repo: Repository<Instituicao> = inject(RepositoryFactory).create<Instituicao>(
    'turmalina.instituicao',
    () => ({ nome: '', fusoHorario: FUSO_PADRAO, status: 'ativa' }),
  );
  private readonly auditoria = inject(AuditoriaService);

  private readonly _instituicao = signal<Instituicao | null>(null);
  readonly instituicao = this._instituicao.asReadonly();
  readonly configurada = computed(() => !!this._instituicao()?.nome.trim());

  async load(): Promise<void> {
    const lista = await this.repo.list();
    this._instituicao.set(lista[0] ?? null);
  }

  async salvar(dados: {
    nome: string;
    fusoHorario: string;
    status: Instituicao['status'];
  }): Promise<Instituicao> {
    if (!dados.nome.trim()) {
      throw new Error('Informe o nome da instituição.');
    }
    const atual = this._instituicao();
    const salva = atual ? await this.repo.update(atual.id, dados) : await this.repo.create(dados);
    this._instituicao.set(salva);
    this.auditoria.registrar('instituicao.salva', 'Instituicao', salva.id, salva.nome);
    return salva;
  }
}
