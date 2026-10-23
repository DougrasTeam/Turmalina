import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { FuncionalidadesService } from '../../../core/services/funcionalidades.service';
import { PermissoesService } from '../../../core/services/permissoes.service';
import { EscolasSaasService } from '../../../core/services/escolas-saas.service';
import { ToastService } from '../../../core/services/toast.service';
import { PapelEscolar } from '../../../core/models/permissao.model';
import { rotuloPapel } from '../../../core/models/papel.model';
import { EscolaResumo } from '../../../core/models/escola.model';
import { Funcionalidade, agruparFuncionalidades } from '../../../core/models/funcionalidade.model';

/** Aba ativa do painel de permissões. */
type AbaPermissoes = 'papeis' | 'escolas';

/**
 * Painel de permissões: matriz por papel (o que cada papel acessa) e feature
 * flags por escola (liberar/bloquear funcionalidades para uma escola).
 */
@Component({
  selector: 'app-permissoes-saas',
  templateUrl: './permissoes-saas.component.html',
  styleUrl: './permissoes-saas.component.scss',
})
export class PermissoesSaasComponent implements OnInit {
  protected readonly funcionalidades = inject(FuncionalidadesService);
  protected readonly permissoes = inject(PermissoesService);
  protected readonly escolas = inject(EscolasSaasService);
  private readonly toast = inject(ToastService);

  protected readonly aba = signal<AbaPermissoes>('papeis');
  protected readonly escolaSelecionadaId = signal<string | null>(null);

  protected readonly grupos = computed(() => agruparFuncionalidades(this.funcionalidades.catalogo()));
  protected readonly papeis = this.permissoes.papeis;

  protected readonly escolaSelecionada = computed<EscolaResumo | null>(() => {
    const id = this.escolaSelecionadaId();
    if (!id) return null;
    return this.escolas.escolas().find((escola) => escola.id === id) ?? null;
  });

  protected rotulo = rotuloPapel;

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.funcionalidades.carregarCatalogoAtualizado(),
      this.permissoes.load(),
      this.escolas.load(),
    ]);
  }

  protected selecionarAba(aba: AbaPermissoes): void {
    this.aba.set(aba);
  }

  protected selecionarEscola(evento: Event): void {
    const alvo = evento.target as HTMLSelectElement;
    this.escolaSelecionadaId.set(alvo.value === '' ? null : alvo.value);
  }

  // ---- Matriz por papel ----

  protected papelPossui(papel: PapelEscolar, funcionalidade: Funcionalidade): boolean {
    return this.permissoes.papelPossui(papel, funcionalidade.chave);
  }

  protected async alternarPapel(papel: PapelEscolar, funcionalidade: Funcionalidade): Promise<void> {
    const habilitado = !this.permissoes.papelPossui(papel, funcionalidade.chave);
    try {
      await this.permissoes.definirPermissao(papel, funcionalidade.chave, habilitado);
    } catch {
      this.toast.mostrar('Não foi possível salvar a permissão.', 'danger');
    }
  }

  // ---- Feature flags por escola ----

  protected flagDaEscola(funcionalidade: Funcionalidade): boolean | null {
    const escola = this.escolaSelecionada();
    if (!escola) return null;
    const flag = this.permissoes
      .flagsDaEscola(escola.id)
      .find((item) => item.funcionalidade === funcionalidade.chave);
    return flag ? flag.habilitado : null;
  }

  protected async alternarFlagEscola(funcionalidade: Funcionalidade): Promise<void> {
    const escola = this.escolaSelecionada();
    if (!escola) return;

    const atual = this.flagDaEscola(funcionalidade);
    const habilitado = atual === null ? false : !atual;

    try {
      await this.permissoes.definirFuncionalidadeEscola(escola.id, funcionalidade.chave, habilitado);
    } catch {
      this.toast.mostrar('Não foi possível salvar a funcionalidade da escola.', 'danger');
    }
  }

  protected rotuloEstadoFlag(funcionalidade: Funcionalidade): string {
    const estado = this.flagDaEscola(funcionalidade);
    if (estado === null) return 'Padrão';
    return estado ? 'Liberada' : 'Bloqueada';
  }
}
