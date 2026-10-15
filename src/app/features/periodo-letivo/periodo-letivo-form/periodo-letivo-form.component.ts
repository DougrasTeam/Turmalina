import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { createId } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import {
  EtapaAvaliacao,
  TIPOS_ETAPA,
  TipoEtapa,
} from '../../../core/models/etapa-avaliacao.model';
import { DadosPeriodoLetivo, PeriodoLetivo } from '../../../core/models/periodo-letivo.model';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : 'NÃ£o foi possÃ­vel salvar.';
}

@Component({
  selector: 'app-periodo-letivo-form',
  imports: [ModalComponent],
  templateUrl: './periodo-letivo-form.component.html',
  styleUrl: './periodo-letivo-form.component.scss',
})
export class PeriodoLetivoFormComponent {
  readonly open = input(false);
  readonly periodo = input<PeriodoLetivo | null>(null);

  readonly salvo = output<void>();
  readonly fechado = output<void>();

  private readonly periodos = inject(PeriodosLetivosService);
  private readonly toast = inject(ToastService);

  protected readonly tiposEtapa = TIPOS_ETAPA;
  protected readonly erros = signal<string[]>([]);

  protected readonly form = linkedSignal<DadosPeriodoLetivo>(() => {
    const atual = this.periodo();
    if (atual) {
      return {
        nome: atual.nome,
        dataInicio: atual.dataInicio,
        dataFim: atual.dataFim,
        etapas: atual.etapas.map((etapa) => ({ ...etapa })),
      };
    }
    return { nome: '', dataInicio: '', dataFim: '', etapas: [] };
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected patch(campo: 'nome' | 'dataInicio' | 'dataFim', texto: string): void {
    this.form.update((atual) => ({ ...atual, [campo]: texto }));
  }

  protected adicionarEtapa(): void {
    this.form.update((atual) => ({
      ...atual,
      etapas: [
        ...atual.etapas,
        { id: createId(), nome: '', tipo: 'bimestre', dataInicio: '', dataFim: '' },
      ],
    }));
  }

  protected removerEtapa(indice: number): void {
    this.form.update((atual) => ({
      ...atual,
      etapas: atual.etapas.filter((_, posicao) => posicao !== indice),
    }));
  }

  protected setEtapaNome(indice: number, texto: string): void {
    this.atualizarEtapa(indice, { nome: texto });
  }

  protected setEtapaTipo(indice: number, texto: string): void {
    this.atualizarEtapa(indice, { tipo: texto as TipoEtapa });
  }

  protected setEtapaInicio(indice: number, texto: string): void {
    this.atualizarEtapa(indice, { dataInicio: texto });
  }

  protected setEtapaFim(indice: number, texto: string): void {
    this.atualizarEtapa(indice, { dataFim: texto });
  }

  protected fechar(): void {
    this.erros.set([]);
    this.fechado.emit();
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    const dados = this.form();
    const validacao = this.periodos.validar(dados, this.periodo()?.id);
    this.erros.set(validacao);
    if (validacao.length) {
      this.toast.mostrar('Corrija os campos destacados.', 'warning');
      return;
    }
    try {
      const atual = this.periodo();
      if (atual) {
        await this.periodos.atualizar(atual.id, dados);
        this.toast.mostrar('PerÃ­odo letivo atualizado com sucesso!');
      } else {
        await this.periodos.criar(dados);
        this.toast.mostrar('PerÃ­odo letivo criado com sucesso!');
      }
      this.erros.set([]);
      this.salvo.emit();
    } catch (erro) {
      this.toast.mostrar(mensagemErro(erro), 'warning');
    }
  }

  private atualizarEtapa(indice: number, patchEtapa: Partial<EtapaAvaliacao>): void {
    this.form.update((atual) => ({
      ...atual,
      etapas: atual.etapas.map((etapa, posicao) =>
        posicao === indice ? { ...etapa, ...patchEtapa } : etapa,
      ),
    }));
  }
}
