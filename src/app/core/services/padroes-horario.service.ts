import { Injectable, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import {
  DadosPadraoHorario,
  PADRAO_HORARIO_INICIAL,
  PadraoHorarioEscola,
  validarPadraoHorario,
} from '../models/padrao-horario.model';
import { normalizarHorario } from '../models/horario-turma.model';
import { AuditoriaService } from './auditoria.service';

@Injectable({ providedIn: 'root' })
export class PadroesHorarioService {
  private readonly repo: Repository<PadraoHorarioEscola> =
    inject(RepositoryFactory).create<PadraoHorarioEscola>(
      'turmalina.padroes-horario',
      () => ({ ...PADRAO_HORARIO_INICIAL }),
    );
  private readonly auditoria = inject(AuditoriaService);

  private readonly _padrao = signal<PadraoHorarioEscola | null>(null);
  private carregado = false;

  readonly padrao = this._padrao.asReadonly();

  async load(): Promise<void> {
    if (this.carregado) return;
    const [padrao] = await this.repo.list();
    this._padrao.set(padrao ? this.normalizar(padrao) : null);
    this.carregado = true;
  }

  validar(dados: DadosPadraoHorario): string[] {
    return validarPadraoHorario(dados);
  }

  async salvar(dados: DadosPadraoHorario): Promise<PadraoHorarioEscola> {
    const erros = this.validar(dados);
    if (erros.length) throw new Error(erros.join('\n'));
    if (!this.carregado) await this.load();

    const dadosNormalizados: DadosPadraoHorario = {
      ...dados,
      inicioManha: normalizarHorario(dados.inicioManha),
      inicioTarde: normalizarHorario(dados.inicioTarde),
    };
    const atual = this._padrao();
    const padrao = atual
      ? await this.repo.update(atual.id, dadosNormalizados)
      : await this.repo.create(dadosNormalizados);

    const padraoNormalizado = this.normalizar(padrao);
    this._padrao.set(padraoNormalizado);
    this.auditoria.registrar(
      atual ? 'padrao-horario.atualizado' : 'padrao-horario.criado',
      'PadraoHorarioEscola',
      padraoNormalizado.id,
    );
    return padraoNormalizado;
  }

  private normalizar(padrao: PadraoHorarioEscola): PadraoHorarioEscola {
    return {
      ...padrao,
      inicioManha: normalizarHorario(padrao.inicioManha),
      inicioTarde: normalizarHorario(padrao.inicioTarde),
      aulasManha: Number(padrao.aulasManha),
      aulasTarde: Number(padrao.aulasTarde),
      minutosPorAula: Number(padrao.minutosPorAula),
      minutosIntervalo: Number(padrao.minutosIntervalo),
      intervaloAposAulas: Number(padrao.intervaloAposAulas),
    };
  }
}
