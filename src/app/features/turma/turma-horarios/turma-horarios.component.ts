import { Component, computed, effect, inject, input, signal } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import type { Turno } from '../../../core/models';
import { Disciplina } from '../../../core/models/disciplina.model';
import {
  montarGradeAPartirDoPadrao,
  turnoUsaPadraoHorario,
} from '../../../core/models/padrao-horario.model';
import {
  AulaGrade,
  DadosGradeHoraria,
  DIAS_AULA,
  DiaAula,
  GradeHorariaTurma,
  LinhaGrade,
  AULAS_POR_DIA_PADRAO,
  MAXIMO_AULAS_POR_DISCIPLINA_POR_DIA_PADRAO,
  PosicaoCelulaAula,
  SEMANAS_LETIVAS_PADRAO,
  calcularSemanasLetivas,
  criarLinhaAula,
  criarLinhaIntervalo,
  formatarHorario,
  garantirAulasPorDia,
  gerarAulasAutomaticas,
  gradeVazia,
  minutosDeHorario,
  moverAulaNaGrade,
  nomeDiaAula,
  resumirAulasSemanais,
} from '../../../core/models/horario-turma.model';
import { HorariosTurmaService } from '../../../core/services/horarios-turma.service';
import { PadroesHorarioService } from '../../../core/services/padroes-horario.service';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';
import { ToastService } from '../../../core/services/toast.service';

interface LinhaComHorario {
  linha: LinhaGrade;
  inicio: string;
  fim: string;
}

interface FormularioAula {
  disciplinaId: string;
  quantidadeAulas: number;
}

@Component({
  selector: 'app-turma-horarios',
  imports: [ModalComponent],
  templateUrl: './turma-horarios.component.html',
  styleUrl: './turma-horarios.component.scss',
})
export class TurmaHorariosComponent {
  readonly turmaId = input.required<string>();
  readonly turno = input<Turno>('manha');
  readonly disciplinas = input<readonly Disciplina[]>([]);
  readonly somenteLeitura = input(true);

  protected readonly horariosService = inject(HorariosTurmaService);
  private readonly padroesHorarioService = inject(PadroesHorarioService);
  private readonly periodosLetivosService = inject(PeriodosLetivosService);
  private readonly toast = inject(ToastService);

  protected readonly diasSemana = DIAS_AULA;
  protected readonly carregando = signal(true);
  protected readonly erroCarregamento = signal('');
  protected readonly salvandoGrade = signal(false);
  protected readonly modalAberto = signal(false);
  protected readonly modalGeradorAberto = signal(false);
  protected readonly modalLimpezaAberto = signal(false);
  protected readonly salvandoAula = signal(false);
  protected readonly diaSelecionado = signal<DiaAula>('segunda');
  protected readonly linhaSelecionadaId = signal('');
  protected readonly semanasLetivas = signal(SEMANAS_LETIVAS_PADRAO);
  protected readonly maximoAulasPorDisciplinaPorDia = signal(
    MAXIMO_AULAS_POR_DISCIPLINA_POR_DIA_PADRAO,
  );
  protected readonly arrastando = signal<PosicaoCelulaAula | null>(null);
  protected readonly formularioAula = signal<FormularioAula>({
    disciplinaId: '',
    quantidadeAulas: 1,
  });
  protected readonly rascunho = signal<DadosGradeHoraria>(gradeVazia(''));
  private readonly turmaCarregada = signal('');

