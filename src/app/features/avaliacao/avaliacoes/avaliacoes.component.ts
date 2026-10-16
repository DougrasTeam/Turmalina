import { Component, computed, inject, signal } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { ConfirmarTextoComponent } from '../../../shared/confirmar-texto/confirmar-texto.component';
import { AlunosService } from '../../../core/services/alunos.service';
import { AvaliacoesService } from '../../../core/services/avaliacoes.service';
import { DadosService } from '../../../core/services/dados.service';
import { DisciplinasService } from '../../../core/services/disciplinas.service';
import { InstituicaoService } from '../../../core/services/instituicao.service';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';
import { ToastService } from '../../../core/services/toast.service';
import { TurmasService } from '../../../core/services/turmas.service';
import {
  Avaliacao,
  RegistroNota,
  ResultadoMedia,
  ResumoNotas,
  STATUS_AVALIACAO,
  StatusAvaliacao,
  classeStatusAvaliacao,
  formatarNota,
  rotuloFormula,
} from '../../../core/models/avaliacao.model';

interface FormAvaliacao {
  nome: string;
  turmaId: string;
  disciplinaId: string;
  periodoLetivoId: string;
  etapaId: string;
  data: string;
  notaMaxima: number;
  peso: number;
  status: StatusAvaliacao;
  descricao: string;
}

interface NotaForm {
  alunoId: string;
  nome: string;
  texto: string;
}

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : 'Não foi possível salvar.';
}

function parseNota(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.');
  if (limpo === '') return null;
  const numero = Number(limpo);
  return Number.isNaN(numero) ? Number.NaN : numero;
}

@Component({
  selector: 'app-avaliacoes',
  imports: [ModalComponent, ConfirmarTextoComponent],
  templateUrl: './avaliacoes.component.html',
  styleUrl: './avaliacoes.component.scss',
})
export class AvaliacoesComponent {
  protected readonly avaliacoes = inject(AvaliacoesService);
  protected readonly turmas = inject(TurmasService);
  protected readonly alunos = inject(AlunosService);
  protected readonly disciplinas = inject(DisciplinasService);
  protected readonly periodos = inject(PeriodosLetivosService);
  protected readonly instituicao = inject(InstituicaoService);
  private readonly dados = inject(DadosService);
  private readonly toast = inject(ToastService);

  protected readonly statusOpcoes = STATUS_AVALIACAO;

  protected readonly filtroTurma = signal('');
  protected readonly filtroPeriodo = signal('');

  protected readonly formAberta = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly form = signal<FormAvaliacao>(this.formVazio());
  protected readonly erroForm = signal('');

  protected readonly lancamentoAberto = signal(false);
  protected readonly avaliacaoLancando = signal<Avaliacao | null>(null);
  protected readonly notasForm = signal<NotaForm[]>([]);

  protected readonly excluindo = signal<Avaliacao | null>(null);
  protected readonly excluirTudoAberto = signal(false);

  protected readonly filtradas = computed(() => {
    const turmaId = this.filtroTurma();
    const periodoId = this.filtroPeriodo();
    return this.avaliacoes
      .avaliacoes()
      .filter((avaliacao) => !turmaId || avaliacao.turmaId === turmaId)
      .filter((avaliacao) => !periodoId || avaliacao.periodoLetivoId === periodoId);
  });

  protected readonly disciplinasDaTurma = computed(() => {
    const turma = this.turmas.porId(this.form().turmaId);
    return this.disciplinas.porIds(turma?.disciplinaIds ?? []);
  });

  protected readonly etapasDoPeriodo = computed(
    () => this.periodos.porId(this.form().periodoLetivoId)?.etapas ?? [],
  );

