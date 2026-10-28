import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { DadosGradeHoraria, criarLinhaAula, criarLinhaIntervalo, gradeVazia } from '../models/horario-turma.model';
import { HorariosTurmaService } from './horarios-turma.service';
import { ProfessoresService } from './professores.service';
import { TurmasService } from './turmas.service';
import { VinculosDocentesService } from './vinculos-docentes.service';

function gradeComLinhas(turmaId: string): DadosGradeHoraria {
  const grade = gradeVazia(turmaId);
  const primeiraAula = criarLinhaAula();
  const segundaAula = criarLinhaAula();
  const intervalo = criarLinhaIntervalo();
  const ultimaAula = criarLinhaAula();

  return {
    ...grade,
    linhas: [primeiraAula, segundaAula, intervalo, ultimaAula],
  };
}

describe('HorariosTurmaService', () => {
  let service: HorariosTurmaService;

  beforeEach(() => {
    localStorage.removeItem('turmalina.grades-horarias');
    localStorage.removeItem('turmalina.auditoria');
    localStorage.removeItem('turmalina.turmas');
    localStorage.removeItem('turmalina.professores');
    localStorage.removeItem('turmalina.vinculos-docentes');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });
    service = TestBed.inject(HorariosTurmaService);
  });

  it('persists one weekly grid per class', async () => {
    await service.load();
    const grade = gradeComLinhas('turma-1');
    grade.aulas = [
      {
        diaSemana: 'segunda',
        linhaInicioId: grade.linhas[0].id,
        quantidadeAulas: 2,
        disciplinaId: 'matematica',
      },
    ];

    const criada = await service.salvar(grade, new Set(['matematica']));
    const gradeAtualizada = await service.salvar(
      { ...criada, inicio: '07:30' },
      new Set(['matematica']),
    );

    expect(service.total()).toBe(1);
    expect(gradeAtualizada.inicio).toBe('07:30');
    expect(service.porTurma('turma-1')?.aulas[0].quantidadeAulas).toBe(2);
  });

  it('returns the planned lessons and calculated end time for a date', async () => {
    await service.load();
    const grade = gradeComLinhas('turma-1');
    grade.aulas = [
      {
        diaSemana: 'segunda',
        linhaInicioId: grade.linhas[0].id,
        quantidadeAulas: 2,
        disciplinaId: 'matematica',
      },
      {
        diaSemana: 'segunda',
        linhaInicioId: grade.linhas[3].id,
        quantidadeAulas: 1,
        disciplinaId: 'portugues',
      },
    ];
    await service.salvar(grade, new Set(['matematica', 'portugues']));

    expect(service.aulasParaData('turma-1', '2026-10-26')).toEqual([
      {
        inicio: '08:00',
        fim: '09:40',
        disciplinaId: 'matematica',
        quantidadeAulas: 2,
      },
      {
        inicio: '09:55',
        fim: '10:45',
        disciplinaId: 'portugues',
        quantidadeAulas: 1,
      },
    ]);
    expect(service.aulasParaData('turma-1', '2026-10-27')).toEqual([]);
  });

  it('rejects overlapping assignments on the same weekday', async () => {
    await service.load();
    const grade = gradeComLinhas('turma-1');
    grade.aulas = [
      {
        diaSemana: 'segunda',
        linhaInicioId: grade.linhas[0].id,
        quantidadeAulas: 2,
        disciplinaId: 'matematica',
      },
      {
        diaSemana: 'segunda',
        linhaInicioId: grade.linhas[1].id,
        quantidadeAulas: 1,
        disciplinaId: 'portugues',
      },
    ];

    await expectAsync(service.salvar(grade, new Set(['matematica', 'portugues']))).toBeRejectedWithError(
      'Há duas disciplinas ocupando a mesma aula no mesmo dia.',
    );
  });

  it('rejects a lesson when the teacher is already in another class at that time', async () => {
    await service.load();
    const turmas = TestBed.inject(TurmasService);
    const professores = TestBed.inject(ProfessoresService);
    const vinculos = TestBed.inject(VinculosDocentesService);
    await Promise.all([turmas.load(), professores.load(), vinculos.load()]);

    const professor = await professores.create({
      nome: 'Ana Souza',
      disciplinas: ['matematica'],
    });
    const turmaA = await turmas.create({ nome: 'Turma A', codigo: 'A' });
    const turmaB = await turmas.create({ nome: 'Turma B', codigo: 'B' });
    await vinculos.criar({
      turmaId: turmaA.id,
      disciplinaId: 'matematica',
      professorId: professor.id,
    });
    await vinculos.criar({
      turmaId: turmaB.id,
      disciplinaId: 'matematica',
      professorId: professor.id,
    });

    const gradeB = gradeComLinhas(turmaB.id);
    gradeB.aulas = [
      {
        diaSemana: 'segunda',
        linhaInicioId: gradeB.linhas[0].id,
        quantidadeAulas: 1,
        disciplinaId: 'matematica',
      },
    ];
    await service.salvar(gradeB, new Set(['matematica']));

    const gradeA = gradeComLinhas(turmaA.id);
    gradeA.aulas = [
      {
        diaSemana: 'segunda',
        linhaInicioId: gradeA.linhas[0].id,
        quantidadeAulas: 1,
        disciplinaId: 'matematica',
      },
    ];

    await expectAsync(service.salvar(gradeA, new Set(['matematica']))).toBeRejectedWithError(
      /Choque de horário: Ana Souza já tem aula na turma Turma B segunda-feira/,
    );
    expect(service.porTurma(turmaA.id)).toBeUndefined();
  });

  it('allows removing a lesson even when another saved lesson has a teacher conflict', async () => {
    await service.load();
    const turmas = TestBed.inject(TurmasService);
    const professores = TestBed.inject(ProfessoresService);
    const vinculos = TestBed.inject(VinculosDocentesService);
    await Promise.all([turmas.load(), professores.load(), vinculos.load()]);

    const professor = await professores.create({
      nome: 'Laís Cândido dos Santos Emiliano',
      disciplinas: ['matematica'],
    });
    const turmaA = await turmas.create({ nome: 'Turma A', codigo: 'A' });
    const turmaB = await turmas.create({ nome: 'Turma B', codigo: 'B' });

    const gradeA = gradeComLinhas(turmaA.id);
    gradeA.aulas = [
      {
        diaSemana: 'segunda',
        linhaInicioId: gradeA.linhas[0].id,
        quantidadeAulas: 1,
        disciplinaId: 'matematica',
      },
      {
        diaSemana: 'segunda',
        linhaInicioId: gradeA.linhas[3].id,
        quantidadeAulas: 1,
        disciplinaId: 'portugues',
      },
    ];
    const gradeB = gradeComLinhas(turmaB.id);
    gradeB.aulas = [
      {
        diaSemana: 'segunda',
        linhaInicioId: gradeB.linhas[0].id,
        quantidadeAulas: 1,
        disciplinaId: 'matematica',
      },
    ];
    await service.salvar(gradeA, new Set(['matematica', 'portugues']));
    await service.salvar(gradeB, new Set(['matematica']));

    await vinculos.criar({
      turmaId: turmaA.id,
      disciplinaId: 'matematica',
      professorId: professor.id,
    });
    await vinculos.criar({
      turmaId: turmaB.id,
      disciplinaId: 'matematica',
      professorId: professor.id,
    });

    const aulaMantida = gradeA.aulas[0];
    const gradeSemPortugues: DadosGradeHoraria = {
      ...gradeA,
      aulas: [aulaMantida],
    };

    await expectAsync(
      service.salvar(gradeSemPortugues, new Set(['matematica', 'portugues'])),
    ).toBeResolved();
    expect(service.porTurma(turmaA.id)?.aulas).toEqual([aulaMantida]);
  });

  it('still blocks a new teacher conflict when another conflict already exists', async () => {
    await service.load();
    const turmas = TestBed.inject(TurmasService);
    const professores = TestBed.inject(ProfessoresService);
    const vinculos = TestBed.inject(VinculosDocentesService);
    await Promise.all([turmas.load(), professores.load(), vinculos.load()]);

    const professor = await professores.create({
      nome: 'Ana Souza',
      disciplinas: ['matematica'],
    });
    const turmaA = await turmas.create({ nome: 'Turma A', codigo: 'A' });
    const turmaB = await turmas.create({ nome: 'Turma B', codigo: 'B' });

    const gradeA = gradeComLinhas(turmaA.id);
    gradeA.aulas = [
      {
        diaSemana: 'segunda',
        linhaInicioId: gradeA.linhas[0].id,
        quantidadeAulas: 1,
        disciplinaId: 'matematica',
      },
      {
        diaSemana: 'segunda',
        linhaInicioId: gradeA.linhas[3].id,
        quantidadeAulas: 1,
        disciplinaId: 'portugues',
      },
    ];
    const gradeB = gradeComLinhas(turmaB.id);
    gradeB.aulas = [
      {
        diaSemana: 'segunda',
        linhaInicioId: gradeB.linhas[0].id,
        quantidadeAulas: 1,
        disciplinaId: 'matematica',
      },
      {
        diaSemana: 'segunda',
        linhaInicioId: gradeB.linhas[1].id,
        quantidadeAulas: 1,
        disciplinaId: 'matematica',
      },
    ];
    await service.salvar(gradeA, new Set(['matematica', 'portugues']));
    await service.salvar(gradeB, new Set(['matematica']));

    await vinculos.criar({
      turmaId: turmaA.id,
      disciplinaId: 'matematica',
      professorId: professor.id,
    });
    await vinculos.criar({
      turmaId: turmaB.id,
      disciplinaId: 'matematica',
      professorId: professor.id,
    });

    const gradeComNovoChoque: DadosGradeHoraria = {
      ...gradeA,
      aulas: [
        gradeA.aulas[0],
        {
          diaSemana: 'segunda',
          linhaInicioId: gradeA.linhas[1].id,
          quantidadeAulas: 1,
          disciplinaId: 'matematica',
        },
      ],
    };

    await expectAsync(
      service.salvar(gradeComNovoChoque, new Set(['matematica', 'portugues'])),
    ).toBeRejectedWithError(/Choque de horário: Ana Souza já tem aula na turma Turma B/);
  });

  it('allows the same teacher in another class at a different time', async () => {
    await service.load();
    const turmas = TestBed.inject(TurmasService);
    const professores = TestBed.inject(ProfessoresService);
    const vinculos = TestBed.inject(VinculosDocentesService);
    await Promise.all([turmas.load(), professores.load(), vinculos.load()]);

    const professor = await professores.create({
      nome: 'Ana Souza',
      disciplinas: ['matematica'],
    });
    const turmaA = await turmas.create({ nome: 'Turma A', codigo: 'A' });
    const turmaB = await turmas.create({ nome: 'Turma B', codigo: 'B' });
    await vinculos.criar({
      turmaId: turmaA.id,
      disciplinaId: 'matematica',
      professorId: professor.id,
    });
    await vinculos.criar({
      turmaId: turmaB.id,
      disciplinaId: 'matematica',
      professorId: professor.id,
    });

    const gradeB = gradeComLinhas(turmaB.id);
    gradeB.aulas = [
      {
        diaSemana: 'segunda',
        linhaInicioId: gradeB.linhas[0].id,
        quantidadeAulas: 1,
        disciplinaId: 'matematica',
      },
    ];
    await service.salvar(gradeB, new Set(['matematica']));

    const gradeA = gradeComLinhas(turmaA.id);
    gradeA.aulas = [
      {
        diaSemana: 'segunda',
        linhaInicioId: gradeA.linhas[1].id,
        quantidadeAulas: 1,
        disciplinaId: 'matematica',
      },
    ];

    await expectAsync(service.salvar(gradeA, new Set(['matematica']))).toBeResolved();
  });

  it('removes only the assignments for a deleted discipline', async () => {
    await service.load();
    const grade = gradeComLinhas('turma-1');
    grade.aulas = [
      {
        diaSemana: 'segunda',
        linhaInicioId: grade.linhas[0].id,
        quantidadeAulas: 1,
        disciplinaId: 'matematica',
      },
      {
        diaSemana: 'terca',
        linhaInicioId: grade.linhas[1].id,
        quantidadeAulas: 1,
        disciplinaId: 'portugues',
      },
    ];
    await service.salvar(grade, new Set(['matematica', 'portugues']));

    await service.removerAtribuicoesDeDisciplinas(['matematica']);

    expect(service.porTurma('turma-1')?.aulas.map((aula) => aula.disciplinaId)).toEqual([
      'portugues',
    ]);
  });
});
