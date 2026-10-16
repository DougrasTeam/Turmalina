import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import { AuditoriaService } from './auditoria.service';
import {
  DadosPeriodoLetivo,
  PeriodoLetivo,
  StatusPeriodoLetivo,
  validarPeriodoLetivo,
} from '../models/periodo-letivo.model';

@Injectable({ providedIn: 'root' })
export class PeriodosLetivosService {
  private readonly repo: Repository<PeriodoLetivo> = inject(RepositoryFactory).create<PeriodoLetivo>(
    'turmalina.periodos-letivos',
    () => ({ nome: '', dataInicio: '', dataFim: '', status: 'planejado', etapas: [] }),
  );
  private readonly auditoria = inject(AuditoriaService);

  private readonly _periodos = signal<PeriodoLetivo[]>([]);
  readonly periodos = this._periodos.asReadonly();
  readonly ativo = computed(() => this._periodos().find((periodo) => periodo.status === 'ativo') ?? null);

  async load(): Promise<void> {
    this._periodos.set(this.ordenar(await this.repo.list()));
  }

  porId(id: string): PeriodoLetivo | undefined {
    return this._periodos().find((item) => item.id === id);
  }

  periodoEncerrado(id: string): boolean {
    return this.porId(id)?.status === 'encerrado';
  }

  validar(dados: DadosPeriodoLetivo, idAtual?: string): string[] {
    return validarPeriodoLetivo(dados, this._periodos(), idAtual);
  }

  async criar(dados: DadosPeriodoLetivo): Promise<PeriodoLetivo> {
    const erros = this.validar(dados);
    if (erros.length) throw new Error(erros.join('\n'));
    const periodo = await this.repo.create({ ...dados, status: 'planejado' });
    this._periodos.update((lista) => this.ordenar([...lista, periodo]));
    this.auditoria.registrar('periodo.criado', 'PeriodoLetivo', periodo.id, periodo.nome);
    return periodo;
  }

  async atualizar(id: string, dados: DadosPeriodoLetivo): Promise<PeriodoLetivo> {
    const erros = this.validar(dados, id);
    if (erros.length) throw new Error(erros.join('\n'));
    const periodo = await this.repo.update(id, dados);
    this._periodos.update((lista) => this.ordenar(lista.map((item) => (item.id === id ? periodo : item))));
    this.auditoria.registrar('periodo.atualizado', 'PeriodoLetivo', id, periodo.nome);
    return periodo;
  }

  async ativar(id: string): Promise<void> {
    const periodo = this.porId(id);
    if (!periodo) return;
    const outrosAtivos = this._periodos().filter((item) => item.id !== id && item.status === 'ativo');
    for (const outro of outrosAtivos) {
      await this.repo.update(outro.id, { status: 'encerrado' });
    }
    const atualizado = await this.repo.update(id, { status: 'ativo' });
    const idsEncerrados = new Set(outrosAtivos.map((outro) => outro.id));
    this._periodos.update((lista) =>
      this.ordenar(
        lista.map((item) => {
          if (item.id === id) return atualizado;
          if (idsEncerrados.has(item.id)) return { ...item, status: 'encerrado' as StatusPeriodoLetivo };
          return item;
        }),
      ),
    );
    this.auditoria.registrar('periodo.ativado', 'PeriodoLetivo', id, periodo.nome);
  }

  async encerrar(id: string): Promise<void> {
    const periodo = this.porId(id);
    if (!periodo) return;
    const atualizado = await this.repo.update(id, { status: 'encerrado' });
    this._periodos.update((lista) => this.ordenar(lista.map((item) => (item.id === id ? atualizado : item))));
    this.auditoria.registrar('periodo.encerrado', 'PeriodoLetivo', id, periodo.nome);
  }

  async reabrir(id: string): Promise<void> {
    const periodo = this.porId(id);
    if (!periodo) return;
    const atualizado = await this.repo.update(id, { status: 'planejado' });
    this._periodos.update((lista) => this.ordenar(lista.map((item) => (item.id === id ? atualizado : item))));
    this.auditoria.registrar('periodo.reaberto', 'PeriodoLetivo', id, periodo.nome);
  }

  async remover(id: string): Promise<void> {
    const periodo = this.porId(id);
    if (periodo && periodo.status !== 'planejado') {
      throw new Error('Apenas períodos planejados podem ser excluídos. Preserve o histórico.');
    }
    await this.repo.remove(id);
    this._periodos.update((lista) => lista.filter((item) => item.id !== id));
    if (periodo) {
      this.auditoria.registrar('periodo.excluido', 'PeriodoLetivo', id, periodo.nome);
    }
  }

  async removerTodos(): Promise<void> {
    for (const periodo of this._periodos()) {
      await this.repo.remove(periodo.id);
    }
    this._periodos.set([]);
    this.auditoria.registrar('periodo.excluidos-todos', 'PeriodoLetivo', null, null);
  }

  private ordenar(lista: PeriodoLetivo[]): PeriodoLetivo[] {
    return [...lista].sort((primeiro, segundo) => primeiro.dataInicio.localeCompare(segundo.dataInicio));
  }
}
