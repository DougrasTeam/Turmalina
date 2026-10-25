import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { AlunoFormComponent } from '../../aluno/aluno-form/aluno-form.component';
import { AlunoImportComponent, ResumoImport } from '../../aluno/aluno-import/aluno-import.component';
import { TurmaFormComponent } from '../turma-form/turma-form.component';
import { TurmaHorariosComponent } from '../turma-horarios/turma-horarios.component';
import { FeedPublicacoesComponent } from '../../mural/feed-publicacoes/feed-publicacoes.component';
import { PublicacaoFormComponent } from '../../mural/publicacao-form/publicacao-form.component';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { ContextoProfessorService } from '../../../core/services/contexto-professor.service';
import { DisciplinasService } from '../../../core/services/disciplinas.service';
import { MatriculasService } from '../../../core/services/matriculas.service';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';
import { ProfessoresService } from '../../../core/services/professores.service';
import { PublicacoesService } from '../../../core/services/publicacoes.service';
import { ToastService } from '../../../core/services/toast.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { VinculosDocentesService } from '../../../core/services/vinculos-docentes.service';
import { Aluno, Professor, labelTurno } from '../../../core/models';
import { Disciplina } from '../../../core/models/disciplina.model';
import { Publicacao } from '../../../core/models/publicacao.model';
import { VinculoDocente } from '../../../core/models/vinculo-docente.model';

