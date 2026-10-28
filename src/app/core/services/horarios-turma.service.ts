import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import { AuditoriaService } from './auditoria.service';
import { ProfessoresService } from './professores.service';
import { TurmasService } from './turmas.service';
import { VinculosDocentesService } from './vinculos-docentes.service';
import {
  AulaGrade,
  DadosGradeHoraria,
  DiaAula,
  GradeHorariaTurma,
  diaAulaDaData,
  formatarHorario,
  minutosDeHorario,
  nomeDiaAula,
  normalizarHorario,
  validarGradeHoraria,
} from '../models/horario-turma.model';

export interface AulaPrevista {
  inicio: string;
  fim: string;
  disciplinaId: string;
  quantidadeAulas: number;
}

interface IntervaloAula {
  aula: AulaGrade;
  inicio: number;
  fim: number;
}

interface OcupacaoProfessor {
  turmaId: string;
  diaSemana: DiaAula;
  inicio: number;
  fim: number;
}

interface ConflitoProfessor {
  chave: string;
  mensagem: string;
}

@Injectable({ providedIn: 'root' })
export class HorariosTurmaService {
  private readonly repo: Repository<GradeHorariaTurma> =
    inject(RepositoryFactory).create<GradeHorariaTurma>('turmalina.grades-horarias', () => ({
      turmaId: '',
      inicio: '08:00',
      minutosPorAula: 50,
      linhas: [],
      aulas: [],
    }));
  private readonly auditoria = inject(AuditoriaService);
  private readonly turmas = inject(TurmasService);
  private readonly professores = inject(ProfessoresService);
  private readonly vinculos = inject(VinculosDocentesService);

  private readonly _grades = signal<GradeHorariaTurma[]>([]);
  private carregado = false;

  readonly grades = this._grades.asReadonly();
  readonly total = computed(() => this._grades().length);

  async load(): Promise<void> {
    if (this.carregado) return;
    const grades = await this.repo.list();
    this._grades.set(grades.map((grade) => this.normalizarGrade(grade)));
    this.carregado = true;
  }

  porTurma(turmaId: string): GradeHorariaTurma | undefined {
    return this._grades().find((grade) => grade.turmaId === turmaId);
  }

  aulasParaData(turmaId: string, data: string): AulaPrevista[] {
    const diaSemana = diaAulaDaData(data);
    const grade = this.porTurma(turmaId);
    if (!diaSemana || !grade) return [];

    let inicioDaLinha = minutosDeHorario(grade.inicio) ?? 0;
    const inicioPorLinha = new Map<string, number>();
    const fimPorLinha = new Map<string, number>();
    for (const linha of grade.linhas) {
      const duracao =
        linha.tipo === 'aula' ? grade.minutosPorAula : (linha.duracaoMinutos ?? 0);
      inicioPorLinha.set(linha.id, inicioDaLinha);
      inicioDaLinha += duracao;
      fimPorLinha.set(linha.id, inicioDaLinha);
    }

    return grade.aulas
      .filter((aula) => aula.diaSemana === diaSemana)
      .map((aula) => {
        const indiceInicio = grade.linhas.findIndex((linha) => linha.id === aula.linhaInicioId);
        if (indiceInicio < 0) return null;
        const ultimaLinha = grade.linhas[indiceInicio + aula.quantidadeAulas - 1];
        return {
          inicio: formatarHorario(inicioPorLinha.get(aula.linhaInicioId) ?? 0),
          fim: formatarHorario(fimPorLinha.get(ultimaLinha?.id ?? '') ?? 0),
          disciplinaId: aula.disciplinaId,
          quantidadeAulas: aula.quantidadeAulas,
        };
      })
      .filter((aula): aula is AulaPrevista => aula !== null)
      .sort((primeira, segunda) => primeira.inicio.localeCompare(segunda.inicio));
  }

  /**
   * Nomes dos professores que lecionam a disciplina na turma.
   *
   * Usa os vínculos docentes da turma e, quando não houver vínculo específico,
   * os professores da turma habilitados na disciplina. A ordenação alfabética
   * mantém a exibição estável quando mais de um professor atende a mesma
   * disciplina.
   */
  nomesProfessoresDaDisciplina(turmaId: string, disciplinaId: string): string[] {
    return this.professoresDaDisciplina(turmaId, disciplinaId)
      .map((professorId) => this.professores.porId(professorId)?.nome)
      .filter((nome): nome is string => Boolean(nome))
      .sort((nomeA, nomeB) =>
        nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' }),
      );
  }

