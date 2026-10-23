import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { EscolasSaasService } from '../../../core/services/escolas-saas.service';
import { PlanosService } from '../../../core/services/planos.service';
import { ToastService } from '../../../core/services/toast.service';
import { EscolaResumo } from '../../../core/models/escola.model';
import { formatarPrecoMensal } from '../../../core/models/plano.model';

/** Painel de escolas: lista as escolas com status e plano contratado. */
@Component({
  selector: 'app-escolas-saas',
  templateUrl: './escolas-saas.component.html',
  styleUrl: './escolas-saas.component.scss',
})
export class EscolasSaasComponent implements OnInit {
  protected readonly escolas = inject(EscolasSaasService);
  protected readonly planos = inject(PlanosService);
  private readonly toast = inject(ToastService);

  protected readonly apenasAtivas = signal(true);

  protected readonly listaExibida = computed<EscolaResumo[]>(() =>
    this.apenasAtivas() ? this.escolas.ativas() : this.escolas.escolas(),
  );

  protected formatarPreco = formatarPrecoMensal;

  async ngOnInit(): Promise<void> {
    await Promise.all([this.escolas.load(), this.planos.load()]);
  }

  protected planoDa(escola: EscolaResumo) {
    return this.escolas.planoDaEscola(escola, this.planos.planos());
  }

  protected alternarAtivas(): void {
    this.apenasAtivas.update((valor) => !valor);
  }

  protected async trocarPlano(escola: EscolaResumo, evento: Event): Promise<void> {
    const alvo = evento.target as HTMLSelectElement;
    const planoId = alvo.value === '' ? null : alvo.value;
    try {
      await this.escolas.definirPlano(escola.id, planoId);
      this.toast.mostrar('Plano da escola atualizado.', 'success');
    } catch {
      this.toast.mostrar('Não foi possível atualizar o plano.', 'danger');
    }
  }

  protected async alternarStatus(escola: EscolaResumo): Promise<void> {
    const novoStatus = escola.status === 'ativa' ? 'inativa' : 'ativa';
    try {
      await this.escolas.definirStatus(escola.id, novoStatus);
      this.toast.mostrar(`Escola marcada como ${novoStatus}.`, 'success');
    } catch {
      this.toast.mostrar('Não foi possível alterar o status.', 'danger');
    }
  }
}
