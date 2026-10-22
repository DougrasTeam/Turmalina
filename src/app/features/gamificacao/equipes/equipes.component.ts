import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { Aluno, Turma } from '../../../core/models';
import {
  CORES_EQUIPE,
  CRITERIOS_PLACAR,
  CriterioPlacar,
  DadosEquipe,
  EMOJIS_EQUIPE,
  Equipe,
  EquipeMembro,
  LinhaPlacarEquipe,
  resumirNomesMembros,
  rotuloCriterioPlacar,
} from '../../../core/models/equipes.model';
import { formatarDataHoraAuditoria } from '../../../core/models/auditoria.model';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { DisciplinasService } from '../../../core/services/disciplinas.service';
import { EquipesService } from '../../../core/services/equipes.service';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';
import { ToastService } from '../../../core/services/toast.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { ConfirmarTextoComponent } from '../../../shared/confirmar-texto/confirmar-texto.component';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { DisciplinaContextoBarComponent } from '../../../shared/disciplina-contexto-bar/disciplina-contexto-bar.component';

const FORMULARIO_VAZIO: DadosEquipe = {
  nome: '',
  emoji: '🦁',
  cor: '#2563EB',
  ativa: true,
  turmaId: '',
  disciplinaId: null,
  periodoLetivoId: null,
};