  private async carregarDadosParaConflitos(): Promise<void> {
    await Promise.all([
      this.load(),
      this.turmas.load(),
      this.professores.load(),
      this.vinculos.load(),
    ]);
  }

  private conflitosDaGrade(gradeCandidata: DadosGradeHoraria): ConflitoProfessor[] {
    if (gradeCandidata.aulas.length === 0) return [];

    const ocupacoesPorProfessor = new Map<string, OcupacaoProfessor[]>();
    for (const outraGrade of this._grades()) {
      if (outraGrade.turmaId === gradeCandidata.turmaId) continue;

      for (const intervalo of this.intervalosDaGrade(outraGrade)) {
        const professores = this.professoresDaDisciplina(
          outraGrade.turmaId,
          intervalo.aula.disciplinaId,
        );
        for (const professorId of professores) {
          const ocupacoes = ocupacoesPorProfessor.get(professorId) ?? [];
          ocupacoes.push({
            turmaId: outraGrade.turmaId,
            diaSemana: intervalo.aula.diaSemana,
            inicio: intervalo.inicio,
            fim: intervalo.fim,
          });
          ocupacoesPorProfessor.set(professorId, ocupacoes);
        }
      }
    }

    if (ocupacoesPorProfessor.size === 0) return [];

    const conflitos = new Map<string, ConflitoProfessor>();
    for (const intervalo of this.intervalosDaGrade(gradeCandidata)) {
      const professores = this.professoresDaDisciplina(
        gradeCandidata.turmaId,
        intervalo.aula.disciplinaId,
      );
      for (const professorId of professores) {
        const ocupacoes = ocupacoesPorProfessor.get(professorId) ?? [];
        for (const ocupacao of ocupacoes) {
          const temSobreposicao =
            ocupacao.diaSemana === intervalo.aula.diaSemana &&
            intervalo.inicio < ocupacao.fim &&
            intervalo.fim > ocupacao.inicio;
          if (!temSobreposicao) continue;

          const chave = this.chaveConflitoProfessor(professorId, ocupacao);
          if (conflitos.has(chave)) continue;

          conflitos.set(chave, {
            chave,
            mensagem: this.mensagemConflitoProfessor(professorId, ocupacao),
          });
        }
      }
    }

    return [...conflitos.values()];
  }

  private chaveConflitoProfessor(
    professorId: string,
    ocupacao: OcupacaoProfessor,
  ): string {
    return [
      professorId,
      ocupacao.turmaId,
      ocupacao.diaSemana,
      ocupacao.inicio,
      ocupacao.fim,
    ].join('|');
  }

  private intervalosDaGrade(grade: DadosGradeHoraria): IntervaloAula[] {
    const inicioDaGrade = minutosDeHorario(grade.inicio);
    if (inicioDaGrade === null) return [];

    const inicioPorLinha = new Map<string, number>();
    const fimPorLinha = new Map<string, number>();
    let inicioAtual = inicioDaGrade;
    for (const linha of grade.linhas) {
      const duracao =
        linha.tipo === 'aula' ? grade.minutosPorAula : (linha.duracaoMinutos ?? 0);
      inicioPorLinha.set(linha.id, inicioAtual);
      inicioAtual += duracao;
      fimPorLinha.set(linha.id, inicioAtual);
    }

    const intervalos: IntervaloAula[] = [];
    for (const aula of grade.aulas) {
      const indiceInicio = grade.linhas.findIndex((linha) => linha.id === aula.linhaInicioId);
      if (indiceInicio < 0) continue;

      const ultimaLinha = grade.linhas[indiceInicio + aula.quantidadeAulas - 1];
      const inicio = inicioPorLinha.get(aula.linhaInicioId);
      const fim = fimPorLinha.get(ultimaLinha?.id ?? '');
      if (inicio === undefined || fim === undefined) continue;

      intervalos.push({ aula, inicio, fim });
    }
    return intervalos;
  }

