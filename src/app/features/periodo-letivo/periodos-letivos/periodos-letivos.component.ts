import { Component, computed, inject, signal } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { ConfirmarTextoComponent } from '../../../shared/confirmar-texto/confirmar-texto.component';
import { DadosService } from '../../../core/services/dados.service';
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
  return erro instanceof Error ? erro.message : 'Não foi possível concluir a ação.';
}

@Component({
  selector: 'app-periodos-letivos',
  imports: [ModalComponent, ConfirmarTextoComponent, PeriodoLetivoFormComponent],
  templateUrl: './periodos-letivos.component.html',
  styleUrl: './periodos-letivos.component.scss',
})
export class PeriodosLetivosComponent {
  protected readonly periodos = inject(PeriodosLetivosService);
  private readonly dados = inject(DadosService);
  private readonly toast = inject(ToastService);

  protected readonly modalAberto = signal(false);
  protected readonly editando = signal<PeriodoLetivo | null>(null);
  protected readonly acaoPendente = signal<AcaoPendente | null>(null);
  protected readonly excluirTudoAberto = signal(false);
  protected readonly confirmacaoTudo = computed(() => this.dados.confirmacao('periodos'));

  protected statusLabel(status: StatusPeriodoLetivo): string {
    return rotuloStatusPeriodo(status);
  }

  protected classeStatus(status: StatusPeriodoLetivo): string {
    if (status === 'ativo') return 'badge-success';
    if (status === 'encerrado') return 'badge-neutral';
    return 'badge-warning';
  }

  protected formatarData(iso: string): string {
    if (!iso) return '—';
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
        return 'Ativar período';
      case 'encerrar':
        return 'Encerrar período';
      case 'reabrir':
        return 'Reabrir período';
      case 'excluir':
        return 'Excluir período';
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
        return `Deseja ativar o período "${nome}"? Se houver outro período ativo, ele será encerrado.`;
      case 'encerrar':
        return `Deseja encerrar o período "${nome}"? O histórico será preservado e o período ficará bloqueado para edições.`;
      case 'reabrir':
        return `Deseja reabrir o período "${nome}"? Ele voltará ao status planejado.`;
      case 'excluir':
        return `Deseja realmente excluir o período "${nome}"? Esta ação não pode ser desfeita.`;
    }
  }

  protected async confirmar(): Promise<void> {
    const pendente = this.acaoPendente();
    if (!pendente) return;
    try {
      switch (pendente.tipo) {
        case 'ativar':
          await this.periodos.ativar(pendente.periodo.id);
          this.toast.mostrar('Período ativado.');
          break;
        case 'encerrar':
          await this.periodos.encerrar(pendente.periodo.id);
          this.toast.mostrar('Período encerrado.');
          break;
        case 'reabrir':
          await this.periodos.reabrir(pendente.periodo.id);
          this.toast.mostrar('Período reaberto.');
          break;
        case 'excluir':
          await this.periodos.remover(pendente.periodo.id);
          this.toast.mostrar('Período excluído.', 'info');
          break;
      }
    } catch (erro) {
      this.toast.mostrar(mensagemErro(erro), 'warning');
    }
    this.acaoPendente.set(null);
  }

  protected abrirExclusaoTodos(): void {
    this.excluirTudoAberto.set(true);
  }

  protected fecharExclusaoTodos(): void {
    this.excluirTudoAberto.set(false);
  }

  protected async excluirTodos(): Promise<void> {
    await this.dados.excluir('periodos');
    this.toast.mostrar('Todos os períodos letivos foram excluídos.', 'info');
    this.excluirTudoAberto.set(false);
  }
}
