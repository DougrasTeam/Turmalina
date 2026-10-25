import {
  AulaGrade,
  DadosGradeHoraria,
  calcularAulasSemanais,
  calcularSemanasLetivas,
  criarLinhaAula,
  criarLinhaIntervalo,
  diaAulaDaData,
  formatarHorario,
  garantirAulasPorDia,
  gerarAulasAutomaticas,
  minutosDeHorario,
  moverAulaNaGrade,
  normalizarHorario,
  validarGradeHoraria,
} from './horario-turma.model';
import { Disciplina } from './disciplina.model';

function criarDisciplina(
  id: string,
  cargaHoraria: number,
  ativa = true,
): Disciplina {
  return {
    id,
    institutionId: 'escola-1',
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: '2026-01-01T00:00:00.000Z',
    nome: id,
    codigo: id.toUpperCase(),
    cargaHoraria,
    cor: '#2563eb',
    ativa,
  };
}

describe('horario-turma.model', () => {
  it('maps dates to weekdays and formats times', () => {
    expect(diaAulaDaData('2026-10-26')).toBe('segunda');
    expect(diaAulaDaData('2026-10-31')).toBeNull();
    expect(diaAulaDaData('data-invalida')).toBeNull();
    expect(formatarHorario(8 * 60 + 50)).toBe('08:50');
  });

  it('accepts and normalizes times returned by PostgreSQL', () => {
    expect(minutosDeHorario('07:10')).toBe(7 * 60 + 10);
    expect(minutosDeHorario('07:10:00')).toBe(7 * 60 + 10);
    expect(minutosDeHorario('07:10:00.000')).toBe(7 * 60 + 10);
    expect(minutosDeHorario('24:00')).toBeNull();
    expect(normalizarHorario('07:10:00')).toBe('07:10');
    expect(normalizarHorario('07:10')).toBe('07:10');
    expect(normalizarHorario('horario-invalido')).toBe('horario-invalido');
  });

  it('validates a two-lesson block and an interval in the weekly grid', () => {
    const firstLesson = criarLinhaAula();
    const secondLesson = criarLinhaAula();
    const breakLine = criarLinhaIntervalo();
    const grade: DadosGradeHoraria = {
      turmaId: 'turma-1',
      inicio: '08:00',
      minutosPorAula: 50,
      linhas: [firstLesson, secondLesson, breakLine],
      aulas: [
        {
          diaSemana: 'segunda',
          linhaInicioId: firstLesson.id,
          quantidadeAulas: 2,
          disciplinaId: 'matematica',
        },
      ],
    };

    expect(validarGradeHoraria(grade, new Set(['matematica']))).toEqual([]);
  });

  it('rejects a lesson block crossing an interval', () => {
    const firstLesson = criarLinhaAula();
    const breakLine = criarLinhaIntervalo();
    const secondLesson = criarLinhaAula();
    const grade: DadosGradeHoraria = {
      turmaId: 'turma-1',
      inicio: '08:00',
      minutosPorAula: 50,
      linhas: [firstLesson, breakLine, secondLesson],
      aulas: [
        {
          diaSemana: 'segunda',
          linhaInicioId: firstLesson.id,
          quantidadeAulas: 2,
          disciplinaId: 'matematica',
        },
      ],
    };

    expect(validarGradeHoraria(grade, new Set(['matematica']))).toContain(
      'A sequência de aulas não pode ultrapassar uma linha de intervalo ou o fim da grade.',
    );
  });

  it('rejects two subjects in the same day and lesson period', () => {
    const lesson = criarLinhaAula();
    const firstSubject: AulaGrade = {
      diaSemana: 'segunda',
      linhaInicioId: lesson.id,
      quantidadeAulas: 1,
      disciplinaId: 'matematica',
    };
    const grade: DadosGradeHoraria = {
      turmaId: 'turma-1',
      inicio: '08:00',
      minutosPorAula: 50,
      linhas: [lesson],
      aulas: [firstSubject, { ...firstSubject, disciplinaId: 'portugues' }],
    };

    expect(validarGradeHoraria(grade, new Set(['matematica', 'portugues']))).toContain(
      'Há duas disciplinas ocupando a mesma aula no mesmo dia.',
    );
  });

  it('requires a discipline offered in the class and a valid lesson duration', () => {
    const lesson = criarLinhaAula();
    const grade: DadosGradeHoraria = {
      turmaId: 'turma-1',
      inicio: '08:00',
      minutosPorAula: 0,
      linhas: [lesson],
      aulas: [
        {
          diaSemana: 'segunda',
          linhaInicioId: lesson.id,
          quantidadeAulas: 1,
          disciplinaId: 'matematica',
        },
      ],
    };

    expect(validarGradeHoraria(grade, new Set())).toContain(
      'A duração de cada aula deve ser entre 1 e 240 minutos.',
    );
    expect(validarGradeHoraria(grade, new Set())).toContain(
      'Toda aula precisa usar uma disciplina ativa e ofertada na turma.',
    );
  });

  it('calculates weekly lessons from the workload and school weeks', () => {
    expect(calcularSemanasLetivas('2026-01-01', '2026-01-14')).toBe(2);
    expect(calcularSemanasLetivas('', '2026-01-14')).toBe(40);
    expect(calcularAulasSemanais(200, 50, 40)).toBe(6);
    expect(calcularAulasSemanais(150, 50, 40)).toBe(5);
    expect(calcularAulasSemanais(80, 50, 40)).toBe(2);
    expect(calcularAulasSemanais(0, 50, 40)).toBe(0);
  });

  it('adds lesson lines until the daily amount is reached', () => {
    const primeira = criarLinhaAula();
    const intervalo = criarLinhaIntervalo();
    const grade: DadosGradeHoraria = {
      turmaId: 'turma-1',
      inicio: '07:00',
      minutosPorAula: 50,
      linhas: [primeira, intervalo],
      aulas: [],
    };

    const gradeComDezAulas = garantirAulasPorDia(grade, 10);

    expect(
      gradeComDezAulas.linhas.filter((linha) => linha.tipo === 'aula').length,
    ).toBe(10);
    expect(gradeComDezAulas.linhas[0]).toBe(primeira);
    expect(gradeComDezAulas.linhas[1]).toBe(intervalo);
    expect(grade.linhas.length).toBe(2);
  });

  it('keeps a grade that already has enough daily lessons', () => {
    const grade: DadosGradeHoraria = {
      turmaId: 'turma-1',
      inicio: '07:00',
      minutosPorAula: 50,
      linhas: Array.from({ length: 10 }, () => criarLinhaAula()),
      aulas: [],
    };

    expect(garantirAulasPorDia(grade, 10)).toBe(grade);
  });

  it('distributes lessons without exceeding the daily limit', () => {
    const primeira = criarLinhaAula();
    const segunda = criarLinhaAula();
    const terceira = criarLinhaAula();
    const quarta = criarLinhaAula();
    const quinta = criarLinhaAula();
    const grade: DadosGradeHoraria = {
      turmaId: 'turma-1',
      inicio: '07:00',
      minutosPorAula: 50,
      linhas: [primeira, segunda, terceira, quarta, quinta],
      aulas: [],
    };
    const disciplinas = [
      criarDisciplina('matematica', 200),
      criarDisciplina('portugues', 100),
      criarDisciplina('ciencias', 80),
      criarDisciplina('inativa', 200, false),
    ];

    const aulas = gerarAulasAutomaticas(grade, disciplinas, 40, 3, () => 0);

    expect(aulas.length).toBe(11);
    expect(aulas.every((aula) => aula.quantidadeAulas === 1)).toBeTruthy();
    expect(aulas.some((aula) => aula.disciplinaId === 'inativa')).toBeFalsy();

    const chaves = new Set(aulas.map((aula) => `${aula.diaSemana}:${aula.linhaInicioId}`));
    expect(chaves.size).toBe(aulas.length);

    const linhasAula = new Set(grade.linhas.map((linha) => linha.id));
    expect(aulas.every((aula) => linhasAula.has(aula.linhaInicioId))).toBeTruthy();

    const aulasDeMatematicaPorDia = new Map<string, number>();
    for (const aula of aulas.filter((aula) => aula.disciplinaId === 'matematica')) {
      aulasDeMatematicaPorDia.set(
        aula.diaSemana,
        (aulasDeMatematicaPorDia.get(aula.diaSemana) ?? 0) + 1,
      );
    }
    expect(Math.max(...aulasDeMatematicaPorDia.values())).toBeLessThanOrEqual(3);
    expect(
      aulas.filter((aula) => aula.disciplinaId === 'matematica').length,
    ).toBe(6);
  });

  it('reduces the demand when it exceeds the available slots', () => {
    const primeira = criarLinhaAula();
    const grade: DadosGradeHoraria = {
      turmaId: 'turma-1',
      inicio: '07:00',
      minutosPorAula: 50,
      linhas: [primeira],
      aulas: [],
    };
    const disciplinas = [
      criarDisciplina('matematica', 400),
      criarDisciplina('portugues', 400),
    ];

    const aulas = gerarAulasAutomaticas(grade, disciplinas, 40, 3, () => 0);

    expect(aulas.length).toBeLessThanOrEqual(5);
    const chaves = new Set(aulas.map((aula) => `${aula.diaSemana}:${aula.linhaInicioId}`));
    expect(chaves.size).toBe(aulas.length);
  });

  it('moves a lesson between valid cells', () => {
    const primeira = criarLinhaAula();
    const segunda = criarLinhaAula();
    const grade: DadosGradeHoraria = {
      turmaId: 'turma-1',
      inicio: '07:00',
      minutosPorAula: 50,
      linhas: [primeira, segunda],
      aulas: [
        {
          diaSemana: 'segunda',
          linhaInicioId: primeira.id,
          quantidadeAulas: 1,
          disciplinaId: 'matematica',
        },
      ],
    };

    const resultado = moverAulaNaGrade(
      grade,
      { diaSemana: 'segunda', linhaInicioId: primeira.id },
      { diaSemana: 'terca', linhaInicioId: segunda.id },
    );

    expect(resultado.erro).toBeNull();
    expect(resultado.aulas).toEqual([
      {
        diaSemana: 'terca',
        linhaInicioId: segunda.id,
        quantidadeAulas: 1,
        disciplinaId: 'matematica',
      },
    ]);
  });

  it('rejects moves to intervals or occupied cells', () => {
    const primeira = criarLinhaAula();
    const intervalo = criarLinhaIntervalo();
    const segunda = criarLinhaAula();
    const grade: DadosGradeHoraria = {
      turmaId: 'turma-1',
      inicio: '07:00',
      minutosPorAula: 50,
      linhas: [primeira, intervalo, segunda],
      aulas: [
        {
          diaSemana: 'segunda',
          linhaInicioId: primeira.id,
          quantidadeAulas: 1,
          disciplinaId: 'matematica',
        },
        {
          diaSemana: 'terca',
          linhaInicioId: segunda.id,
          quantidadeAulas: 1,
          disciplinaId: 'portugues',
        },
      ],
    };

    const paraIntervalo = moverAulaNaGrade(
      grade,
      { diaSemana: 'segunda', linhaInicioId: primeira.id },
      { diaSemana: 'terca', linhaInicioId: intervalo.id },
    );
    expect(paraIntervalo.erro).toBe(
      'Só é possível soltar aulas em uma linha de aula.',
    );

    const paraOcupada = moverAulaNaGrade(
      grade,
      { diaSemana: 'segunda', linhaInicioId: primeira.id },
      { diaSemana: 'terca', linhaInicioId: segunda.id },
    );
    expect(paraOcupada.erro).toBe('O destino já está ocupado por outra aula.');
  });
});