@Component({
  selector: 'app-turma-detalhe',
  imports: [
    RouterLink,
    ModalComponent,
    TurmaFormComponent,
    TurmaHorariosComponent,
    AlunoFormComponent,
    AlunoImportComponent,
    FeedPublicacoesComponent,
    PublicacaoFormComponent,
  ],
  templateUrl: './turma-detalhe.component.html',
  styleUrl: './turma-detalhe.component.scss',
})
export class TurmaDetalheComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly turmas = inject(TurmasService);
  protected readonly professores = inject(ProfessoresService);
  protected readonly disciplinas = inject(DisciplinasService);
  protected readonly vinculos = inject(VinculosDocentesService);
  protected readonly alunos = inject(AlunosService);
  private readonly matriculas = inject(MatriculasService);
  private readonly periodos = inject(PeriodosLetivosService);
  protected readonly publicacoes = inject(PublicacoesService);
  protected readonly auth = inject(AuthService);
  protected readonly contexto = inject(ContextoProfessorService);
  private readonly toast = inject(ToastService);

  protected readonly turmaId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  protected readonly turma = computed(() => this.turmas.porId(this.turmaId()));

  readonly professoresDaTurma = computed<Professor[]>(() => {
    const turma = this.turma();
    if (!turma) return [];
    const vinculosAtivos = this.vinculos
      .porTurma(turma.id)
      .filter((vinculo) => vinculo.ativo);
    const professorIds = new Set([
      ...turma.professorIds,
      ...vinculosAtivos.map((vinculo) => vinculo.professorId),
    ]);
    return [...professorIds]
      .map((professorId) => this.professores.porId(professorId))
      .filter((professor): professor is Professor => Boolean(professor?.ativo));
  });

  readonly alunosDaTurma = computed(() => this.alunos.porTurma(this.turmaId()));

  readonly disciplinasDaTurma = computed<Disciplina[]>(() => {
    const t = this.turma();
    if (!t) return [];
    return this.disciplinas.porIds(t.disciplinaIds);
  });

  protected readonly nomesDisciplinas = computed<Record<string, string>>(() => {
    const mapa: Record<string, string> = {};
    for (const disciplina of this.disciplinas.disciplinas()) {
      mapa[disciplina.id] = disciplina.nome;
    }
    return mapa;
  });

  readonly vinculosDaTurma = computed<VinculoDocente[]>(() => this.vinculos.porTurma(this.turmaId()));

  protected readonly publicacoesDaTurma = computed<Publicacao[]>(() =>
    this.publicacoes
      .ordenadas()
      .filter(
        (publicacao) =>
          publicacao.turmaId === this.turmaId() && !publicacao.disciplinaId,
      ),
  );

  protected readonly autorIdAtual = computed(() => this.auth.usuario()?.id ?? null);
  protected readonly gerenciarTudo = computed(() => this.auth.papel() === 'administrador');
  protected readonly somenteLeitura = computed(() => !this.auth.temPapel('administrador'));
  protected readonly ehProfessor = computed(() => this.auth.papel() === 'professor');

  /** Disciplinas em que o professor atual possui vínculo ativo nesta turma. */
  protected readonly disciplinasAcessiveis = computed<Disciplina[]>(() => {
    if (this.gerenciarTudo()) {
      return [];
    }
    return this.contexto.disciplinasDoProfessorNaTurma(this.turmaId());
  });

  /** O professor sem nenhum vínculo na turma enxerga apenas a visão geral. */
  protected readonly semVinculoNaTurma = computed(
    () => this.ehProfessor() && !this.contexto.possuiAlgumVinculoNaTurma(this.turmaId()),
  );

  protected readonly nomesTurmas = computed<Record<string, string>>(() => {
    const turma = this.turma();
    return turma ? { [turma.id]: turma.nome } : {};
  });

  protected readonly publicacaoFormAberto = signal(false);
  protected readonly publicacaoEditando = signal<Publicacao | null>(null);
  protected readonly publicacaoExcluindo = signal<Publicacao | null>(null);

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
    if (!t || this.somenteLeitura()) return [];
    return this.professores.professores().filter((p) => !t.professorIds.includes(p.id));
  });

  protected readonly pickerDisciplinasAberto = signal(false);
  protected readonly selecaoDisciplinas = signal<string[]>([]);

  protected readonly vinculoAberto = signal(false);
  protected readonly novoVinculoProfessor = signal('');
  protected readonly novoVinculoDisciplina = signal('');

  protected readonly pickerAlunoAberto = signal(false);
  protected readonly selecaoAlunos = signal<string[]>([]);
  protected readonly buscaPickerAlunos = signal('');
  readonly alunosDisponiveis = computed<Aluno[]>(() => {
    const id = this.turmaId();
    if (this.somenteLeitura()) return [];
    return this.alunos.alunos().filter((a) => a.turmaId !== id);
  });
  readonly alunosPickerFiltrados = computed(() => {
    const termo = this.buscaPickerAlunos().trim().toLowerCase();
    const lista = this.alunosDisponiveis();
    if (!termo) return lista;
    return lista.filter((a) => [a.nome, a.email, a.matricula].some((c) => c.toLowerCase().includes(termo)));
  });

  protected readonly todosProfessoresSelecionados = computed(() => {
    const lista = this.professoresDisponiveis();
    return lista.length > 0 && lista.every((prof) => this.selecaoProfessores().includes(prof.id));
  });

  protected readonly todasDisciplinasSelecionadas = computed(() => {
    const lista = this.disciplinas.disciplinas();
    return lista.length > 0 && lista.every((disciplina) => this.selecaoDisciplinas().includes(disciplina.id));
  });

  protected readonly todosAlunosSelecionados = computed(() => {
    const lista = this.alunosPickerFiltrados();
    return lista.length > 0 && lista.every((aluno) => this.selecaoAlunos().includes(aluno.id));
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected marcado(evento: Event): boolean {
    return (evento.target as HTMLInputElement).checked;
  }

  protected alternarTodosProfessores(evento: Event): void {
    this.selecaoProfessores.set(
      this.marcado(evento) ? this.professoresDisponiveis().map((prof) => prof.id) : [],
    );
  }

  protected alternarTodasDisciplinas(evento: Event): void {
    this.selecaoDisciplinas.set(
      this.marcado(evento) ? this.disciplinas.disciplinas().map((disciplina) => disciplina.id) : [],
    );
  }

  protected alternarTodosAlunos(evento: Event): void {
    if (this.marcado(evento)) {
      const ids = this.alunosPickerFiltrados().map((aluno) => aluno.id);
      this.selecaoAlunos.update((atual) => Array.from(new Set([...atual, ...ids])));
    } else {
      const ids = new Set(this.alunosPickerFiltrados().map((aluno) => aluno.id));
      this.selecaoAlunos.update((atual) => atual.filter((id) => !ids.has(id)));
    }
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
      try {
        await this.matriculas.matricular(id, t.id, this.periodos.ativo()?.id);
      } catch {
        // Ignora bloqueio de matrícula duplicada
      }
    }
    this.toast.mostrar(`${selecionados.length} aluno(s) adicionado(s) à turma.`);
    this.pickerAlunoAberto.set(false);
  }

  protected async removerAluno(aluno: Aluno): Promise<void> {
    await this.alunos.update(aluno.id, { turmaId: '' });
    try {
      await this.matriculas.desmatricular(aluno.id, 'Removido da turma');
    } catch {
      // Histórico preservado
    }
    this.toast.mostrar(`${aluno.nome} removido(a) da turma.`, 'info');
  }

  protected abrirPickerDisciplinas(): void {
    const t = this.turma();
    this.selecaoDisciplinas.set(t ? [...(t.disciplinaIds ?? [])] : []);
    this.pickerDisciplinasAberto.set(true);
  }

  protected toggleDisciplinaSelecao(id: string): void {
    this.selecaoDisciplinas.update((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );
  }

  protected async confirmarDisciplinas(): Promise<void> {
    const t = this.turma();
    if (!t) return;
    await this.turmas.update(t.id, { disciplinaIds: this.selecaoDisciplinas() });
    this.toast.mostrar('Disciplinas da turma atualizadas.');
    this.pickerDisciplinasAberto.set(false);
  }

  protected abrirVinculo(): void {
    this.novoVinculoProfessor.set('');
    this.novoVinculoDisciplina.set('');
    this.vinculoAberto.set(true);
  }

  protected nomeProfessor(id: string): string {
    return this.professores.porId(id)?.nome ?? '—';
  }

  protected nomeDisciplina(id: string): string {
    return this.disciplinas.porId(id)?.nome ?? '—';
  }

  protected async confirmarVinculo(): Promise<void> {
    const t = this.turma();
    if (!t) return;
    try {
      await this.vinculos.criar({
        turmaId: t.id,
        professorId: this.novoVinculoProfessor(),
        disciplinaId: this.novoVinculoDisciplina(),
      });
      this.toast.mostrar('Vínculo docente adicionado.');
      this.vinculoAberto.set(false);
    } catch (erro) {
      this.toast.mostrar(
        erro instanceof Error ? erro.message : 'Não foi possível adicionar o vínculo.',
        'warning',
      );
    }
  }

  protected async removerVinculo(id: string): Promise<void> {
    await this.vinculos.remover(id);
    this.toast.mostrar('Vínculo removido.', 'info');
  }

  protected onImportado(resumo: ResumoImport): void {
    this.importAberto.set(false);
    const extra = resumo.turmasCriadas > 0 ? ` (${resumo.turmasCriadas} turma(s) criada(s))` : '';
    this.toast.mostrar(`${resumo.criados} aluno(s) importado(s)!${extra}`);
  }

  protected abrirNovaPublicacao(): void {
    this.publicacaoEditando.set(null);
    this.publicacaoFormAberto.set(true);
  }

  protected abrirEdicaoPublicacao(publicacao: Publicacao): void {
    this.publicacaoEditando.set(publicacao);
    this.publicacaoFormAberto.set(true);
  }

  protected fecharFormPublicacao(): void {
    this.publicacaoFormAberto.set(false);
  }

  protected onPublicacaoSalva(): void {
    this.publicacaoFormAberto.set(false);
  }

  protected async arquivarPublicacao(publicacao: Publicacao): Promise<void> {
    await this.publicacoes.arquivar(publicacao.id);
    this.toast.mostrar('Publicação arquivada.', 'info');
  }

  protected async restaurarPublicacao(publicacao: Publicacao): Promise<void> {
    await this.publicacoes.restaurar(publicacao.id);
    this.toast.mostrar('Publicação republicada.', 'info');
  }

  protected pedirExclusaoPublicacao(publicacao: Publicacao): void {
    this.publicacaoExcluindo.set(publicacao);
  }

  protected cancelarExclusaoPublicacao(): void {
    this.publicacaoExcluindo.set(null);
  }

  protected async confirmarExclusaoPublicacao(): Promise<void> {
    const publicacao = this.publicacaoExcluindo();
    if (!publicacao) return;
    await this.publicacoes.remover(publicacao.id);
    this.toast.mostrar('Publicação excluída.', 'info');
    this.publicacaoExcluindo.set(null);
  }
}
