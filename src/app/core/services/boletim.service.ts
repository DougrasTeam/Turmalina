import { Injectable, inject } from '@angular/core';

import { AlunosService } from './alunos.service';
import { AvaliacoesService } from './avaliacoes.service';
import { DisciplinasService } from './disciplinas.service';
import { FrequenciasService } from './frequencias.service';
import { InstituicaoService } from './instituicao.service';
import { PeriodosLetivosService } from './periodos-letivos.service';
import { TurmasService } from './turmas.service';
import { Avaliacao, calcularMediaAluno } from '../models/avaliacao.model';
import { Boletim, BoletimDisciplina, calcularSituacao } from '../models/boletim.model';
import { Frequencia, calcularResumoFrequencia } from '../models/frequencia.model';

@Injectable({ providedIn: 'root' })
export class BoletimService {
  private readonly alunos = inject(AlunosService);
  private readonly turmas = inject(TurmasService);
  private readonly disciplinas = inject(DisciplinasService);
  private readonly periodos = inject(PeriodosLetivosService);
  private readonly avaliacoes = inject(AvaliacoesService);
  private readonly frequencias = inject(FrequenciasService);
  private readonly instituicao = inject(InstituicaoService);

  gerar(alunoId: string, periodoLetivoId: string): Boletim | null {
    const aluno = this.alunos.alunos().find((item) => item.id === alunoId);
    if (!aluno) return null;

    const turma = this.turmas.porId(aluno.turmaId);
    const periodo = this.periodos.porId(periodoLetivoId);
    const casas = this.instituicao.casasDecimaisNota();
    const mediaMinima = this.instituicao.mediaMinima();
    const frequenciaMinima = this.instituicao.frequenciaMinima();
    const abonaJustificada = this.instituicao.faltaJustificadaAbona();

    const avaliacoesPeriodo = turma ? this.avaliacoes.porTurmaEPeriodo(turma.id, periodoLetivoId) : [];
    const chamadas = turma ? this.chamadasDoPeriodo(turma.id, periodoLetivoId) : [];

    const disciplinas: BoletimDisciplina[] = this.disciplinas
      .porIds(turma?.disciplinaIds ?? [])
      .map((disciplina) => {
        const avaliacoesDisciplina = avaliacoesPeriodo.filter(
          (avaliacao) => avaliacao.disciplinaId === disciplina.id,
        );
        const media = calcularMediaAluno(avaliacoesDisciplina, alunoId, casas).valor;

        const chamadasDisciplina = chamadas.filter(
          (chamada) => !chamada.disciplinaId || chamada.disciplinaId === disciplina.id,
        );
        const resumo = this.resumoFrequencia(chamadasDisciplina, alunoId, abonaJustificada);
        const situacao = calcularSituacao(media, resumo.percentual, mediaMinima, frequenciaMinima);

        return {
          disciplinaId: disciplina.id,
          disciplinaNome: disciplina.nome,
          media,
          frequencia: resumo.percentual,
          situacao: situacao.situacao,
          motivo: situacao.motivo,
          avaliacoes: avaliacoesDisciplina.length,
          notasLancadas: this.notasLancadas(avaliacoesDisciplina, alunoId),
          registrosFrequencia: resumo.total,
        };
      });

    const mediaGeral = calcularMediaAluno(avaliacoesPeriodo, alunoId, casas).valor;
    const resumoGeral = this.resumoFrequencia(chamadas, alunoId, abonaJustificada);
    const situacaoGeral = calcularSituacao(mediaGeral, resumoGeral.percentual, mediaMinima, frequenciaMinima);

    return {
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      alunoMatricula: aluno.matricula,
      turmaId: turma?.id ?? '',
      turmaNome: turma?.nome ?? '—',
      periodoLetivoId,
      periodoNome: periodo?.nome ?? '—',
      instituicaoNome: this.instituicao.instituicao()?.nome ?? 'Instituição',
      frequenciaMinima,
      mediaMinima,
      emitidoEm: new Date().toISOString(),
      disciplinas,
      mediaGeral,
      frequenciaGeral: resumoGeral.percentual,
      situacao: situacaoGeral.situacao,
      motivo: situacaoGeral.motivo,
    };
  }

  gerarPorTurma(turmaId: string, periodoLetivoId: string): Boletim[] {
    return this.alunos
      .porTurma(turmaId)
      .map((aluno) => this.gerar(aluno.id, periodoLetivoId))
      .filter((boletim): boletim is Boletim => boletim !== null);
  }

  private chamadasDoPeriodo(turmaId: string, periodoLetivoId: string): Frequencia[] {
    return this.frequencias
      .porTurma(turmaId)
      .filter(
        (chamada) => !periodoLetivoId || !chamada.periodoLetivoId || chamada.periodoLetivoId === periodoLetivoId,
      );
  }

  private resumoFrequencia(chamadas: readonly Frequencia[], alunoId: string, abonaJustificada: boolean) {
    const registros = chamadas.flatMap((chamada) =>
      chamada.registros.filter((registro) => registro.alunoId === alunoId),
    );
    return calcularResumoFrequencia(registros, abonaJustificada);
  }

  private notasLancadas(avaliacoes: readonly Avaliacao[], alunoId: string): number {
    return avaliacoes.reduce(
      (total, avaliacao) =>
        total + avaliacao.notas.filter((nota) => nota.alunoId === alunoId && nota.valor !== null).length,
      0,
    );
  }
}
