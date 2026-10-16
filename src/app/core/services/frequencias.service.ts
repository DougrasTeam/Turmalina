import { Injectable, computed, inject, signal } from '@angular/core';

import { AuditoriaService } from './auditoria.service';
import { InstituicaoService } from './instituicao.service';
import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import {
  DadosFrequencia,
  Frequencia,
  ResumoFrequencia,
  calcularResumoFrequencia,
  validarFrequencia,
} from '../models/frequencia.model';

@Injectable({ providedIn: 'root' })
export class FrequenciasService {
  private readonly repo: Repository<Frequencia> = inject(RepositoryFactory).create<Frequencia>(
    'turmalina.frequencias',
    () => ({
      turmaId: '',
      periodoLetivoId: '',
      disciplinaId: null,
      data: '',
      registros: [],
      observacao: null,
    }),
  );
  private readonly auditoria = inject(AuditoriaService);
  private readonly instituicao = inject(InstituicaoService);

  private readonly _frequencias = signal<Frequencia[]>([]);
  private carregado = false;

  readonly frequencias = this._frequencias.asReadonly();
  readonly total = computed(() => this._frequencias().length);

  async load(): Promise<void> {
    if (this.carregado) return;
    this._frequencias.set(this.ordenar(await this.repo.list()));
    this.carregado = true;
  }

  porId(id: string): Frequencia | undefined {
    return this._frequencias().find((frequencia) => frequencia.id === id);
  }

  porTurma(turmaId: string): Frequencia[] {
    return this._frequencias().filter((frequencia) => frequencia.turmaId === turmaId);
  }

  encontrar(turmaId: string, data: string, disciplinaId: string | null): Frequencia | undefined {
    return this._frequencias().find(
      (frequencia) =>
        frequencia.turmaId === turmaId &&
        frequencia.data === data &&
        (frequencia.disciplinaId || null) === (disciplinaId || null),
    );
  }

  validar(dados: DadosFrequencia, idAtual?: string): string[] {
    return validarFrequencia(dados, this._frequencias(), idAtual);
  }

  async salvar(dados: DadosFrequencia): Promise<Frequencia> {
    const existente = this.encontrar(dados.turmaId, dados.data, dados.disciplinaId ?? null);
    const erros = this.validar(dados, existente?.id);
    if (erros.length) throw new Error(erros.join('\n'));

    const payload = {
      turmaId: dados.turmaId,
      periodoLetivoId: dados.periodoLetivoId ?? '',
      disciplinaId: dados.disciplinaId || null,
      data: dados.data,
      registros: dados.registros,
      observacao: dados.observacao ?? null,
    };

    const salva = existente
      ? await this.repo.update(existente.id, payload)
      : await this.repo.create(payload);

    this._frequencias.update((lista) =>
      this.ordenar(existente ? lista.map((f) => (f.id === salva.id ? salva : f)) : [...lista, salva]),
    );
    this.auditoria.registrar('frequencia.salva', 'Frequencia', salva.id, `${dados.turmaId}@${dados.data}`);
    return salva;
  }

  async remover(id: string): Promise<void> {
    const frequencia = this.porId(id);
    await this.repo.remove(id);
    this._frequencias.update((lista) => lista.filter((item) => item.id !== id));
    if (frequencia) {
      this.auditoria.registrar('frequencia.excluida', 'Frequencia', id, `${frequencia.turmaId}@${frequencia.data}`);
    }
  }

  async removerTodas(): Promise<void> {
    for (const frequencia of this._frequencias()) {
      await this.repo.remove(frequencia.id);
    }
    this._frequencias.set([]);
    this.auditoria.registrar('frequencia.excluidas-todas', 'Frequencia', null, null);
  }

  async removerPorTurma(turmaId: string): Promise<void> {
    const alvos = this.porTurma(turmaId);
    for (const frequencia of alvos) {
      await this.repo.remove(frequencia.id);
    }
    if (alvos.length) {
      this._frequencias.update((lista) => lista.filter((frequencia) => frequencia.turmaId !== turmaId));
    }
  }

  resumoTurma(turmaId: string): ResumoFrequencia {
    const registros = this.porTurma(turmaId).flatMap((frequencia) => frequencia.registros);
    return calcularResumoFrequencia(registros, this.instituicao.faltaJustificadaAbona());
  }

  resumoAluno(alunoId: string): ResumoFrequencia {
    const registros = this._frequencias().flatMap((frequencia) =>
      frequencia.registros.filter((registro) => registro.alunoId === alunoId),
    );
    return calcularResumoFrequencia(registros, this.instituicao.faltaJustificadaAbona());
  }

  abaixoDoLimite(percentual: number | null): boolean {
    return percentual !== null && percentual < this.instituicao.frequenciaMinima();
  }

  private ordenar(lista: Frequencia[]): Frequencia[] {
    return [...lista].sort((primeira, segunda) => segunda.data.localeCompare(primeira.data));
  }
}
