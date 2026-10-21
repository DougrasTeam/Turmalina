import { Component, inject, signal } from '@angular/core';

import {
  AcaoGamificacao,
  DadosAcaoGamificacao,
  ICONES_ACAO,
} from '../../../core/models/gamificacao.model';
import { GamificacaoService } from '../../../core/services/gamificacao.service';
import { ToastService } from '../../../core/services/toast.service';

const FORMULARIO_VAZIO: DadosAcaoGamificacao = {
  nome: '',
  icone: 'star',
  valorXp: 10,
  indicador: '',
  ativa: true,
};

@Component({
  selector: 'app-acoes-gamificacao',
  templateUrl: './acoes-gamificacao.component.html',
  styleUrl: './acoes-gamificacao.component.scss',
})
export class AcoesGamificacaoComponent {
  protected readonly gamificacao = inject(GamificacaoService);
  private readonly toast = inject(ToastService);

  protected readonly icones = ICONES_ACAO;
  protected readonly formAberto = signal(false);
  protected readonly editando = signal<AcaoGamificacao | null>(null);
  protected readonly formulario = signal<DadosAcaoGamificacao>({ ...FORMULARIO_VAZIO });
  protected readonly erros = signal<string[]>([]);

  protected abrirNovaAcao(): void {
    this.editando.set(null);
    this.formulario.set({ ...FORMULARIO_VAZIO });
    this.erros.set([]);
    this.formAberto.set(true);
  }

  protected editar(acao: AcaoGamificacao): void {
    this.editando.set(acao);
    this.formulario.set({
      nome: acao.nome,
      icone: acao.icone,
      valorXp: acao.valorXp,
      indicador: acao.indicador,
      ativa: acao.ativa,
    });
    this.erros.set([]);
    this.formAberto.set(true);
  }

  protected fecharForm(): void {
    this.formAberto.set(false);
    this.editando.set(null);
  }

  protected alterarNome(evento: Event): void {
    this.atualizarCampo('nome', this.valorDoCampo(evento));
  }

  protected alterarIcone(evento: Event): void {
    this.atualizarCampo('icone', this.valorDoCampo(evento));
  }

  protected alterarIndicador(evento: Event): void {
    this.atualizarCampo('indicador', this.valorDoCampo(evento));
  }

  protected alterarValorXp(evento: Event): void {
    this.atualizarCampo('valorXp', Number(this.valorDoCampo(evento)));
  }

  protected alterarAtiva(evento: Event): void {
    this.atualizarCampo('ativa', (evento.target as HTMLInputElement).checked);
  }

  protected async salvar(): Promise<void> {
    const dados = this.formulario();
    const acaoEmEdicao = this.editando();
    try {
      if (acaoEmEdicao) {
        await this.gamificacao.atualizarAcao(acaoEmEdicao.id, dados);
        this.toast.mostrar('Ação de XP atualizada.', 'success');
      } else {
        await this.gamificacao.criarAcao(dados);
        this.toast.mostrar('Ação de XP criada.', 'success');
      }
      this.fecharForm();
    } catch (erro) {
      this.erros.set(this.mensagemDeErro(erro).split('\n'));
    }
  }

  protected async alternar(acao: AcaoGamificacao): Promise<void> {
    await this.gamificacao.alternarAtiva(acao.id);
    this.toast.mostrar(acao.ativa ? 'Ação desativada.' : 'Ação ativada.', 'info');
  }

  protected async remover(acao: AcaoGamificacao): Promise<void> {
    await this.gamificacao.removerAcao(acao.id);
    this.toast.mostrar('Ação de XP excluída.', 'info');
  }

  protected formatarValorXp(valorXp: number): string {
    return valorXp > 0 ? `+${valorXp} XP` : `${valorXp} XP`;
  }

  private atualizarCampo<Campo extends keyof DadosAcaoGamificacao>(
    campo: Campo,
    valor: DadosAcaoGamificacao[Campo],
  ): void {
    this.formulario.update((atual) => ({ ...atual, [campo]: valor }));
  }

  private valorDoCampo(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  private mensagemDeErro(erro: unknown): string {
    return erro instanceof Error ? erro.message : 'Não foi possível salvar a ação de XP.';
  }
}
