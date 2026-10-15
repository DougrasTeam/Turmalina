import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { AlunoFormComponent } from '../../aluno/aluno-form/aluno-form.component';
import { AlunoImportComponent, ResumoImport } from '../../aluno/aluno-import/aluno-import.component';
import { TurmaFormComponent } from '../turma-form/turma-form.component';
import { AlunosService } from '../../../core/services/alunos.service';
import { ProfessoresService } from '../../../core/services/professores.service';
import { ToastService } from '../../../core/services/toast.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { Aluno, Professor, labelTurno } from '../../../core/models';

@Component({
  selector: 'app-turma-detalhe',
  imports: [RouterLink, ModalComponent, TurmaFormComponent, AlunoFormComponent, AlunoImportComponent],
  templateUrl: './turma-detalhe.component.html',
  styleUrl: './turma-detalhe.component.scss',
})
export class TurmaDetalheComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly turmas = inject(TurmasService);
  protected readonly professores = inject(ProfessoresService);
  protected readonly alunos = inject(AlunosService);
  private readonly toast = inject(ToastService);

  protected readonly turmaId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  protected readonly turma = computed(() => this.turmas.porId(this.turmaId()));

  readonly professoresDaTurma = computed<Professor[]>(() => {
    const t = this.turma();
    if (!t) return [];
    return t.professorIds
      .map((id) => this.professores.porId(id))
      .filter((p): p is Professor => Boolean(p));
  });

  readonly alunosDaTurma = computed(() => this.alunos.porTurma(this.turmaId()));

  protected readonly buscaAlunos = signal('');
  readonly alunosFiltrados = computed(() => {
    const termo = this.buscaAlunos().trim().toLowerCase();
    const lista = this.alunosDaTurma();
    if (!termo) return lista;
    return lista.filter((a) =>
      [a.nome, a.email, a.matricula].some((campo) => campo.toLowerCase().includes(termo)),
    );
  });

  protected readonly turmaFormAberto = signal(false);
  protected readonly alunoFormAberto = signal(false);
  protected readonly importAberto = signal(false);

  protected readonly pickerProfessorAberto = signal(false);
  protected readonly selecaoProfessores = signal<string[]>([]);
  readonly professoresDisponiveis = computed<Professor[]>(() => {
    const t = this.turma();
    if (!t) return [];
    return this.professores.professores().filter((p) => !t.professorIds.includes(p.id));
  });

  protected readonly pickerAlunoAberto = signal(false);
  protected readonly selecaoAlunos = signal<string[]>([]);
  protected readonly buscaPickerAlunos = signal('');
  readonly alunosDisponiveis = computed<Aluno[]>(() => {
    const id = this.turmaId();
    return this.alunos.alunos().filter((a) => a.turmaId !== id);
  });
  readonly alunosPickerFiltrados = computed(() => {
    const termo = this.buscaPickerAlunos().trim().toLowerCase();
    const lista = this.alunosDisponiveis();
    if (!termo) return lista;
    return lista.filter((a) => [a.nome, a.email, a.matricula].some((c) => c.toLowerCase().includes(termo)));
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected turnoLabel(turno: Parameters<typeof labelTurno>[0]): string {
    return labelTurno(turno);
  }

  protected nomeTurmaDe(aluno: Aluno): string {
    if (!aluno.turmaId) return '';
    return this.turmas.porId(aluno.turmaId)?.nome ?? '';
  }

  protected abrirNovoAluno(): void {
    this.alunoFormAberto.set(true);
  }

  protected abrirPickerProfessores(): void {
    this.selecaoProfessores.set([]);
    this.pickerProfessorAberto.set(true);
  }

  protected toggleProfSelecao(id: string): void {
    this.selecaoProfessores.update((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );
  }

  protected async confirmarProfessores(): Promise<void> {
    const t = this.turma();
    const selecionados = this.selecaoProfessores();
    if (!t || selecionados.length === 0) return;
    await this.turmas.update(t.id, { professorIds: [...t.professorIds, ...selecionados] });
    this.toast.mostrar(`${selecionados.length} professor(es) adicionado(s).`);
    this.pickerProfessorAberto.set(false);
  }

  protected async removerProfessor(id: string): Promise<void> {
    const t = this.turma();
    if (!t) return;
    await this.turmas.update(t.id, { professorIds: t.professorIds.filter((p) => p !== id) });
    this.toast.mostrar('Professor removido da turma.', 'info');
  }

  protected abrirPickerAlunos(): void {
    this.selecaoAlunos.set([]);
    this.buscaPickerAlunos.set('');
    this.pickerAlunoAberto.set(true);
  }

  protected toggleAlunoSelecao(id: string): void {
    this.selecaoAlunos.update((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );
  }

  protected async confirmarAlunos(): Promise<void> {
    const t = this.turma();
    const selecionados = this.selecaoAlunos();
    if (!t || selecionados.length === 0) return;
    for (const id of selecionados) {
      await this.alunos.update(id, { turmaId: t.id });
    }
    this.toast.mostrar(`${selecionados.length} aluno(s) adicionado(s) à turma.`);
    this.pickerAlunoAberto.set(false);
  }

  protected async removerAluno(aluno: Aluno): Promise<void> {
    await this.alunos.update(aluno.id, { turmaId: '' });
    this.toast.mostrar(`${aluno.nome} removido(a) da turma.`, 'info');
  }

  protected onImportado(resumo: ResumoImport): void {
    this.importAberto.set(false);
    const extra = resumo.turmasCriadas > 0 ? ` (${resumo.turmasCriadas} turma(s) criada(s))` : '';
    this.toast.mostrar(`${resumo.criados} aluno(s) importado(s)!${extra}`);
  }
}