@Component({
  selector: 'app-equipes',
  imports: [ModalComponent, ConfirmarTextoComponent, DisciplinaContextoBarComponent],
  templateUrl: './equipes.component.html',
  styleUrl: './equipes.component.scss',
})
export class EquipesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly routePai = this.route.parent;
  protected readonly equipes = inject(EquipesService);
  protected readonly alunos = inject(AlunosService);
  protected readonly periodos = inject(PeriodosLetivosService);
  protected readonly turmas = inject(TurmasService);
  protected readonly disciplinas = inject(DisciplinasService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly turmaIdQuery = toSignal(
    (this.routePai?.paramMap ?? this.route.queryParamMap).pipe(
      map((params) => params.get('id') ?? params.get('turmaId') ?? ''),
    ),
    {
      initialValue:
        this.routePai?.snapshot.paramMap.get('id') ??
        this.route.snapshot.queryParamMap.get('turmaId') ??
        '',
    },
  );
  protected readonly disciplinaIdQuery = toSignal(
    (this.routePai?.paramMap ?? this.route.queryParamMap).pipe(
      map((params) => params.get('disciplinaId') ?? ''),
    ),
    {
      initialValue:
        this.routePai?.snapshot.paramMap.get('disciplinaId') ??
        this.route.snapshot.queryParamMap.get('disciplinaId') ??
        '',
    },
  );

  protected readonly cores = CORES_EQUIPE;
  protected readonly opcoesCriterio = CRITERIOS_PLACAR.map((criterio) => ({
    valor: criterio,
    rotulo: rotuloCriterioPlacar(criterio),
  }));

  protected readonly turmaId = signal('');
  protected readonly criterio = signal<CriterioPlacar>('xp_acumulado');

  protected readonly formulario = signal<DadosEquipe>({ ...FORMULARIO_VAZIO });

  /** Inclui no seletor um emoji já salvo que não esteja na lista padrão. */
  protected readonly emojis = computed(() => {
    const emojiAtual = this.formulario().emoji;
    if (emojiAtual && !EMOJIS_EQUIPE.includes(emojiAtual)) {
      return [emojiAtual, ...EMOJIS_EQUIPE];
    }
    return EMOJIS_EQUIPE;
  });
  protected readonly editando = signal<Equipe | null>(null);
  protected readonly modalAberto = signal(false);
  protected readonly erros = signal<string[]>([]);

  protected readonly equipeSelecionada = signal<Equipe | null>(null);
  protected readonly alunoSelecionado = signal('');
  protected readonly associando = signal(false);

  protected readonly exclusaoAberta = signal(false);
  protected readonly equipeEmExclusao = signal<Equipe | null>(null);
  protected readonly excluirTudoAberto = signal(false);
  protected readonly sorteioAberto = signal(false);
  protected readonly sorteando = signal(false);

  protected readonly turmasDisponiveis = computed<Turma[]>(() =>
    [...this.turmas.turmas()].sort((primeira, segunda) =>
      primeira.codigo.localeCompare(segunda.codigo, 'pt-BR'),
    ),
  );

  /**
   * Indica que a turma vem do contexto da rota (turma/disciplina).
   * Nesse caso o professor não pode trocá-la na tela.
   */
  protected readonly turmaFixa = computed(() => this.turmaIdQuery() !== '');

  protected readonly turmaEfetiva = computed(() => {
    const disponiveis = this.turmasDisponiveis();
    const turmaDaRota = this.turmaIdQuery();
    if (turmaDaRota && disponiveis.some((turma) => turma.id === turmaDaRota)) {
      return turmaDaRota;
    }
    const selecionada = this.turmaId();
    if (disponiveis.some((turma) => turma.id === selecionada)) return selecionada;
    return disponiveis[0]?.id ?? '';
  });

  /**
   * O período letivo das equipes é sempre o ativo.
   * Equipes de períodos encerrados não são editadas por esta tela.
   */
  protected readonly periodoEfetivo = computed(() => this.periodos.ativo()?.id ?? '');

  protected readonly placar = computed<LinhaPlacarEquipe[]>(() => {
    const turmaId = this.turmaEfetiva();
    if (!turmaId) return [];
    const periodo = this.periodoEfetivo() || null;
    const disciplinaId = this.disciplinaIdQuery() || null;
    return this.equipes.placar(turmaId, periodo, disciplinaId);
  });

  protected readonly equipesFiltradas = computed<Equipe[]>(() => {
    const turmaId = this.turmaEfetiva();
    if (!turmaId) return [];
    const periodo = this.periodoEfetivo() || null;
    const disciplinaId = this.disciplinaIdQuery() || null;
    return this.equipes.equipesDaTurma(turmaId, periodo, disciplinaId);
  });

  protected readonly equipesAtivasDoContexto = computed<Equipe[]>(() =>
    this.equipesFiltradas().filter((equipe) => equipe.ativa),
  );

  protected readonly alunosDaTurma = computed<Aluno[]>(() => {
    const turmaId = this.turmaEfetiva();
    if (!turmaId) return [];
    return [...this.alunos.porTurma(turmaId)]
      .filter((aluno) => aluno.ativo)
      .sort((primeiro, segundo) => primeiro.nome.localeCompare(segundo.nome, 'pt-BR'));
  });

  /** Alunos que ainda podem entrar em uma equipe no contexto atual. */
  protected readonly alunosElegiveisParaSorteio = computed<Aluno[]>(() => {
    const turmaId = this.turmaEfetiva();
    if (!turmaId) return [];
    const periodoLetivoId = this.periodoEfetivo() || null;
    return this.alunosDaTurma().filter(
      (aluno) =>
        this.equipes.equipeAtivaDoAluno(aluno.id, turmaId, periodoLetivoId) === undefined,
    );
  });

  protected readonly podeSortear = computed(
    () =>
      this.equipesAtivasDoContexto().length > 0 &&
      this.alunosElegiveisParaSorteio().length > 0,
  );

  protected readonly mensagemSorteio = computed(() => {
    const alunos = this.alunosElegiveisParaSorteio().length;
    const equipes = this.equipesAtivasDoContexto().length;
    return `Sortear ${this.rotuloQuantidade(alunos, 'aluno', 'alunos')} entre ${this.rotuloQuantidade(
      equipes,
      'equipe ativa',
      'equipes ativas',
    )}?`;
  });

  protected readonly tituloSorteio = computed(() => {
    if (!this.equipesAtivasDoContexto().length) {
      return 'Crie ao menos uma equipe ativa antes de sortear.';
    }
    const alunos = this.alunosElegiveisParaSorteio().length;
    if (!alunos) return 'Todos os alunos ativos da turma já estão em uma equipe.';
    return `Sortear ${this.rotuloQuantidade(alunos, 'aluno', 'alunos')} entre as equipes ativas.`;
  });

  protected readonly membrosDaEquipe = computed<EquipeMembro[]>(() => {
    const equipe = this.equipeSelecionada();
    if (!equipe) return [];
    return this.integrantesAtivosPorEquipe().get(equipe.id) ?? [];
  });

  /**
   * Integrantes ativos de cada equipe, em ordem alfabética.
   *
   * O placar soma o XP de todos os vínculos (inclusive encerrados), mas a lista
   * de integrantes mostra apenas quem está na equipe hoje — é ela que permite
   * ao professor visualizar e remover alguém do time.
   */
  protected readonly integrantesAtivosPorEquipe = computed<Map<string, EquipeMembro[]>>(() => {
    const integrantesPorEquipe = new Map<string, EquipeMembro[]>();

    for (const membro of this.equipes.membros()) {
      if (!membro.ativa) continue;
      const integrantes = integrantesPorEquipe.get(membro.equipeId) ?? [];
      integrantes.push(membro);
      integrantesPorEquipe.set(membro.equipeId, integrantes);
    }

    for (const integrantes of integrantesPorEquipe.values()) {
      integrantes.sort((primeiro, segundo) =>
        primeiro.alunoNome.localeCompare(segundo.alunoNome, 'pt-BR'),
      );
    }

    return integrantesPorEquipe;
  });

  protected readonly alunosSemEquipe = computed<Aluno[]>(() => {
    const equipe = this.equipeSelecionada();
    if (!equipe) return [];
    return this.alunosDaTurma().filter(
      (aluno) =>
        this.equipes.equipeAtivaDoAluno(aluno.id, equipe.turmaId, equipe.periodoLetivoId) ===
        undefined,
    );
  });

  protected alterarTurma(evento: Event): void {
    this.turmaId.set(this.valorDoCampo(evento));
  }

  protected alterarCriterio(evento: Event): void {
    const criterio = this.valorDoCampo(evento) as CriterioPlacar;
    this.criterio.set(criterio);
    this.equipes.definirCriterioPlacar(criterio);
  }

  protected abrirNovo(): void {
    const turmaId = this.turmaEfetiva();
    if (!turmaId) {
      this.toast.mostrar('Selecione uma turma antes de criar equipes.', 'info');
      return;
    }
    this.editando.set(null);
    this.formulario.set({
      ...FORMULARIO_VAZIO,
      turmaId,
      disciplinaId: this.disciplinaIdQuery() || null,
      periodoLetivoId: this.periodoEfetivo() || null,
    });
    this.erros.set([]);
    this.modalAberto.set(true);
  }

  protected editar(equipe: Equipe): void {
    this.editando.set(equipe);
    this.formulario.set({
      nome: equipe.nome,
      emoji: equipe.emoji,
      cor: equipe.cor,
      ativa: equipe.ativa,
      turmaId: equipe.turmaId,
      disciplinaId: equipe.disciplinaId ?? null,
      periodoLetivoId: equipe.periodoLetivoId,
    });
    this.erros.set([]);
    this.modalAberto.set(true);
  }

  protected fechar(): void {
    this.modalAberto.set(false);
    this.editando.set(null);
  }

  protected alterarNome(evento: Event): void {
    this.atualizar('nome', this.valorDoCampo(evento));
  }

  protected alterarEmoji(evento: Event): void {
    this.atualizar('emoji', this.valorDoCampo(evento));
  }

  protected alterarCor(evento: Event): void {
    this.atualizar('cor', this.valorDoCampo(evento));
  }

  /** Aplica uma cor da paleta sugerida ao formulário. */
  protected selecionarCor(cor: string): void {
    this.atualizar('cor', cor);
  }

  protected alterarAtiva(evento: Event): void {
    this.atualizar('ativa', (evento.target as HTMLInputElement).checked);
  }

  protected async salvar(): Promise<void> {
    const dados = this.formulario();
    const emEdicao = this.editando();
    try {
      if (emEdicao) {
        await this.equipes.atualizarEquipe(emEdicao.id, dados);
        this.toast.mostrar('Equipe atualizada.', 'success');
      } else {
        await this.equipes.criarEquipe(dados);
        this.toast.mostrar('Equipe criada.', 'success');
      }
      this.fechar();
    } catch (erro) {
      this.erros.set(this.mensagem(erro).split('\n'));
    }
  }

  protected async alternar(equipe: Equipe): Promise<void> {
    await this.equipes.alternarAtiva(equipe.id);
    this.toast.mostrar(equipe.ativa ? 'Equipe desativada.' : 'Equipe ativada.', 'info');
  }

  protected abrirMembros(equipe: Equipe): void {
    this.equipeSelecionada.set(equipe);
    this.alunoSelecionado.set('');
  }

  protected fecharMembros(): void {
    this.equipeSelecionada.set(null);
  }

  protected selecionarAluno(evento: Event): void {
    this.alunoSelecionado.set(this.valorDoCampo(evento));
  }

  protected async associar(): Promise<void> {
    const equipe = this.equipeSelecionada();
    const alunoId = this.alunoSelecionado();
    const autor = this.auth.usuario();
    if (!equipe || !alunoId || !autor || this.associando()) return;

    this.associando.set(true);
    try {
      const membro = await this.equipes.associarAluno(equipe.id, alunoId, autor);
      this.toast.mostrar(`${membro.alunoNome} entrou na equipe ${equipe.nome}.`, 'success');
      this.alunoSelecionado.set('');
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    } finally {
      this.associando.set(false);
    }
  }

  protected async desassociar(membro: EquipeMembro): Promise<void> {
    try {
      await this.equipes.desassociarAluno(membro.id);
      this.toast.mostrar(`${membro.alunoNome} saiu da equipe ${membro.equipeNome}.`, 'info');
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    }
  }

  protected pedirExclusao(equipe: Equipe): void {
    this.equipeEmExclusao.set(equipe);
    this.exclusaoAberta.set(true);
  }

  protected cancelarExclusao(): void {
    this.exclusaoAberta.set(false);
    this.equipeEmExclusao.set(null);
  }

  protected async confirmarExclusao(): Promise<void> {
    const equipe = this.equipeEmExclusao();
    if (!equipe) return;
    try {
      await this.equipes.removerEquipe(equipe.id);
      this.toast.mostrar('Equipe excluída.', 'info');
      this.cancelarExclusao();
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    }
  }

  protected abrirExclusaoTodas(): void {
    this.excluirTudoAberto.set(true);
  }

  protected fecharExclusaoTodas(): void {
    this.excluirTudoAberto.set(false);
  }

  protected async excluirTodas(): Promise<void> {
    try {
      await this.equipes.removerTodos();
      this.toast.mostrar('Todas as equipes foram excluídas.', 'info');
      this.excluirTudoAberto.set(false);
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    }
  }

  protected abrirSorteio(): void {
    if (!this.equipesAtivasDoContexto().length) {
      this.toast.mostrar('Crie ao menos uma equipe ativa antes de sortear.', 'info');
      return;
    }
    if (!this.alunosElegiveisParaSorteio().length) {
      this.toast.mostrar('Todos os alunos ativos da turma já estão em uma equipe.', 'info');
      return;
    }
    this.sorteioAberto.set(true);
  }

  protected fecharSorteio(): void {
    this.sorteioAberto.set(false);
  }

  protected async realizarSorteio(): Promise<void> {
    const turmaId = this.turmaEfetiva();
    const autor = this.auth.usuario();
    if (!turmaId || !autor || this.sorteando()) return;

    this.sorteando.set(true);
    try {
      const resultado = await this.equipes.sortearAlunos(
        {
          turmaId,
          periodoLetivoId: this.periodoEfetivo() || null,
          disciplinaId: this.disciplinaIdQuery() || null,
          alunoIds: this.alunosElegiveisParaSorteio().map((aluno) => aluno.id),
        },
        autor,
      );
      this.fecharSorteio();

      this.toast.mostrar(
        `${this.rotuloQuantidade(
          resultado.quantidadeSorteados,
          'aluno sorteado',
          'alunos sorteados',
        )}.`,
        'success',
      );
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    } finally {
      this.sorteando.set(false);
    }
  }

  /** Integrantes ativos de uma equipe, para exibição na lista de equipes. */
  protected integrantesDaEquipe(equipeId: string): EquipeMembro[] {
    return this.integrantesAtivosPorEquipe().get(equipeId) ?? [];
  }

  /** Resumo curto dos nomes dos integrantes, para não estourar a linha da tabela. */
  protected resumoDosIntegrantes(equipeId: string): string {
    const nomes = this.integrantesDaEquipe(equipeId).map((membro) => membro.alunoNome);
    return resumirNomesMembros(nomes);
  }

  protected rotuloCriterio(criterio: CriterioPlacar): string {
    return rotuloCriterioPlacar(criterio);
  }

  protected medalha(posicao: number): string {
    if (posicao === 1) return '🥇';
    if (posicao === 2) return '🥈';
    if (posicao === 3) return '🥉';
    return `${posicao}º`;
  }

  protected formatarDataHora(iso: string): string {
    return formatarDataHoraAuditoria(iso);
  }

  private atualizar<Campo extends keyof DadosEquipe>(
    campo: Campo,
    valor: DadosEquipe[Campo],
  ): void {
    this.formulario.update((atual) => ({ ...atual, [campo]: valor }));
  }

  private valorDoCampo(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  private rotuloQuantidade(quantidade: number, singular: string, plural: string): string {
    return `${quantidade} ${quantidade === 1 ? singular : plural}`;
  }

  private mensagem(erro: unknown): string {
    return erro instanceof Error ? erro.message : 'Não foi possível concluir a operação.';
  }
}
