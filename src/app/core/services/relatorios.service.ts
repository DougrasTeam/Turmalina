import { Injectable, inject } from '@angular/core';

import { AlunosService } from './alunos.service';
import { AvaliacoesService } from './avaliacoes.service';
import { DisciplinasService } from './disciplinas.service';
import { FrequenciasService } from './frequencias.service';
import { InstituicaoService } from './instituicao.service';
import { PeriodosLetivosService } from './periodos-letivos.service';
import { TurmasService } from './turmas.service';
import { Aluno } from '../models';
import { arredondar, calcularMediaAluno, resumoNotas } from '../models/avaliacao.model';
import { Frequencia, ResumoFrequencia, calcularResumoFrequencia } from '../models/frequencia.model';
import {
  ColunaDisciplinaRelatorio,
  LinhaRelatorioAvaliacaoPendente,
  LinhaRelatorioDesempenho,
  LinhaRelatorioFrequencia,
  RelatorioAvaliacoesPendentes,
  RelatorioDesempenho,
  RelatorioFrequencia,
  ResumoInstitucional,
} from '../models/relatorio.model';

function mediaAritmetica(valores: readonly number[], casas: number): number | null {
  if (!valores.length) return null;
  const soma = valores.reduce((acumulado, valor) => acumulado + valor, 0);
  return arredondar(soma / valores.length, casas);
}

/**
 * Monta os relatórios acadêmicos (RF-014) a partir dos dados já carregados nos
 * serviços de domínio. Aqui ficam apenas as regras de agregação; o cálculo de
 * frequência e de média é reaproveitado dos modelos (`calcularResumoFrequencia`
 * e `calcularMediaAluno`), garantindo a mesma fórmula usada no restante do app.
 */
@Injectable({ providedIn: 'root' })
export class RelatoriosService {
  private readonly alunos = inject(AlunosService);
  private readonly turmas = inject(TurmasService);
  private readonly disciplinas = inject(DisciplinasService);
  private readonly frequencias = inject(FrequenciasService);
  private readonly avaliacoes = inject(AvaliacoesService);
  private readonly periodos = inject(PeriodosLetivosService);
  private readonly instituicao = inject(InstituicaoService);

  frequenciaDaTurma(turmaId: string, periodoLetivoId: string): RelatorioFrequencia | null {
    const turma = this.turmas.porId(turmaId);
    if (!turma) return null;

    const periodo = this.periodos.porId(periodoLetivoId);
    const abona = this.instituicao.faltaJustificadaAbona();
    const frequenciaMinima = this.instituicao.frequenciaMinima();
    const chamadas = this.chamadasDaTurma(turmaId, periodoLetivoId);

    const linhas: LinhaRelatorioFrequencia[] = this.alunos
      .porTurma(turmaId)
      .map((aluno) => this.linhaFrequencia(aluno, chamadas, abona, frequenciaMinima))
      .sort((primeiro, segundo) => primeiro.alunoNome.localeCompare(segundo.alunoNome, 'pt-BR'));

    const percentuais = linhas
      .map((linha) => linha.percentual)
      .filter((percentual): percentual is number => percentual !== null);

    return {
      turmaId,
      turmaNome: turma.nome,
      periodoLetivoId,
      periodoNome: periodo?.nome ?? '—',
      frequenciaMinima,
      abonaJustificada: abona,
      geradoEm: new Date().toISOString(),
      totalAlunos: linhas.length,
      percentualMedio: mediaAritmetica(percentuais, 1),
      alunosAbaixoDoLimite: linhas.filter((linha) => linha.abaixoDoLimite).length,
      linhas,
    };
  }

  desempenhoDaTurma(turmaId: string, periodoLetivoId: string): RelatorioDesempenho | null {
    const turma = this.turmas.porId(turmaId);
    if (!turma) return null;

    const periodo = this.periodos.porId(periodoLetivoId);
    const casas = this.instituicao.casasDecimaisNota();
    const mediaMinima = this.instituicao.mediaMinima();

    const colunas: ColunaDisciplinaRelatorio[] = this.disciplinas
      .porIds(turma.disciplinaIds)
      .map((disciplina) => ({ disciplinaId: disciplina.id, disciplinaNome: disciplina.nome }));

    const avaliacoesPeriodo = this.avaliacoes.porTurmaEPeriodo(turmaId, periodoLetivoId);

    const linhas: LinhaRelatorioDesempenho[] = this.alunos
      .porTurma(turmaId)
      .map((aluno) => {
        const mediasPorDisciplina = colunas.map(
          (coluna) =>
            calcularMediaAluno(
              avaliacoesPeriodo.filter(
                (avaliacao) => avaliacao.disciplinaId === coluna.disciplinaId,
              ),
              aluno.id,
              casas,
            ).valor,
        );
        const geral = calcularMediaAluno(avaliacoesPeriodo, aluno.id, casas);
        return {
          alunoId: aluno.id,
          alunoNome: aluno.nome,
          alunoMatricula: aluno.matricula,
          mediasPorDisciplina,
          mediaGeral: geral.valor,
          notasLancadas: geral.lancadas,
          abaixoDaMedia: geral.valor !== null && geral.valor < mediaMinima,
        };
      })
      .sort((primeiro, segundo) => primeiro.alunoNome.localeCompare(segundo.alunoNome, 'pt-BR'));

    const mediasValidas = linhas
      .map((linha) => linha.mediaGeral)
      .filter((media): media is number => media !== null);

    return {
      turmaId,
      turmaNome: turma.nome,
      periodoLetivoId,
      periodoNome: periodo?.nome ?? '—',
      mediaMinima,
      casasDecimais: casas,
      geradoEm: new Date().toISOString(),
      totalAlunos: linhas.length,
      mediaGeral: mediaAritmetica(mediasValidas, casas),
      alunosAbaixoDaMedia: linhas.filter((linha) => linha.abaixoDaMedia).length,
      colunas,
      linhas,
    };
  }

