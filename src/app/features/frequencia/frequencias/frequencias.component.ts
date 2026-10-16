import { Component, computed, inject, signal } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { ConfirmarTextoComponent } from '../../../shared/confirmar-texto/confirmar-texto.component';
import { AlunosService } from '../../../core/services/alunos.service';
import { DadosService } from '../../../core/services/dados.service';
import { DisciplinasService } from '../../../core/services/disciplinas.service';
import { FrequenciasService } from '../../../core/services/frequencias.service';
import { InstituicaoService } from '../../../core/services/instituicao.service';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';
import { ToastService } from '../../../core/services/toast.service';
import { TurmasService } from '../../../core/services/turmas.service';
import {
  STATUS_PRESENCA,
  StatusPresenca,
  ResumoFrequencia,
  Frequencia,
  RegistroPresenca,
  calcularResumoFrequencia,
  dataHoje,
  formatarDataFrequencia,
  formatarPercentual,
} from '../../../core/models/frequencia.model';

interface FormChamada {
  turmaId: string;
  data: string;
  disciplinaId: string;
  observacao: string;
}

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : 'Não foi possível salvar a chamada.';
}

@Component({
  selector: 'app-frequencias',
  imports: [ModalComponent, ConfirmarTextoComponent],
  templateUrl: './frequencias.component.html',
  styleUrl: './frequencias.component.scss',
})
export class FrequenciasComponent {
  protected readonly frequencias = inject(FrequenciasService);
  protected readonly turmas = inject(TurmasService);
  protected readonly alunos = inject(AlunosService);
  protected readonly disciplinas = inject(DisciplinasService);
  protected readonly periodos = inject(PeriodosLetivosService);
  protected readonly instituicao = inject(InstituicaoService);
  private readonly dados = inject(DadosService);
  private readonly toast = inject(ToastService);

  protected readonly statusOpcoes = STATUS_PRESENCA;

  protected readonly turmaFiltro = signal('');
  protected readonly chamadaAberta = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly excluindo = signal<Frequencia | null>(null);
  protected readonly excluirTudoAberto = signal(false);

  protected readonly form = signal<FormChamada>(this.formVazio());
  protected readonly registros = signal<RegistroPresenca[]>([]);

  readonly filtradas = computed(() => {
    const turmaFiltro = this.turmaFiltro();
    const lista = this.frequencias.frequencias();
    return turmaFiltro ? lista.filter((frequencia) => frequencia.turmaId === turmaFiltro) : lista;
  });

  protected readonly alunosDoFormulario = computed(() =>
    [...this.alunos.porTurma(this.form().turmaId)].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  );

  protected readonly disciplinasDaTurma = computed(() => {
    const turma = this.turmas.porId(this.form().turmaId);
    return this.disciplinas.porIds(turma?.disciplinaIds ?? []);
  });

  protected readonly resumoFormulario = computed(() =>
    this.calcularResumo(this.registros()),
  );

  protected readonly alunosDoFiltro = computed(() =>
    this.turmaFiltro()
      ? [...this.alunos.porTurma(this.turmaFiltro())].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      : [],
  );

  protected readonly resumoFiltro = computed(() =>
    this.turmaFiltro() ? this.frequencias.resumoTurma(this.turmaFiltro()) : null,
  );

  protected readonly confirmacaoTudo = computed(() => this.dados.confirmacao('frequencias'));

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected turmaNome(turmaId: string): string {
    return this.turmas.porId(turmaId)?.nome ?? '—';
  }

  protected disciplinaNome(disciplinaId: string | null): string {
    if (!disciplinaId) return 'Geral (aula)';
    return this.disciplinas.porId(disciplinaId)?.nome ?? '—';
  }

  protected dataFormatada(iso: string | null): string {
    return formatarDataFrequencia(iso);
  }

  protected percentual(resumo: ResumoFrequencia): string {
    return formatarPercentual(resumo.percentual);
  }

  protected resumoDoAluno(alunoId: string): ResumoFrequencia {
    return this.frequencias.resumoAluno(alunoId);
  }

  protected resumoDaChamada(id: string): ResumoFrequencia {
    const frequencia = this.frequencias.porId(id);
    return this.calcularResumo(frequencia?.registros ?? []);
  }

  protected abaixoDoLimite(resumo: ResumoFrequencia): boolean {
    return this.frequencias.abaixoDoLimite(resumo.percentual);
  }

  protected classePercentual(resumo: ResumoFrequencia): string {
    if (resumo.percentual === null) return 'badge-neutral';
    return this.abaixoDoLimite(resumo) ? 'badge-danger' : 'badge-success';
  }

  protected statusDe(alunoId: string): StatusPresenca {
    return this.registros().find((registro) => registro.alunoId === alunoId)?.status ?? 'presente';
  }

