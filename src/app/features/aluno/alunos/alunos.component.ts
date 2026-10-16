import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { ConfirmarTextoComponent } from '../../../shared/confirmar-texto/confirmar-texto.component';
import { AlunoFormComponent } from '../aluno-form/aluno-form.component';
import { AlunoImportComponent, ResumoImport } from '../aluno-import/aluno-import.component';
import { AlunosService } from '../../../core/services/alunos.service';
import { DadosService } from '../../../core/services/dados.service';
import { MatriculasService } from '../../../core/services/matriculas.service';
import { ToastService } from '../../../core/services/toast.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { Aluno, Matricula, formatarDataMatricula, labelStatusMatricula } from '../../../core/models';

@Component({
  selector: 'app-alunos',
  imports: [RouterLink, ModalComponent, ConfirmarTextoComponent, AlunoFormComponent, AlunoImportComponent],
  templateUrl: './alunos.component.html',
  styleUrl: './alunos.component.scss',
})
export class AlunosComponent {
  protected readonly alunos = inject(AlunosService);
  protected readonly turmas = inject(TurmasService);
  protected readonly matriculas = inject(MatriculasService);
  private readonly dados = inject(DadosService);
  private readonly toast = inject(ToastService);

  protected readonly busca = signal('');
  protected readonly turmaFiltro = signal('');
  protected readonly modalAberto = signal(false);
  protected readonly importAberto = signal(false);
  protected readonly editando = signal<Aluno | null>(null);
  protected readonly excluindo = signal<Aluno | null>(null);
  protected readonly historicoAluno = signal<Aluno | null>(null);
  protected readonly excluirTudoAberto = signal(false);
  protected readonly confirmacaoTudo = computed(() => this.dados.confirmacao('alunos'));

  readonly filtrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const turma = this.turmaFiltro();
    let lista = this.alunos.alunos();
    if (turma) lista = lista.filter((a) => a.turmaId === turma);
    if (!termo) return lista;
    return lista.filter((a) =>
      [a.nome, a.email, a.matricula].some((campo) => campo.toLowerCase().includes(termo)),
    );
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected turmaNome(turmaId: string): string {
    if (!turmaId) return '';
    return this.turmas.porId(turmaId)?.nome ?? '';
  }

  protected abrirHistorico(aluno: Aluno): void {
    this.historicoAluno.set(aluno);
  }

  protected fecharHistorico(): void {
    this.historicoAluno.set(null);
  }

  protected labelStatus(status: Matricula['status']): string {
    return labelStatusMatricula(status);
  }

  protected dataMatricula(data: string | null): string {
    return formatarDataMatricula(data);
  }

  protected matriculasDoAluno(alunoId: string): Matricula[] {
    return this.matriculas.matriculasDoAluno(alunoId);
  }

  protected abrirNovo(): void {
    this.editando.set(null);
    this.modalAberto.set(true);
  }

  protected abrirEdicao(aluno: Aluno): void {
    this.editando.set(aluno);
    this.modalAberto.set(true);
  }

  protected onSalvo(): void {
    this.modalAberto.set(false);
  }

  protected fechar(): void {
    this.modalAberto.set(false);
  }

  protected abrirImportacao(): void {
    this.importAberto.set(true);
  }

  protected onImportado(resumo: ResumoImport): void {
    this.importAberto.set(false);
    const extra = resumo.turmasCriadas > 0 ? ` (${resumo.turmasCriadas} turma(s) criada(s))` : '';
    this.toast.mostrar(`${resumo.criados} aluno(s) importado(s) com sucesso!${extra}`);
  }

  protected pedirExclusao(aluno: Aluno): void {
    this.excluindo.set(aluno);
  }

  protected cancelarExclusao(): void {
    this.excluindo.set(null);
  }

  protected async confirmarExclusao(): Promise<void> {
    const aluno = this.excluindo();
    if (!aluno) return;
    await this.alunos.remove(aluno.id);
    this.toast.mostrar('Aluno excluído.', 'info');
    this.excluindo.set(null);
  }

  protected abrirExclusaoTodos(): void {
    this.excluirTudoAberto.set(true);
  }

  protected fecharExclusaoTodos(): void {
    this.excluirTudoAberto.set(false);
  }

  protected async excluirTodos(): Promise<void> {
    await this.dados.excluir('alunos');
    this.toast.mostrar('Todos os alunos foram excluídos.', 'info');
    this.excluirTudoAberto.set(false);
  }
}