  protected readonly alunosDoLancamento = computed(() =>
    [...this.alunos.porTurma(this.avaliacaoLancando()?.turmaId ?? '')].sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR'),
    ),
  );

  protected readonly alunosDoResumo = computed(() =>
    this.filtroTurma()
      ? [...this.alunos.porTurma(this.filtroTurma())].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      : [],
  );

  protected readonly confirmacaoTudo = computed(() => this.dados.confirmacao('avaliacoes'));

  protected readonly lancadasNoFormulario = computed(
    () => this.notasForm().filter((nota) => parseNota(nota.texto) !== null).length,
  );

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected patch(campo: 'nome' | 'descricao' | 'data', texto: string): void {
    this.form.update((atual) => ({ ...atual, [campo]: texto }));
  }

  protected patchNumero(campo: 'notaMaxima' | 'peso', valorTexto: string): void {
    const numero = Number(valorTexto);
    this.form.update((atual) => ({ ...atual, [campo]: Number.isNaN(numero) ? 0 : numero }));
  }

  protected selecionarTurma(evento: Event): void {
    const turmaId = this.valor(evento);
    const primeiraDisciplina = this.disciplinas.porIds(this.turmas.porId(turmaId)?.disciplinaIds ?? [])[0]?.id ?? '';
    this.form.update((atual) => ({ ...atual, turmaId, disciplinaId: primeiraDisciplina }));
  }

  protected patchCampo(campo: 'disciplinaId' | 'periodoLetivoId' | 'etapaId', texto: string): void {
    this.form.update((atual) => ({ ...atual, [campo]: texto }));
  }

  protected setStatus(evento: Event): void {
    this.form.update((atual) => ({ ...atual, status: this.valor(evento) as StatusAvaliacao }));
  }

  protected abrirNova(): void {
    this.editandoId.set(null);
    this.erroForm.set('');
    this.form.set(this.formVazio());
    this.formAberta.set(true);
  }

  protected abrirEdicao(avaliacao: Avaliacao): void {
    this.editandoId.set(avaliacao.id);
    this.erroForm.set('');
    this.form.set({
      nome: avaliacao.nome,
      turmaId: avaliacao.turmaId,
      disciplinaId: avaliacao.disciplinaId,
      periodoLetivoId: avaliacao.periodoLetivoId,
      etapaId: avaliacao.etapaId ?? '',
      data: avaliacao.data ?? '',
      notaMaxima: avaliacao.notaMaxima,
      peso: avaliacao.peso,
      status: avaliacao.status,
      descricao: avaliacao.descricao ?? '',
    });
    this.formAberta.set(true);
  }

  protected fecharForm(): void {
    this.formAberta.set(false);
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    this.erroForm.set('');
    try {
      const dados = { ...this.form(), etapaId: this.form().etapaId || null, data: this.form().data || null };
      if (this.editandoId()) {
        await this.avaliacoes.atualizar(this.editandoId()!, dados);
        this.toast.mostrar('Avaliação atualizada com sucesso!');
      } else {
        await this.avaliacoes.criar(dados);
        this.toast.mostrar('Avaliação criada com sucesso!');
      }
      this.fecharForm();
    } catch (erro) {
      this.erroForm.set(mensagemErro(erro));
    }
  }

  protected bloquear(avaliacao: Avaliacao): boolean {
    return this.avaliacoes.periodoBloqueado(avaliacao.periodoLetivoId);
  }

  protected abrirLancamento(avaliacao: Avaliacao): void {
    const existentes = new Map(avaliacao.notas.map((nota) => [nota.alunoId, nota.valor]));
    this.avaliacaoLancando.set(avaliacao);
    this.notasForm.set(
      this.alunosDoLancamento().map((aluno) => ({
        alunoId: aluno.id,
        nome: aluno.nome,
        texto: existentes.has(aluno.id) && existentes.get(aluno.id) !== null
          ? String(existentes.get(aluno.id))
          : '',
      })),
    );
    this.lancamentoAberto.set(true);
  }

  protected fecharLancamento(): void {
    this.lancamentoAberto.set(false);
    this.avaliacaoLancando.set(null);
  }

  protected definirNota(alunoId: string, texto: string): void {
    this.notasForm.update((lista) =>
      lista.map((nota) => (nota.alunoId === alunoId ? { ...nota, texto } : nota)),
    );
  }

  protected limparNotas(): void {
    this.notasForm.update((lista) => lista.map((nota) => ({ ...nota, texto: '' })));
  }

  protected notaInvalida(alunoId: string): boolean {
    const avaliacao = this.avaliacaoLancando();
    const texto = this.notasForm().find((nota) => nota.alunoId === alunoId)?.texto ?? '';
    if (!avaliacao) return false;
    const valor = parseNota(texto);
    return valor !== null && (Number.isNaN(valor) || valor < 0 || valor > avaliacao.notaMaxima);
  }

  protected async salvarNotas(evento: Event): Promise<void> {
    evento.preventDefault();
    const avaliacao = this.avaliacaoLancando();
    if (!avaliacao) return;
    const notas: RegistroNota[] = this.notasForm().map((nota) => ({
      alunoId: nota.alunoId,
      valor: parseNota(nota.texto),
      atualizadoEm: new Date().toISOString(),
    }));
    try {
      await this.avaliacoes.lancarNotas(avaliacao.id, notas);
      this.toast.mostrar('Notas lançadas com sucesso!');
      this.fecharLancamento();
    } catch (erro) {
      this.toast.mostrar(mensagemErro(erro), 'warning');
    }
  }

  protected async arquivar(avaliacao: Avaliacao): Promise<void> {
    await this.avaliacoes.definirStatus(avaliacao.id, 'arquivada');
    this.toast.mostrar('Avaliação arquivada.', 'info');
  }

  protected async publicar(avaliacao: Avaliacao): Promise<void> {
    try {
      await this.avaliacoes.definirStatus(avaliacao.id, 'publicada');
      this.toast.mostrar('Avaliação publicada.', 'info');
    } catch (erro) {
      this.toast.mostrar(mensagemErro(erro), 'warning');
    }
  }

  protected pedirExclusao(avaliacao: Avaliacao): void {
    this.excluindo.set(avaliacao);
  }

  protected cancelarExclusao(): void {
    this.excluindo.set(null);
  }

  protected async confirmarExclusao(): Promise<void> {
    const avaliacao = this.excluindo();
    if (!avaliacao) return;
    await this.avaliacoes.remover(avaliacao.id);
    this.toast.mostrar('Avaliação excluída.', 'info');
    this.excluindo.set(null);
  }

  protected abrirExclusaoTodas(): void {
    this.excluirTudoAberto.set(true);
  }

  protected fecharExclusaoTodas(): void {
    this.excluirTudoAberto.set(false);
  }

  protected async excluirTodas(): Promise<void> {
    await this.dados.excluir('avaliacoes');
    this.toast.mostrar('Todas as avaliações foram excluídas.', 'info');
    this.excluirTudoAberto.set(false);
  }

  protected turmaNome(turmaId: string): string {
    return this.turmas.porId(turmaId)?.nome ?? '—';
  }

  protected disciplinaNome(disciplinaId: string): string {
    return this.disciplinas.porId(disciplinaId)?.nome ?? '—';
  }

  protected periodoNome(periodoLetivoId: string): string {
    return this.periodos.porId(periodoLetivoId)?.nome ?? '—';
  }

  protected etapaNome(etapaId: string | null): string {
    if (!etapaId) return '—';
    const periodo = this.periodos.periodos().find((item) => item.etapas.some((etapa) => etapa.id === etapaId));
    return periodo?.etapas.find((etapa) => etapa.id === etapaId)?.nome ?? '—';
  }

  protected dataFormatada(iso: string | null): string {
    if (!iso) return '—';
    const partes = iso.split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : iso;
  }

  protected statusLabel(status: StatusAvaliacao): string {
    return STATUS_AVALIACAO.find((opcao) => opcao.value === status)?.label ?? status;
  }

  protected statusClasse(status: StatusAvaliacao): string {
    return classeStatusAvaliacao(status);
  }

  protected resumo(avaliacao: Avaliacao): ResumoNotas {
    return this.avaliacoes.resumo(avaliacao);
  }

  protected media(avaliacao: Avaliacao): string {
    return formatarNota(this.avaliacoes.media(avaliacao), this.instituicao.casasDecimaisNota());
  }

  protected resultadoAluno(alunoId: string): ResultadoMedia {
    return this.avaliacoes.resultadoAluno(alunoId, this.filtroTurma(), this.filtroPeriodo() || undefined);
  }

  protected mediaAluno(alunoId: string): string {
    return formatarNota(this.resultadoAluno(alunoId).valor, this.instituicao.casasDecimaisNota());
  }

  protected abaixoDaMedia(alunoId: string): boolean {
    return this.avaliacoes.abaixoDaMedia(this.resultadoAluno(alunoId).valor);
  }

  protected formulaLabel(resultado: ResultadoMedia): string {
    return resultado.lancadas === 0 ? 'Sem notas lançadas' : rotuloFormula(resultado.formula);
  }

  private formVazio(): FormAvaliacao {
    const turmaId = this.turmas.turmas()[0]?.id ?? '';
    const disciplinaId = this.disciplinas.porIds(this.turmas.porId(turmaId)?.disciplinaIds ?? [])[0]?.id ?? '';
    const periodoLetivoId = this.periodos.ativo()?.id ?? this.periodos.periodos()[0]?.id ?? '';
    return {
      nome: '',
      turmaId,
      disciplinaId,
      periodoLetivoId,
      etapaId: '',
      data: '',
      notaMaxima: this.instituicao.notaMaxima(),
      peso: 1,
      status: 'rascunho',
      descricao: '',
    };
  }
}