  protected readonly grade = computed<GradeHorariaTurma | DadosGradeHoraria>(
    () => this.horariosService.porTurma(this.turmaId()) ?? gradeVazia(this.turmaId()),
  );
  protected readonly disciplinasAtivas = computed(() =>
    this.disciplinas().filter((disciplina) => disciplina.ativa),
  );
  protected readonly disciplinasOfertadas = computed(
    () => new Set(this.disciplinasAtivas().map((disciplina) => disciplina.id)),
  );
  protected readonly professoresPorDisciplina = computed<ReadonlyMap<string, string>>(() => {
    const nomesPorDisciplina = new Map<string, string>();

    for (const disciplina of this.disciplinas()) {
      const nomes = this.horariosService.nomesProfessoresDaDisciplina(
        this.turmaId(),
        disciplina.id,
      );
      if (nomes.length > 0) {
        nomesPorDisciplina.set(disciplina.id, nomes.join(', '));
      }
    }

    return nomesPorDisciplina;
  });
  protected readonly semanasLetivasSugeridas = computed(() => {
    const periodoAtivo = this.periodosLetivosService.ativo();
    if (!periodoAtivo) return SEMANAS_LETIVAS_PADRAO;
    return calcularSemanasLetivas(periodoAtivo.dataInicio, periodoAtivo.dataFim);
  });
  protected readonly resumoSemanal = computed(() =>
    resumirAulasSemanais(this.rascunho(), this.disciplinasAtivas(), this.semanasLetivas()),
  );
  protected readonly totalDemandaSemanal = computed(() =>
    this.resumoSemanal().reduce((total, disciplina) => total + disciplina.aulasSemanais, 0),
  );
  protected readonly aulasPorDia = computed(
    () => this.rascunho().linhas.filter((linha) => linha.tipo === 'aula').length,
  );
  protected readonly totalVagas = computed(
    () => this.aulasPorDia() * this.diasSemana.length,
  );
  protected readonly excedeVagas = computed(
    () => this.totalDemandaSemanal() > this.totalVagas(),
  );
  protected readonly temAulasNaGrade = computed(
    () => this.grade().aulas.length > 0,
  );
  protected readonly linhasCalculadas = computed<LinhaComHorario[]>(() => {
    const grade = this.grade();
    const inicioEmMinutos = minutosDeHorario(grade.inicio) ?? 0;
    let proximoInicio = inicioEmMinutos;

    return grade.linhas.map((linha) => {
      const duracao = linha.tipo === 'aula' ? grade.minutosPorAula : (linha.duracaoMinutos ?? 0);
      const horarioDaLinha = {
        linha,
        inicio: formatarHorario(proximoInicio),
        fim: formatarHorario(proximoInicio + duracao),
      };
      proximoInicio += duracao;
      return horarioDaLinha;
    });
  });