  private professoresDaDisciplina(turmaId: string, disciplinaId: string): string[] {
    const vinculados = this.vinculos
      .vinculos()
      .filter(
        (vinculo) =>
          vinculo.ativo &&
          vinculo.turmaId === turmaId &&
          vinculo.disciplinaId === disciplinaId &&
          this.professores.porId(vinculo.professorId)?.ativo !== false,
      )
      .map((vinculo) => vinculo.professorId);

    if (vinculados.length > 0) return [...new Set(vinculados)];

    const turma = this.turmas.porId(turmaId);
    if (!turma) return [];

    return [
      ...new Set(
        turma.professorIds.filter((professorId) => {
          const professor = this.professores.porId(professorId);
          return Boolean(professor?.ativo && professor.disciplinas.includes(disciplinaId));
        }),
      ),
    ];
  }

  private mensagemConflitoProfessor(
    professorId: string,
    conflito: OcupacaoProfessor,
  ): string {
    const professor = this.professores.porId(professorId)?.nome ?? 'O professor';
    const turma = this.turmas.porId(conflito.turmaId)?.nome ?? 'outra turma';
    const dia = nomeDiaAula(conflito.diaSemana).toLocaleLowerCase('pt-BR');
    return (
      `Choque de horário: ${professor} já tem aula na turma ${turma} ` +
      `${dia}, das ${formatarHorario(conflito.inicio)} às ${formatarHorario(conflito.fim)}.`
    );
  }

  async salvar(dados: DadosGradeHoraria, disciplinasOfertadas: ReadonlySet<string>): Promise<GradeHorariaTurma> {
    const dadosNormalizados: DadosGradeHoraria = {
      ...dados,
      inicio: normalizarHorario(dados.inicio),
    };
    const erros = validarGradeHoraria(dadosNormalizados, disciplinasOfertadas);
    if (erros.length) throw new Error(erros[0]);

    await this.carregarDadosParaConflitos();
    const gradeExistente = this.porTurma(dadosNormalizados.turmaId);

    const conflitosAtuais = gradeExistente
      ? this.conflitosDaGrade(gradeExistente)
      : [];
    const chavesAtuais = new Set(
      conflitosAtuais.map((conflito) => conflito.chave),
    );
    const conflitosCandidatos = this.conflitosDaGrade(dadosNormalizados);
    const novoConflito = conflitosCandidatos.find(
      (conflito) => !chavesAtuais.has(conflito.chave),
    );
    if (novoConflito) throw new Error(novoConflito.mensagem);

    const gradeSalva = gradeExistente
      ? await this.repo.update(gradeExistente.id, dadosNormalizados)
      : await this.repo.create(dadosNormalizados);
    const gradeNormalizada = this.normalizarGrade(gradeSalva);
    this._grades.update((grades) => {
      const semGradeAtual = grades.filter((grade) => grade.turmaId !== dadosNormalizados.turmaId);
      return [...semGradeAtual, gradeNormalizada];
    });
    this.auditoria.registrar(
      gradeExistente ? 'grade-horaria.atualizada' : 'grade-horaria.criada',
      'GradeHorariaTurma',
      gradeSalva.id,
      dadosNormalizados.turmaId,
    );
    return gradeNormalizada;
  }

  async removerTodas(): Promise<void> {
    await this.repo.removeAll();
    this._grades.set([]);
    this.auditoria.registrar('grade-horaria.removida-todas', 'GradeHorariaTurma', null, null);
  }

  private normalizarGrade(grade: GradeHorariaTurma): GradeHorariaTurma {
    return { ...grade, inicio: normalizarHorario(grade.inicio) };
  }

  async removerAtribuicoesDeDisciplinas(disciplinaIds: readonly string[]): Promise<void> {
    await this.load();
    const disciplinasRemovidas = new Set(disciplinaIds);
    if (disciplinasRemovidas.size === 0) return;

    const gradesAtualizadas: GradeHorariaTurma[] = [];
    for (const grade of this._grades()) {
      const aulas = grade.aulas.filter((aula) => !disciplinasRemovidas.has(aula.disciplinaId));
      if (aulas.length === grade.aulas.length) {
        gradesAtualizadas.push(grade);
        continue;
      }
      gradesAtualizadas.push(this.normalizarGrade(await this.repo.update(grade.id, { aulas })));
      this.auditoria.registrar(
        'grade-horaria.disciplina-removida',
        'GradeHorariaTurma',
        grade.id,
        grade.turmaId,
      );
    }
    this._grades.set(gradesAtualizadas);
  }
}
