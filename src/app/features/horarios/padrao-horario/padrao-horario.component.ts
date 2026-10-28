import { Component, computed, inject, signal } from '@angular/core';

import {
  DadosPadraoHorario,
  MINUTOS_INTERVALO_OPCOES,
  PADRAO_HORARIO_INICIAL,
  calcularFimPeriodo,
} from '../../../core/models/padrao-horario.model';
import { PadroesHorarioService } from '../../../core/services/padroes-horario.service';
import { ToastService } from '../../../core/services/toast.service';

type CampoNumericoPadrao =
  | 'aulasManha'
  | 'aulasTarde'
  | 'minutosPorAula'
  | 'minutosIntervalo'
  | 'intervaloAposAulas';

@Component({
  selector: 'app-padrao-horario',
  templateUrl: './padrao-horario.component.html',
  styleUrl: './padrao-horario.component.scss',
})
export class PadraoHorarioComponent {
  private readonly padroesService = inject(PadroesHorarioService);
  private readonly toast = inject(ToastService);

  protected readonly opcoesIntervalo = MINUTOS_INTERVALO_OPCOES;
  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly formulario = signal<DadosPadraoHorario>({
    ...PADRAO_HORARIO_INICIAL,
  });

  protected readonly fimManha = computed(() => {
    const formulario = this.formulario();
    return (
      calcularFimPeriodo(
        formulario.inicioManha,
        formulario.aulasManha,
        formulario.minutosPorAula,
        formulario.minutosIntervalo,
        formulario.intervaloAposAulas,
      ) ?? '--:--'
    );
  });

  protected readonly fimTarde = computed(() => {
    const formulario = this.formulario();
    return (
      calcularFimPeriodo(
        formulario.inicioTarde,
        formulario.aulasTarde,
        formulario.minutosPorAula,
        formulario.minutosIntervalo,
        formulario.intervaloAposAulas,
      ) ?? '--:--'
    );
  });

  constructor() {
    void this.carregar();
  }

  protected atualizarInicioManha(evento: Event): void {
    this.formulario.update((formulario) => ({
      ...formulario,
      inicioManha: this.valor(evento),
    }));
  }

  protected atualizarInicioTarde(evento: Event): void {
    this.formulario.update((formulario) => ({
      ...formulario,
      inicioTarde: this.valor(evento),
    }));
  }

  protected atualizarAulasManha(evento: Event): void {
    this.atualizarNumero('aulasManha', evento);
  }

  protected atualizarAulasTarde(evento: Event): void {
    this.atualizarNumero('aulasTarde', evento);
  }

  protected atualizarMinutosPorAula(evento: Event): void {
    this.atualizarNumero('minutosPorAula', evento);
  }

  protected atualizarMinutosIntervalo(evento: Event): void {
    this.atualizarNumero('minutosIntervalo', evento);
  }

  protected atualizarIntervaloAposAulas(evento: Event): void {
    this.atualizarNumero('intervaloAposAulas', evento);
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.salvando()) return;

    const erros = this.padroesService.validar(this.formulario());
    if (erros.length) {
      this.toast.mostrar(erros[0], 'warning');
      return;
    }

    this.salvando.set(true);
    try {
      const padrao = await this.padroesService.salvar(this.formulario());
      this.formulario.set({
        inicioManha: padrao.inicioManha,
        aulasManha: padrao.aulasManha,
        inicioTarde: padrao.inicioTarde,
        aulasTarde: padrao.aulasTarde,
        minutosPorAula: padrao.minutosPorAula,
        minutosIntervalo: padrao.minutosIntervalo,
        intervaloAposAulas: padrao.intervaloAposAulas,
      });
      this.toast.mostrar('Padrão de horário salvo.');
    } catch (erro) {
      this.toast.mostrar(this.mensagemErro(erro), 'warning');
    } finally {
      this.salvando.set(false);
    }
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      await this.padroesService.load();
      const padrao = this.padroesService.padrao();
      if (!padrao) return;

      this.formulario.set({
        inicioManha: padrao.inicioManha,
        aulasManha: padrao.aulasManha,
        inicioTarde: padrao.inicioTarde,
        aulasTarde: padrao.aulasTarde,
        minutosPorAula: padrao.minutosPorAula,
        minutosIntervalo: padrao.minutosIntervalo,
        intervaloAposAulas: padrao.intervaloAposAulas,
      });
    } catch (erro) {
      this.toast.mostrar(this.mensagemErro(erro), 'warning');
    } finally {
      this.carregando.set(false);
    }
  }

  private atualizarNumero(campo: CampoNumericoPadrao, evento: Event): void {
    const valor = Number(this.valor(evento));
    this.formulario.update((formulario) => ({
      ...formulario,
      [campo]: valor,
    }));
  }

  private valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  private mensagemErro(erro: unknown): string {
    return erro instanceof Error
      ? erro.message
      : 'Não foi possível salvar o padrão de horário.';
  }
}