  protected readonly inicioAulas = computed(() => this.rascunho().inicio);
  protected readonly minutosPorAula = computed(() => this.rascunho().minutosPorAula);
  constructor() {
    effect(() => {
      const turmaId = this.turmaId();
      if (!turmaId || this.turmaCarregada() === turmaId) return;
      this.turmaCarregada.set(turmaId);
      this.modalGeradorAberto.set(false);
      this.rascunho.set(this.horariosService.porTurma(turmaId) ?? gradeVazia(turmaId));
    });
    void this.carregar();
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected nomeDisciplina(disciplinaId: string): string {
    return (
      this.disciplinas().find((disciplina) => disciplina.id === disciplinaId)?.nome ??
      'Disciplina indisponível'
    );
  }

  protected corDisciplina(disciplinaId: string): string {
    return (
      this.disciplinas().find((disciplina) => disciplina.id === disciplinaId)?.cor ?? '#2563eb'
    );
  }

  protected atualizarInicio(evento: Event): void {
    const inicio = this.valor(evento);
    this.rascunho.update((grade) => ({ ...grade, inicio }));
  }

  protected atualizarDuracao(evento: Event): void {
    const minutosPorAula = Number(this.valor(evento));
    this.rascunho.update((grade) => ({ ...grade, minutosPorAula }));
  }

  protected atualizarDuracaoIntervalo(linhaId: string, evento: Event): void {
    const duracaoMinutos = Number(this.valor(evento));
    this.rascunho.update((grade) => ({
      ...grade,
      linhas: grade.linhas.map((linha) =>
        linha.id === linhaId ? { ...linha, duracaoMinutos } : linha,
      ),
    }));
  }

  protected salvarConfiguracao(): void {
    void this.salvarGrade();
  }

  protected async aplicarPadraoDaEscola(): Promise<void> {
    if (this.somenteLeitura() || this.salvandoGrade()) return;
    if (this.temAulasNaGrade()) {
      this.toast.mostrar(
        'Remova as aulas da grade antes de aplicar o padrão da escola.',
        'warning',
      );
      return;
    }

    const gradePadrao = await this.criarGradeComPadrao(this.turmaId());
    if (!gradePadrao) {
      this.toast.mostrar(
        'O padrão da escola ainda não foi configurado para este turno.',
        'warning',
      );
      return;
    }

    this.rascunho.set(gradePadrao);
    const salvou = await this.salvarGrade();
    if (salvou) {
      this.toast.mostrar('Padrão de horário aplicado.');
    }
  }

  protected adicionarAulaNaGrade(): void {
    if (this.somenteLeitura() || this.salvandoGrade()) return;
    const linha = criarLinhaAula();
    this.rascunho.update((grade) => ({ ...grade, linhas: [...grade.linhas, linha] }));
    void this.salvarGrade();
  }

  protected inserirIntervaloDepois(linhaId: string): void {
    if (this.somenteLeitura() || this.salvandoGrade()) return;
    const grade = this.rascunho();
    const indiceLinha = grade.linhas.findIndex((linha) => linha.id === linhaId);
    if (indiceLinha < 0) return;
    const indiceInsercao = indiceLinha + 1;

    const intervaloDentroDeAulaDupla = grade.aulas.some((aula) => {
      const indiceInicio = grade.linhas.findIndex((linha) => linha.id === aula.linhaInicioId);
      return indiceInicio < indiceInsercao && indiceInicio + aula.quantidadeAulas > indiceInsercao;
    });
    if (intervaloDentroDeAulaDupla) {
      this.toast.mostrar('Remova ou ajuste primeiro a aula que ocupa os períodos seguintes.', 'warning');
      return;
    }

    const linhas = [...grade.linhas];
    linhas.splice(indiceInsercao, 0, criarLinhaIntervalo());
    this.rascunho.update((atual) => ({ ...atual, linhas }));
    void this.salvarGrade();
  }

  protected adicionarIntervaloNoFim(): void {
    if (this.somenteLeitura() || this.salvandoGrade()) return;
    this.rascunho.update((grade) => ({ ...grade, linhas: [...grade.linhas, criarLinhaIntervalo()] }));
    void this.salvarGrade();
  }

  protected removerLinha(linhaId: string): void {
    if (this.somenteLeitura() || this.salvandoGrade()) return;
    const grade = this.rascunho();
    const indiceLinha = grade.linhas.findIndex((linha) => linha.id === linhaId);
    if (indiceLinha < 0) return;

    const linhaOcupada = grade.aulas.some((aula) => {
      const indiceInicio = grade.linhas.findIndex((linha) => linha.id === aula.linhaInicioId);
      return (
        indiceInicio >= 0 &&
        indiceLinha >= indiceInicio &&
        indiceLinha < indiceInicio + aula.quantidadeAulas
      );
    });
    if (linhaOcupada) {
      this.toast.mostrar('Remova ou ajuste as aulas desta linha antes de removê-la.', 'warning');
      return;
    }

    this.rascunho.update((atual) => ({
      ...atual,
      linhas: atual.linhas.filter((linha) => linha.id !== linhaId),
    }));
    void this.salvarGrade();
  }

  protected abrirAula(diaSemana: DiaAula, linhaId: string): void {
    if (this.somenteLeitura()) return;
    const aulaExistente = this.grade().aulas.find(
      (aula) => aula.diaSemana === diaSemana && aula.linhaInicioId === linhaId,
    );
    this.diaSelecionado.set(diaSemana);
    this.linhaSelecionadaId.set(linhaId);
    this.formularioAula.set({
      disciplinaId: aulaExistente?.disciplinaId ?? this.disciplinasAtivas()[0]?.id ?? '',
      quantidadeAulas: aulaExistente?.quantidadeAulas ?? 1,
    });
    this.modalAberto.set(true);
  }

  protected atualizarDisciplinaAula(evento: Event): void {
    this.formularioAula.update((formulario) => ({
      ...formulario,
      disciplinaId: this.valor(evento),
    }));
  }

  protected atualizarQuantidadeAulas(evento: Event): void {
    this.formularioAula.update((formulario) => ({
      ...formulario,
      quantidadeAulas: Number(this.valor(evento)),
    }));
  }

  protected aulaNaCelula(diaSemana: DiaAula, linhaId: string): AulaGrade | undefined {
    return this.grade().aulas.find(
      (aula) => aula.diaSemana === diaSemana && aula.linhaInicioId === linhaId,
    );
  }

  protected celulaOcupada(diaSemana: DiaAula, linhaId: string): boolean {
    const grade = this.grade();
    const indiceLinha = grade.linhas.findIndex((linha) => linha.id === linhaId);
    return grade.aulas.some((aula) => {
      if (aula.diaSemana !== diaSemana) return false;
      const indiceInicio = grade.linhas.findIndex((linha) => linha.id === aula.linhaInicioId);
      return indiceLinha > indiceInicio && indiceLinha < indiceInicio + aula.quantidadeAulas;
    });
  }

  protected maximoAulasDisponiveis(diaSemana: DiaAula, linhaId: string): number {
    const grade = this.grade();
    const indiceInicio = grade.linhas.findIndex((linha) => linha.id === linhaId);
    let quantidade = 0;

    for (const linha of grade.linhas.slice(indiceInicio)) {
      if (linha.tipo === 'intervalo') break;
      const indiceAtual = grade.linhas.findIndex((linhaGrade) => linhaGrade.id === linha.id);
      const ocupada = grade.aulas.some((aula) => {
        if (aula.diaSemana !== diaSemana || aula.linhaInicioId === linhaId) return false;
        const indiceAula = grade.linhas.findIndex((linhaGrade) => linhaGrade.id === aula.linhaInicioId);
        return indiceAtual >= indiceAula && indiceAtual < indiceAula + aula.quantidadeAulas;
      });
      if (ocupada) break;
      quantidade++;
    }
    return quantidade;
  }

  protected opcoesQuantidadeAulas(): number[] {
    const quantidadeMaxima = this.maximoAulasDisponiveis(
      this.diaSelecionado(),
      this.linhaSelecionadaId(),
    );
    return Array.from({ length: quantidadeMaxima }, (_, indice) => indice + 1);
  }

  protected nomeDiaSelecionado(): string {
    return nomeDiaAula(this.diaSelecionado());
  }

  protected fimAula(aula: AulaGrade): string {
    const grade = this.grade();
    const indiceInicio = grade.linhas.findIndex((linha) => linha.id === aula.linhaInicioId);
    const linhasAula = grade.linhas.slice(indiceInicio, indiceInicio + aula.quantidadeAulas);
    const linhaFinal = this.linhasCalculadas().find(
      (linhaCalculada) => linhaCalculada.linha.id === linhasAula[linhasAula.length - 1]?.id,
    );
    return linhaFinal?.fim ?? '';
  }

  protected iniciarArrasto(
    evento: DragEvent,
    diaSemana: DiaAula,
    linhaInicioId: string,
  ): void {
    if (this.somenteLeitura()) {
      evento.preventDefault();
      return;
    }
    this.arrastando.set({ diaSemana, linhaInicioId });
    if (!evento.dataTransfer) return;
    evento.dataTransfer.effectAllowed = 'move';
    evento.dataTransfer.setData('text/plain', `${diaSemana}:${linhaInicioId}`);
  }

  protected permitirSoltar(evento: DragEvent): void {
    if (this.somenteLeitura() || !this.arrastando()) return;
    evento.preventDefault();
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'move';
  }

  protected finalizarArrasto(): void {
    this.arrastando.set(null);
  }

  protected async soltarAula(
    evento: DragEvent,
    diaSemana: DiaAula,
    linhaInicioId: string,
  ): Promise<void> {
    evento.preventDefault();
    const origem = this.arrastando();
    this.arrastando.set(null);
    if (!origem || this.somenteLeitura() || this.salvandoGrade()) return;
    if (origem.diaSemana === diaSemana && origem.linhaInicioId === linhaInicioId) return;

    const grade = this.grade();
    const trocouAula = Boolean(this.aulaNaCelula(diaSemana, linhaInicioId));
    const resultado = moverAulaNaGrade(grade, origem, { diaSemana, linhaInicioId });
    if (resultado.erro) {
      this.toast.mostrar(resultado.erro, 'warning');
      return;
    }

    this.rascunho.set({ ...grade, aulas: resultado.aulas });
    const salvou = await this.salvarGrade();
    if (salvou) {
      this.toast.mostrar(trocouAula ? 'Aulas trocadas.' : 'Aula movida.');
    }
  }

  protected abrirGerador(): void {
    if (this.somenteLeitura()) return;

    const gradeAtual = this.rascunho();
    this.rascunho.set(
      gradeAtual.linhas.length > 0
        ? gradeAtual
        : garantirAulasPorDia(gradeAtual, AULAS_POR_DIA_PADRAO),
    );
    this.semanasLetivas.set(this.semanasLetivasSugeridas());
    this.maximoAulasPorDisciplinaPorDia.set(
      MAXIMO_AULAS_POR_DISCIPLINA_POR_DIA_PADRAO,
    );
    this.modalGeradorAberto.set(true);
  }

  protected fecharGerador(): void {
    this.modalGeradorAberto.set(false);
    this.rascunho.set(this.grade());
  }

  protected abrirLimpeza(): void {
    if (this.somenteLeitura() || !this.temAulasNaGrade()) return;
    this.modalLimpezaAberto.set(true);
  }

  protected fecharLimpeza(): void {
    this.modalLimpezaAberto.set(false);
  }

  protected async confirmarLimpeza(): Promise<void> {
    if (this.somenteLeitura() || this.salvandoGrade()) return;

    const grade = this.grade();
    this.rascunho.set({ ...grade, aulas: [] });
    const salvou = await this.salvarGrade();
    if (!salvou) return;

    this.fecharLimpeza();
    this.toast.mostrar('Horário limpo.');
  }

  protected atualizarSemanasLetivas(evento: Event): void {
    const semanas = Number(this.valor(evento));
    this.semanasLetivas.set(
      Number.isFinite(semanas) && semanas > 0
        ? Math.floor(semanas)
        : SEMANAS_LETIVAS_PADRAO,
    );
  }

  protected atualizarMaximoAulasPorDisciplinaPorDia(evento: Event): void {
    const maximo = Number(this.valor(evento));
    this.maximoAulasPorDisciplinaPorDia.set(
      Number.isFinite(maximo) && maximo > 0
        ? Math.floor(maximo)
        : MAXIMO_AULAS_POR_DISCIPLINA_POR_DIA_PADRAO,
    );
  }

  protected async gerarGradeAutomatica(): Promise<void> {
    if (this.somenteLeitura() || this.salvandoGrade()) return;
    const grade = this.rascunho();
    const aulas = gerarAulasAutomaticas(
      grade,
      this.disciplinasAtivas(),
      this.semanasLetivas(),
      this.maximoAulasPorDisciplinaPorDia(),
    );
    if (aulas.length === 0) {
      this.toast.mostrar(
        'Não foi possível gerar aulas. Verifique as linhas de aula e a carga horária das disciplinas.',
        'warning',
      );
      return;
    }

    this.rascunho.set({ ...grade, aulas });
    const salvou = await this.salvarGrade();
    if (salvou) {
      this.toast.mostrar('Grade gerada automaticamente.');
      this.fecharGerador();
    }
  }

  protected fecharModal(): void {
    this.modalAberto.set(false);
  }

  protected async salvarAula(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.somenteLeitura()) return;
    this.salvandoAula.set(true);

    const grade = this.grade();
    const linhaInicioId = this.linhaSelecionadaId();
    const diaSemana = this.diaSelecionado();
    const aulasExistentes = grade.aulas.filter(
      (aula) => aula.diaSemana !== diaSemana || aula.linhaInicioId !== linhaInicioId,
    );
    const aulas = [
      ...aulasExistentes,
      {
        diaSemana,
        linhaInicioId,
        quantidadeAulas: this.formularioAula().quantidadeAulas,
        disciplinaId: this.formularioAula().disciplinaId,
      },
    ];

    try {
      await this.horariosService.salvar(
        { ...grade, turmaId: this.turmaId(), aulas },
        this.disciplinasOfertadas(),
      );
      this.rascunho.set({ ...grade, aulas });
      this.toast.mostrar('Aula adicionada ao horário.');
      this.fecharModal();
    } catch (erro) {
      this.toast.mostrar(this.mensagemErro(erro), 'warning');
    } finally {
      this.salvandoAula.set(false);
    }
  }