  avaliacoesPendentes(
    turmaId: string,
    periodoLetivoId: string,
  ): RelatorioAvaliacoesPendentes | null {
    const turma = this.turmas.porId(turmaId);
    if (!turma) return null;

    const periodo = this.periodos.porId(periodoLetivoId);

    const linhas: LinhaRelatorioAvaliacaoPendente[] = this.avaliacoes
      .porTurmaEPeriodo(turmaId, periodoLetivoId)
      .filter((avaliacao) => avaliacao.status !== 'arquivada')
      .map((avaliacao) => {
        const resumo = resumoNotas(avaliacao);
        return {
          avaliacaoId: avaliacao.id,
          nome: avaliacao.nome,
          disciplinaNome: this.disciplinas.porId(avaliacao.disciplinaId)?.nome ?? '—',
          data: avaliacao.data,
          status: avaliacao.status,
          total: resumo.total,
          lancadas: resumo.lancadas,
          pendentes: resumo.pendentes,
        };
      })
      .filter((linha) => linha.pendentes > 0)
      .sort(
        (primeiro, segundo) =>
          segundo.pendentes - primeiro.pendentes ||
          primeiro.nome.localeCompare(segundo.nome, 'pt-BR'),
      );

    return {
      turmaId,
      turmaNome: turma.nome,
      periodoLetivoId,
      periodoNome: periodo?.nome ?? '—',
      geradoEm: new Date().toISOString(),
      totalAvaliacoes: linhas.length,
      totalPendentes: linhas.reduce((total, linha) => total + linha.pendentes, 0),
      linhas,
    };
  }

  resumoInstitucional(periodoLetivoId: string): ResumoInstitucional {
    const periodo = this.periodos.porId(periodoLetivoId);
    const turmasAtivas = this.turmas.turmas().filter((turma) => turma.ativa);
    const abona = this.instituicao.faltaJustificadaAbona();
    const frequenciaMinima = this.instituicao.frequenciaMinima();
    const mediaMinima = this.instituicao.mediaMinima();
    const casas = this.instituicao.casasDecimaisNota();

    const percentuais: number[] = [];
    const medias: number[] = [];
    let alunosAbaixoDoLimite = 0;
    let alunosAbaixoDaMedia = 0;
    let avaliacoesComPendencia = 0;

    for (const turma of turmasAtivas) {
      const chamadas = this.chamadasDaTurma(turma.id, periodoLetivoId);
      const avaliacoesPeriodo = this.avaliacoes.porTurmaEPeriodo(turma.id, periodoLetivoId);

      for (const aluno of this.alunos.porTurma(turma.id)) {
        const resumo = this.resumoAlunoNasChamadas(chamadas, aluno.id, abona);
        if (resumo.percentual !== null) {
          percentuais.push(resumo.percentual);
          if (resumo.percentual < frequenciaMinima) alunosAbaixoDoLimite++;
        }

        const mediaAluno = calcularMediaAluno(avaliacoesPeriodo, aluno.id, casas).valor;
        if (mediaAluno !== null) {
          medias.push(mediaAluno);
          if (mediaAluno < mediaMinima) alunosAbaixoDaMedia++;
        }
      }

      avaliacoesComPendencia += avaliacoesPeriodo.filter(
        (avaliacao) => avaliacao.status !== 'arquivada' && resumoNotas(avaliacao).pendentes > 0,
      ).length;
    }

    return {
      periodoLetivoId,
      periodoNome: periodo?.nome ?? '—',
      geradoEm: new Date().toISOString(),
      turmasAtivas: turmasAtivas.length,
      alunosAtivos: this.alunos.ativos(),
      frequenciaMedia: mediaAritmetica(percentuais, 1),
      mediaGeral: mediaAritmetica(medias, casas),
      alunosAbaixoDoLimite,
      alunosAbaixoDaMedia,
      avaliacoesComPendencia,
    };
  }

  private linhaFrequencia(
    aluno: Aluno,
    chamadas: readonly Frequencia[],
    abona: boolean,
    frequenciaMinima: number,
  ): LinhaRelatorioFrequencia {
    const resumo = this.resumoAlunoNasChamadas(chamadas, aluno.id, abona);
    return {
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      alunoMatricula: aluno.matricula,
      total: resumo.total,
      presentes: resumo.presentes,
      faltas: resumo.faltas,
      justificadas: resumo.justificadas,
      percentual: resumo.percentual,
      abaixoDoLimite: resumo.percentual !== null && resumo.percentual < frequenciaMinima,
    };
  }

  private resumoAlunoNasChamadas(
    chamadas: readonly Frequencia[],
    alunoId: string,
    abona: boolean,
  ): ResumoFrequencia {
    const registros = chamadas.flatMap((chamada) =>
      chamada.registros.filter((registro) => registro.alunoId === alunoId),
    );
    return calcularResumoFrequencia(registros, abona);
  }

  private chamadasDaTurma(turmaId: string, periodoLetivoId: string): Frequencia[] {
    return this.frequencias
      .porTurma(turmaId)
      .filter(
        (chamada) =>
          !periodoLetivoId ||
          !chamada.periodoLetivoId ||
          chamada.periodoLetivoId === periodoLetivoId,
      );
  }
}