  protected classeBotao(status: StatusPresenca, alunoId: string): string {
    if (this.statusDe(alunoId) !== status) return 'btn-light';
    if (status === 'presente') return 'btn-success';
    if (status === 'falta') return 'btn-danger';
    return 'btn-warning';
  }

  protected abrirNova(): void {
    this.editandoId.set(null);
    const turmaId = this.turmaFiltro() || this.turmas.turmas()[0]?.id || '';
    this.form.set({ turmaId, data: dataHoje(), disciplinaId: '', observacao: '' });
    this.carregarRegistros(turmaId, '', dataHoje());
    this.chamadaAberta.set(true);
  }

  protected abrirEdicao(frequencia: Frequencia): void {
    this.editandoId.set(frequencia.id);
    this.form.set({
      turmaId: frequencia.turmaId,
      data: frequencia.data,
      disciplinaId: frequencia.disciplinaId ?? '',
      observacao: frequencia.observacao ?? '',
    });
    this.registros.set(this.mesclarComAlunos(frequencia.registros, frequencia.turmaId));
    this.chamadaAberta.set(true);
  }

  protected selecionarTurma(evento: Event): void {
    const turmaId = this.valor(evento);
    this.form.update((atual) => ({ ...atual, turmaId }));
    this.carregarRegistros(turmaId, this.form().disciplinaId, this.form().data);
  }

  protected selecionarData(evento: Event): void {
    const data = this.valor(evento);
    this.form.update((atual) => ({ ...atual, data }));
    this.carregarRegistros(this.form().turmaId, this.form().disciplinaId, data);
  }

  protected selecionarDisciplina(evento: Event): void {
    const disciplinaId = this.valor(evento);
    this.form.update((atual) => ({ ...atual, disciplinaId }));
    this.carregarRegistros(this.form().turmaId, disciplinaId, this.form().data);
  }

  protected definirObservacao(evento: Event): void {
    const observacao = this.valor(evento);
    this.form.update((atual) => ({ ...atual, observacao }));
  }

  protected marcarTodos(status: StatusPresenca): void {
    this.registros.update((lista) => lista.map((registro) => ({ ...registro, status })));
  }

  protected definirStatus(alunoId: string, status: StatusPresenca): void {
    this.registros.update((lista) =>
      lista.map((registro) => (registro.alunoId === alunoId ? { ...registro, status } : registro)),
    );
  }

  protected fechar(): void {
    this.chamadaAberta.set(false);
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    try {
      await this.frequencias.salvar({
        turmaId: this.form().turmaId,
        periodoLetivoId: this.periodos.ativo()?.id ?? '',
        disciplinaId: this.form().disciplinaId || null,
        data: this.form().data,
        registros: this.registros(),
        observacao: this.form().observacao || null,
      });
      this.toast.mostrar('Chamada salva com sucesso!');
      this.fechar();
    } catch (erro) {
      this.toast.mostrar(mensagemErro(erro), 'warning');
    }
  }

  protected pedirExclusao(frequencia: Frequencia): void {
    this.excluindo.set(frequencia);
  }

  protected cancelarExclusao(): void {
    this.excluindo.set(null);
  }

  protected async confirmarExclusao(): Promise<void> {
    const frequencia = this.excluindo();
    if (!frequencia) return;
    await this.frequencias.remover(frequencia.id);
    this.toast.mostrar('Chamada excluída.', 'info');
    this.excluindo.set(null);
  }

  protected abrirExclusaoTodas(): void {
    this.excluirTudoAberto.set(true);
  }

  protected fecharExclusaoTodas(): void {
    this.excluirTudoAberto.set(false);
  }

  protected async excluirTodas(): Promise<void> {
    await this.dados.excluir('frequencias');
    this.toast.mostrar('Todas as chamadas foram excluídas.', 'info');
    this.excluirTudoAberto.set(false);
  }

  private carregarRegistros(turmaId: string, disciplinaId: string, data: string): void {
    const existente = turmaId && data
      ? this.frequencias.encontrar(turmaId, data, disciplinaId || null)
      : undefined;
    this.registros.set(this.mesclarComAlunos(existente?.registros ?? [], turmaId));
  }

  private mesclarComAlunos(registros: RegistroPresenca[], turmaId: string): RegistroPresenca[] {
    const porAluno = new Map(registros.map((registro) => [registro.alunoId, registro]));
    return this.alunos.porTurma(turmaId).map((aluno) => {
      const existente = porAluno.get(aluno.id);
      return existente ? { ...existente } : { alunoId: aluno.id, status: 'presente' as StatusPresenca, justificativa: null };
    });
  }

  private calcularResumo(registros: readonly RegistroPresenca[]): ResumoFrequencia {
    return calcularResumoFrequencia(registros, this.instituicao.faltaJustificadaAbona());
  }

  private formVazio(): FormChamada {
    return { turmaId: '', data: dataHoje(), disciplinaId: '', observacao: '' };
  }
}
