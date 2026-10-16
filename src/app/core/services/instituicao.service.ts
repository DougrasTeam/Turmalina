import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import { AuditoriaService } from './auditoria.service';
import {
  CASAS_DECIMAIS_PADRAO,
  FREQUENCIA_MINIMA_PADRAO,
  FUSO_PADRAO,
  Instituicao,
  MEDIA_MINIMA_PADRAO,
  NOTA_MAXIMA_PADRAO,
  StatusInstituicao,
} from '../models/instituicao.model';

@Injectable({ providedIn: 'root' })
export class InstituicaoService {
  private readonly repo: Repository<Instituicao> = inject(RepositoryFactory).create<Instituicao>(
    'turmalina.instituicao',
    () => ({
      nome: '',
      fusoHorario: FUSO_PADRAO,
      status: 'ativa',
      frequenciaMinima: FREQUENCIA_MINIMA_PADRAO,
      faltaJustificadaAbona: true,
      notaMaxima: NOTA_MAXIMA_PADRAO,
      mediaMinima: MEDIA_MINIMA_PADRAO,
      casasDecimaisNota: CASAS_DECIMAIS_PADRAO,
    }),
  );
  private readonly auditoria = inject(AuditoriaService);

  private readonly _instituicao = signal<Instituicao | null>(null);
  readonly instituicao = this._instituicao.asReadonly();
  readonly configurada = computed(() => !!this._instituicao()?.nome.trim());

  readonly frequenciaMinima = computed(
    () => this._instituicao()?.frequenciaMinima ?? FREQUENCIA_MINIMA_PADRAO,
  );
  readonly faltaJustificadaAbona = computed(() => this._instituicao()?.faltaJustificadaAbona ?? true);

  readonly notaMaxima = computed(() => this._instituicao()?.notaMaxima ?? NOTA_MAXIMA_PADRAO);
  readonly mediaMinima = computed(() => this._instituicao()?.mediaMinima ?? MEDIA_MINIMA_PADRAO);
  readonly casasDecimaisNota = computed(
    () => this._instituicao()?.casasDecimaisNota ?? CASAS_DECIMAIS_PADRAO,
  );

  async load(): Promise<void> {
    const lista = await this.repo.list();
    this._instituicao.set(lista[0] ? this.normalizar(lista[0]) : null);
  }

  async salvar(dados: {
    nome: string;
    fusoHorario: string;
    status: Instituicao['status'];
    frequenciaMinima: number;
    faltaJustificadaAbona: boolean;
    notaMaxima: number;
    mediaMinima: number;
    casasDecimaisNota: number;
  }): Promise<Instituicao> {
    if (!dados.nome.trim()) {
      throw new Error('Informe o nome da instituição.');
    }
    if (Number.isNaN(dados.frequenciaMinima) || dados.frequenciaMinima < 0 || dados.frequenciaMinima > 100) {
      throw new Error('A frequência mínima deve estar entre 0 e 100.');
    }
    if (Number.isNaN(dados.notaMaxima) || dados.notaMaxima <= 0) {
      throw new Error('A nota máxima deve ser maior que zero.');
    }
    if (Number.isNaN(dados.mediaMinima) || dados.mediaMinima < 0 || dados.mediaMinima > dados.notaMaxima) {
      throw new Error('A média mínima deve estar entre 0 e a nota máxima.');
    }
    if (dados.casasDecimaisNota < 0 || dados.casasDecimaisNota > 2) {
      throw new Error('As casas decimais devem estar entre 0 e 2.');
    }
    const atual = this._instituicao();
    const salva = atual ? await this.repo.update(atual.id, dados) : await this.repo.create(dados);
    this._instituicao.set(salva);
    this.auditoria.registrar('instituicao.salva', 'Instituicao', salva.id, salva.nome);
    return salva;
  }

  private normalizar(instituicao: Instituicao): Instituicao {
    return {
      ...instituicao,
      frequenciaMinima: instituicao.frequenciaMinima ?? FREQUENCIA_MINIMA_PADRAO,
      faltaJustificadaAbona: instituicao.faltaJustificadaAbona ?? true,
      notaMaxima: instituicao.notaMaxima ?? NOTA_MAXIMA_PADRAO,
      mediaMinima: instituicao.mediaMinima ?? MEDIA_MINIMA_PADRAO,
      casasDecimaisNota: instituicao.casasDecimaisNota ?? CASAS_DECIMAIS_PADRAO,
    };
  }
}
