import { Component, inject, linkedSignal } from '@angular/core';

import { ToastService } from '../../../core/services/toast.service';
import {
  CASAS_DECIMAIS_OPCOES,
  CASAS_DECIMAIS_PADRAO,
  FREQUENCIA_MINIMA_PADRAO,
  FUSO_PADRAO,
  FUSOS_SUGERIDOS,
  MEDIA_MINIMA_PADRAO,
  NOTA_MAXIMA_PADRAO,
  STATUS_INSTITUICAO,
  StatusInstituicao,
} from '../../../core/models/instituicao.model';
import { InstituicaoService } from '../../../core/services/instituicao.service';

interface InstituicaoFormData {
  nome: string;
  fusoHorario: string;
  status: StatusInstituicao;
  frequenciaMinima: number;
  faltaJustificadaAbona: boolean;
  notaMaxima: number;
  mediaMinima: number;
  casasDecimaisNota: number;
}

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : 'Não foi possível salvar.';
}

@Component({
  selector: 'app-instituicao',
  templateUrl: './instituicao.component.html',
  styleUrl: './instituicao.component.scss',
})
export class InstituicaoComponent {
  protected readonly instituicao = inject(InstituicaoService);
  private readonly toast = inject(ToastService);

  protected readonly statusOpcoes = STATUS_INSTITUICAO;
  protected readonly fusos = FUSOS_SUGERIDOS;
  protected readonly casasOpcoes = CASAS_DECIMAIS_OPCOES;

  protected readonly form = linkedSignal<InstituicaoFormData>(() => {
    const atual = this.instituicao.instituicao();
    return atual
      ? {
          nome: atual.nome,
          fusoHorario: atual.fusoHorario,
          status: atual.status,
          frequenciaMinima: atual.frequenciaMinima,
          faltaJustificadaAbona: atual.faltaJustificadaAbona,
          notaMaxima: atual.notaMaxima,
          mediaMinima: atual.mediaMinima,
          casasDecimaisNota: atual.casasDecimaisNota,
        }
      : {
          nome: '',
          fusoHorario: FUSO_PADRAO,
          status: 'ativa',
          frequenciaMinima: FREQUENCIA_MINIMA_PADRAO,
          faltaJustificadaAbona: true,
          notaMaxima: NOTA_MAXIMA_PADRAO,
          mediaMinima: MEDIA_MINIMA_PADRAO,
          casasDecimaisNota: CASAS_DECIMAIS_PADRAO,
        };
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected patch(campo: 'nome' | 'fusoHorario', texto: string): void {
    this.form.update((atual) => ({ ...atual, [campo]: texto }));
  }

  protected patchNumero(
    campo: 'frequenciaMinima' | 'notaMaxima' | 'mediaMinima' | 'casasDecimaisNota',
    valor: string,
  ): void {
    const numero = Number(valor);
    this.form.update((atual) => ({ ...atual, [campo]: Number.isNaN(numero) ? 0 : numero }));
  }

  protected marcado(evento: Event): boolean {
    return (evento.target as HTMLInputElement).checked;
  }

  protected setAbona(evento: Event): void {
    const faltaJustificadaAbona = this.marcado(evento);
    this.form.update((atual) => ({ ...atual, faltaJustificadaAbona }));
  }

  protected setStatus(evento: Event): void {
    this.form.update((atual) => ({ ...atual, status: this.valor(evento) as StatusInstituicao }));
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    try {
      await this.instituicao.salvar(this.form());
      this.toast.mostrar('Dados da instituição salvos com sucesso!');
    } catch (erro) {
      this.toast.mostrar(mensagemErro(erro), 'warning');
    }
  }
}
