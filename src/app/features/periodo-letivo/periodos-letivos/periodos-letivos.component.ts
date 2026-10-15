import { Component, inject, signal } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { ToastService } from '../../../core/services/toast.service';
import { PeriodoLetivo, StatusPeriodoLetivo, rotuloStatusPeriodo } from '../../../core/models/periodo-letivo.model';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';
import { PeriodoLetivoFormComponent } from '../periodo-letivo-form/periodo-letivo-form.component';

type AcaoPeriodo = 'ativar' | 'encerrar' | 'reabrir' | 'excluir';

interface AcaoPendente {
  tipo: AcaoPeriodo;
  periodo: PeriodoLetivo;
}

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : 'NÃ£o foi possÃ­vel concluir a aÃ§Ã£o.';
}

@Component({
  selector: 'app-periodos-letivos',
  imports: [ModalComponent, PeriodoLetivoFormComponent],
  templateUrl: './periodos-letivos.component.html',
  styleUrl: './periodos-letivos.component.scss',
})
export class PeriodosLetivosComponent {
  protected readonly periodos = inject(PeriodosLetivosService);
  private readonly toast = inject(ToastService);

  protected readonly modalAberto = signal(false);
  protected readonly editando = signal<PeriodoLetivo | null>(null);
  protected readonly acaoPendente = signal<AcaoPendente | null>(null);

  protected statusLabel(status: StatusPeriodoLetivo): string {
    return rotuloStatusPeriodo(status);
  }

  protected classeStatus(status: StatusPeriodoLetivo): string {
    if (status === 'ativo') return 'badge-success';
    if (status === 'encerrado') return 'badge-neutral';
    return 'badge-warning';
  }

  protected formatarData(iso: string): string {
    if (!iso) return 'â€”';
    const partes = iso.split('-');
    if (partes.length !== 3) return iso;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  protected abrirNovo(): void {
    this.editando.set(null);
    this.modalAberto.set(true);
  }

  protected abrirEdicao(periodo: PeriodoLetivo): void {
    this.editando.set(periodo);
    this.modalAberto.set(true);
  }

  protected onSalvo(): void {
    this.modalAberto.set(false);
  }

  protected fechar(): void {
    this.modalAberto.set(false);
  }

  protected pedir(tipo: AcaoPeriodo, periodo: PeriodoLetivo): void {
    this.acaoPendente.set({ tipo, periodo });
  }

  protected cancelar(): void {
    this.acaoPendente.set(null);
  }

  protected tituloConfirmacao(): string {
    switch (this.acaoPendente()?.tipo) {
      case 'ativar':
        return 'Ativar perÃ­odo';
      case 'encerrar':
        return 'Encerrar perÃ­odo';
      case 'reabrir':
        return 'Reabrir perÃ­odo';
      case 'excluir':
        return 'Excluir perÃ­odo';
      default:
        return 'Confirmar';
    }
  }

  protected mensagemConfirmacao(): string {
    const pendente = this.acaoPendente();
    if (!pendente) return '';
    const nome = pendente.periodo.nome;
    switch (pendente.tipo) {
      case 'ativar':
        return `Deseja ativar o perÃ­odo "${nome}"? Se houver outro perÃ­odo ativo, ele serÃ¡ encerrado.`;
      case 'encerrar':
        return `Deseja encerrar o perÃ­odo "${nome}"? O histÃ³rico serÃ¡ preservado e o perÃ­odo ficarÃ¡ bloqueado para ediÃ§Ãµes.`;
      case 'reabrir':
        return `Deseja reabrir o perÃ­odo "${nome}"? Ele voltarÃ¡ ao status planejado.`;
      case 'excluir':
        return `Deseja realmente excluir o perÃ­odo "${nome}"? Esta aÃ§Ã£o nÃ£o pode ser desfeita.`;
    }
  }

  protected async confirmar(): Promise<void> {
    const pendente = this.acaoPendente();
    if (!pendente) return;
    try {
      switch (pendente.tipo) {
        case 'ativar':
          await this.periodos.ativar(pendente.periodo.id);
          this.toast.mostrar('PerÃ­odo ativado.');
          break;
        case 'encerrar':
          await this.periodos.encerrar(pendente.periodo.id);
          this.toast.mostrar('PerÃ­odo encerrado.');
          break;
        case 'reabrir':
          await this.periodos.reabrir(pendente.periodo.id);
          this.toast.mostrar('PerÃ­odo reaberto.');
          break;
        case 'excluir':
          await this.periodos.remover(pendente.periodo.id);
          this.toast.mostrar('PerÃ­odo excluÃ­do.', 'info');
          break;
      }
    } catch (erro) {
      this.toast.mostrar(mensagemErro(erro), 'warning');
    }
    this.acaoPendente.set(null);
  }
}