  protected async removerAula(): Promise<void> {
    if (this.somenteLeitura() || this.salvandoAula()) return;
    const diaSemana = this.diaSelecionado();
    const linhaInicioId = this.linhaSelecionadaId();
    const grade = this.grade();
    const aulas = grade.aulas.filter(
      (aula) => aula.diaSemana !== diaSemana || aula.linhaInicioId !== linhaInicioId,
    );

    try {
      await this.horariosService.salvar(
        { ...grade, turmaId: this.turmaId(), aulas },
        this.disciplinasOfertadas(),
      );
      this.rascunho.set({ ...grade, aulas });
      this.toast.mostrar('Aula removida do horário.');
      this.fecharModal();
    } catch (erro) {
      this.toast.mostrar(this.mensagemErro(erro), 'warning');
    }
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erroCarregamento.set('');
    try {
      await this.horariosService.load();
      const turmaId = this.turmaId();
      const gradeSalva = this.horariosService.porTurma(turmaId);
      this.turmaCarregada.set(turmaId);

      const gradeSemEstrutura =
        !gradeSalva ||
        (gradeSalva.linhas.length === 0 && gradeSalva.aulas.length === 0);
      if (gradeSemEstrutura) {
        const gradePadrao = await this.criarGradeComPadrao(turmaId);
        if (gradePadrao) {
          const gradeInicial =
            this.somenteLeitura()
              ? gradeSalva ?? gradePadrao
              : await this.horariosService.salvar(
                  gradePadrao,
                  this.disciplinasOfertadas(),
                );
          this.rascunho.set(gradeInicial);
          return;
        }
      }

      this.rascunho.set(gradeSalva ?? gradeVazia(turmaId));
    } catch (erro) {
      this.erroCarregamento.set(this.mensagemErro(erro));
    } finally {
      this.carregando.set(false);
    }
  }

