import { Component, computed, inject, signal } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { ConfirmarTextoComponent } from '../../../shared/confirmar-texto/confirmar-texto.component';
import { DisciplinaFormComponent } from '../disciplina-form/disciplina-form.component';
import { DadosService } from '../../../core/services/dados.service';
import { DisciplinasService } from '../../../core/services/disciplinas.service';
import { ToastService } from '../../../core/services/toast.service';
import { Disciplina } from '../../../core/models/disciplina.model';

@Component({
  selector: 'app-disciplinas',
  imports: [ModalComponent, ConfirmarTextoComponent, DisciplinaFormComponent],
  templateUrl: './disciplinas.component.html',
  styleUrl: './disciplinas.component.scss',
})
export class DisciplinasComponent {
  protected readonly disciplinas = inject(DisciplinasService);
  private readonly dados = inject(DadosService);
  private readonly toast = inject(ToastService);

  protected readonly busca = signal('');
  readonly filtradas = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const lista = this.disciplinas.disciplinas();
    if (!termo) return lista;
    return lista.filter((disciplina) =>
      [disciplina.nome, disciplina.codigo].some((campo) => campo.toLowerCase().includes(termo)),
    );
  });

  protected readonly modalAberto = signal(false);
  protected readonly editando = signal<Disciplina | null>(null);
  protected readonly criandoPadrao = signal(false);

  protected readonly exclusaoAberta = signal(false);
  protected readonly disciplinaEmExclusao = signal<Disciplina | null>(null);
  protected readonly excluirTudoAberto = signal(false);
  protected readonly confirmacaoTudo = computed(() => this.dados.confirmacao('disciplinas'));

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected abrirNovo(): void {
    this.editando.set(null);
    this.modalAberto.set(true);
  }

  protected async criarDisciplinasPadrao(): Promise<void> {
    this.criandoPadrao.set(true);
    try {
      await this.disciplinas.load();
      const quantidade = await this.disciplinas.criarDisciplinasPadrao();
      if (quantidade === 0) {
        this.toast.mostrar('Todas as disciplinas padrão já estão cadastradas.', 'info');
        return;
      }
      this.toast.mostrar(`${quantidade} disciplina(s) padrão criada(s).`);
    } catch (erro) {
      this.toast.mostrar(
        erro instanceof Error ? erro.message : 'Não foi possível criar as disciplinas padrão.',
        'warning',
      );
    } finally {
      this.criandoPadrao.set(false);
    }
  }

  protected abrirEdicao(disciplina: Disciplina): void {
    this.editando.set(disciplina);
    this.modalAberto.set(true);
  }

  protected onSalvo(): void {
    this.modalAberto.set(false);
  }

  protected fechar(): void {
    this.modalAberto.set(false);
  }

  protected async alternarAtiva(disciplina: Disciplina): Promise<void> {
    await this.disciplinas.alternarAtiva(disciplina.id);
    this.toast.mostrar(disciplina.ativa ? 'Disciplina desativada.' : 'Disciplina ativada.', 'info');
  }

  protected pedirExclusao(disciplina: Disciplina): void {
    this.disciplinaEmExclusao.set(disciplina);
    this.exclusaoAberta.set(true);
  }

  protected cancelarExclusao(): void {
    this.exclusaoAberta.set(false);
    this.disciplinaEmExclusao.set(null);
  }

  protected async confirmarExclusao(): Promise<void> {
    const disciplina = this.disciplinaEmExclusao();
    if (!disciplina) return;
    await this.disciplinas.remover(disciplina.id);
    this.toast.mostrar('Disciplina excluída.', 'info');
    this.cancelarExclusao();
  }

  protected abrirExclusaoTodas(): void {
    this.excluirTudoAberto.set(true);
  }

  protected fecharExclusaoTodas(): void {
    this.excluirTudoAberto.set(false);
  }

  protected async excluirTodas(): Promise<void> {
    await this.dados.excluir('disciplinas');
    this.toast.mostrar('Todas as disciplinas foram excluídas.', 'info');
    this.excluirTudoAberto.set(false);
  }
}
