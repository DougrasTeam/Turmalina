import { Component, computed, inject, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { AvaliacoesService } from '../../../core/services/avaliacoes.service';
import { BoletimService } from '../../../core/services/boletim.service';
import { ContextoProfessorService } from '../../../core/services/contexto-professor.service';
import { DisciplinasService } from '../../../core/services/disciplinas.service';
import { FrequenciasService } from '../../../core/services/frequencias.service';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { Avaliacao, formatarNota, resumoNotas } from '../../../core/models/avaliacao.model';
import { classeSituacao, rotuloSituacao } from '../../../core/models/boletim.model';
import { dataHoje, formatarDataFrequencia, formatarPercentual, calcularResumoFrequencia } from '../../../core/models/frequencia.model';
import { InstituicaoService } from '../../../core/services/instituicao.service';
import { MetasService } from '../../../core/services/metas.service';
import { MissoesService } from '../../../core/services/missoes.service';

@Component({
  selector: 'app-painel-professor',
  imports: [RouterLink],
  templateUrl: './painel-professor.component.html',
  styleUrl: './painel-professor.component.scss',
})
export class PainelProfessorComponent {
  private readonly auth = inject(AuthService);
  protected readonly contexto = inject(ContextoProfessorService);
  protected readonly turmas = inject(TurmasService);
  protected readonly disciplinas = inject(DisciplinasService);
  protected readonly alunos = inject(AlunosService);
  protected readonly periodos = inject(PeriodosLetivosService);
  protected readonly avaliacoes = inject(AvaliacoesService);
  protected readonly frequencias = inject(FrequenciasService);
  protected readonly boletimService = inject(BoletimService);
  protected readonly instituicao = inject(InstituicaoService);
  protected readonly metasService = inject(MetasService);
  protected readonly missoesService = inject(MissoesService);

  protected readonly professorAtual = this.contexto.professorAtual;

  protected readonly turmasDoProfessor = computed(() =>
    this.contexto.turmasDoProfessor().sort((primeira, segunda) => primeira.nome.localeCompare(segunda.nome, 'pt-BR')),
  );

  protected readonly turmaFiltro = linkedSignal(() => this.turmasDoProfessor()[0]?.id ?? '');
  protected readonly periodoFiltro = linkedSignal(
    () => this.periodos.ativo()?.id ?? this.periodos.periodos()[0]?.id ?? '',
  );

  protected readonly turmaSelecionada = computed(
    () => this.turmas.porId(this.turmaFiltro()) ?? null,
  );

  protected readonly periodoSelecionado = computed(() => this.periodos.porId(this.periodoFiltro()) ?? null);

  private readonly boletins = computed(() =>
    this.turmaFiltro()
      ? this.boletimService.gerarPorTurma(
          this.turmaFiltro(),
          this.periodoFiltro(),
          this.contexto
            .disciplinasDoProfessorNaTurma(this.turmaFiltro())
            .map((disciplina) => disciplina.id),
        )
      : [],
  );

  protected readonly alunosAtivos = computed(() =>
    this.turmaFiltro() ? this.alunos.porTurma(this.turmaFiltro()).filter((aluno) => aluno.ativo).length : 0,
  );

  protected readonly frequenciaMedia = computed(() => {
    if (!this.turmaFiltro() || !this.periodoFiltro()) return null;
    const disciplinasPermitidas = new Set(
      this.contexto
        .disciplinasDoProfessorNaTurma(this.turmaFiltro())
        .map((disciplina) => disciplina.id),
    );
    const registros = this.frequencias
      .porTurma(this.turmaFiltro())
      .filter(
        (chamada) =>
          chamada.periodoLetivoId === this.periodoFiltro() &&
          (chamada.disciplinaId === null || disciplinasPermitidas.has(chamada.disciplinaId)),
      )
      .flatMap((chamada) => chamada.registros);
    return calcularResumoFrequencia(registros, this.instituicao.faltaJustificadaAbona()).percentual;
  });

  protected readonly medias = computed(() => this.boletins().map((boletim) => boletim.mediaGeral).filter((media): media is number => media !== null));

  protected readonly mediaDesempenho = computed(() => {
    const medias = this.medias();
    if (medias.length === 0) return null;
    const soma = medias.reduce((acumulado, media) => acumulado + media, 0);
    return Math.round((soma / medias.length) * 10) / 10;
  });

  protected readonly alunosAtencao = computed(() =>
    this.boletins().filter(
      (boletim) => boletim.situacao === 'recuperacao' || boletim.situacao === 'reprovado',
    ),
  );

  private readonly avaliacoesPeriodo = computed(() =>
    this.turmaFiltro()
      ? this.avaliacoes
          .porTurmaEPeriodo(this.turmaFiltro(), this.periodoFiltro())
          .filter((avaliacao) =>
            this.contexto.possuiVinculoAtivo(avaliacao.turmaId, avaliacao.disciplinaId),
          )
      : [],
  );

  protected readonly semLancamento = computed(() =>
    this.avaliacoesPeriodo().filter((avaliacao) => resumoNotas(avaliacao).pendentes > 0),
  );

  protected readonly disciplinasDaTurma = computed(() => {
    const turmaId = this.turmaFiltro();
    return turmaId ? this.contexto.disciplinasDoProfessorNaTurma(turmaId) : [];
  });

  protected readonly metasPendentes = computed(() => {
    const turmaId = this.turmaFiltro();
    if (!turmaId) return [];

    return this.disciplinasDaTurma().flatMap((disciplina) =>
      this.metasService.metasComAlunosElegiveis(turmaId, disciplina.id),
    );
  });

  protected readonly missoesPendentes = computed(() => {
    const turmaId = this.turmaFiltro();
    if (!turmaId) return [];

    const totalAlunos = this.alunosAtivos();
    return this.disciplinasDaTurma()
      .flatMap((disciplina) =>
        this.missoesService
          .missoesVisiveisDaTurmaEDisciplina(turmaId, disciplina.id)
          .map((missao) => ({
            missao,
            concluidos: this.missoesService.conclusoesDaMissao(missao.id).length,
          })),
      )
      .filter((item) => item.concluidos < totalAlunos);
  });

  protected readonly proximasAvaliacoes = computed(() => {
    const hoje = dataHoje();
    return this.avaliacoesPeriodo()
      .filter((avaliacao) => avaliacao.data !== null && avaliacao.data >= hoje)
      .sort((primeira, segunda) => primeira.data!.localeCompare(segunda.data!));
  });

  protected readonly atividadesRecentes = computed(() => {
    const eventos: { descricao: string; quando: string }[] = [];
    for (const avaliacao of this.avaliacoesPeriodo()) {
      eventos.push({ descricao: `Avaliação «${avaliacao.nome}»`, quando: avaliacao.atualizadoEm });
    }
    for (const frequencia of this.frequencias
      .porTurma(this.turmaFiltro())
      .filter(
        (chamada) =>
          chamada.periodoLetivoId === this.periodoFiltro() &&
          (chamada.disciplinaId === null ||
            this.contexto.possuiVinculoAtivo(this.turmaFiltro(), chamada.disciplinaId)),
      )) {
      eventos.push({ descricao: `Chamada de ${formatarDataFrequencia(frequencia.data)}`, quando: frequencia.atualizadoEm });
    }
    return eventos.sort((primeiro, segundo) => segundo.quando.localeCompare(primeiro.quando)).slice(0, 5);
  });

  protected nomeDisciplina(disciplinaId: string): string {
    return this.disciplinas.porId(disciplinaId)?.nome ?? 'Disciplina';
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }

  protected nota(valor: number | null): string {
    return formatarNota(valor, this.instituicao.casasDecimaisNota());
  }

  protected percentual(valor: number | null): string {
    return formatarPercentual(valor);
  }

  protected dataCurta(iso: string | null): string {
    if (!iso) return 'sem data';
    return formatarDataFrequencia(iso.slice(0, 10));
  }

  protected situacaoLabel(situacao: string): string {
    return rotuloSituacao(situacao as never);
  }

  protected situacaoClasse(situacao: string): string {
    return classeSituacao(situacao as never);
  }

  protected resumoPendentes(avaliacao: Avaliacao): number {
    return resumoNotas(avaliacao).pendentes;
  }
}