  private async criarGradeComPadrao(
    turmaId: string,
  ): Promise<DadosGradeHoraria | null> {
    if (!turnoUsaPadraoHorario(this.turno())) return null;

    try {
      await this.padroesHorarioService.load();
      const padrao = this.padroesHorarioService.padrao();
      if (!padrao) return null;

      const grade = montarGradeAPartirDoPadrao(turmaId, padrao, this.turno());
      return grade.linhas.length > 0 ? grade : null;
    } catch {
      return null;
    }
  }

  private async salvarGrade(): Promise<boolean> {
    if (this.somenteLeitura()) return false;
    this.salvandoGrade.set(true);
    try {
      const gradeSalva = await this.horariosService.salvar(
        this.rascunho(),
        this.disciplinasOfertadas(),
      );
      this.rascunho.set(gradeSalva);
      return true;
    } catch (erro) {
      this.toast.mostrar(this.mensagemErro(erro), 'warning');
      const gradeSalva = this.horariosService.porTurma(this.turmaId());
      this.rascunho.set(gradeSalva ?? gradeVazia(this.turmaId()));
      return false;
    } finally {
      this.salvandoGrade.set(false);
    }
  }

  private mensagemErro(erro: unknown): string {
    return erro instanceof Error ? erro.message : 'Não foi possível salvar a grade horária.';
  }
}
