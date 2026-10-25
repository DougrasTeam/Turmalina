import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import { AuditoriaService } from './auditoria.service';
import {
  DadosGradeHoraria,
  GradeHorariaTurma,
  diaAulaDaData,
  formatarHorario,
  minutosDeHorario,
  normalizarHorario,
  validarGradeHoraria,
} from '../models/horario-turma.model';

export interface AulaPrevista {
  inicio: string;
  fim: string;
  disciplinaId: string;
  quantidadeAulas: number;
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

  async salvar(dados: DadosGradeHoraria, disciplinasOfertadas: ReadonlySet<string>): Promise<GradeHorariaTurma> {
    const dadosNormalizados: DadosGradeHoraria = {
      ...dados,
      inicio: normalizarHorario(dados.inicio),
    };
    const erros = validarGradeHoraria(dadosNormalizados, disciplinasOfertadas);
    if (erros.length) throw new Error(erros[0]);

    const gradeExistente = this.porTurma(dadosNormalizados.turmaId);
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
