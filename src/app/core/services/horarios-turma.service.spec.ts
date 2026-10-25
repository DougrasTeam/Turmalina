import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { DadosGradeHoraria, criarLinhaAula, criarLinhaIntervalo, gradeVazia } from '../models/horario-turma.model';
import { HorariosTurmaService } from './horarios-turma.service';

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
