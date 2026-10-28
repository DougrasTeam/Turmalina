import {
  PADRAO_HORARIO_INICIAL,
  calcularFimPeriodo,
  montarGradeAPartirDoPadrao,
  validarPadraoHorario,
} from './padrao-horario.model';

describe('padrao-horario.model', () => {
  it('gera a estrutura da manhã com a pausa depois da aula configurada', () => {
    const grade = montarGradeAPartirDoPadrao(
      'turma-1',
      PADRAO_HORARIO_INICIAL,
      'manha',
    );

    expect(grade.inicio).toBe('07:30');
    expect(grade.minutosPorAula).toBe(50);
    expect(grade.aulas).toEqual([]);
    expect(grade.linhas.map((linha) => linha.tipo)).toEqual([
      'aula',
      'aula',
      'aula',
      'intervalo',
      'aula',
      'aula',
    ]);
    expect(grade.linhas[3].duracaoMinutos).toBe(15);
    expect(
      calcularFimPeriodo('07:30', 5, 50, 15, 3),
    ).toBe('11:55');
  });

  it('gera a estrutura da tarde usando o horário da tarde', () => {
    const grade = montarGradeAPartirDoPadrao(
      'turma-1',
      PADRAO_HORARIO_INICIAL,
      'tarde',
    );

    expect(grade.inicio).toBe('13:00');
    expect(grade.linhas.length).toBe(6);
    expect(grade.linhas[0].tipo).toBe('aula');
    expect(grade.linhas[3].tipo).toBe('intervalo');
  });

  it('inclui o almoço ao montar o turno integral', () => {
    const grade = montarGradeAPartirDoPadrao(
      'turma-1',
      PADRAO_HORARIO_INICIAL,
      'integral',
    );

    expect(grade.inicio).toBe('07:30');
    expect(grade.linhas.length).toBe(13);
    expect(grade.linhas[6].tipo).toBe('intervalo');
    expect(grade.linhas[6].rotulo).toBe('Almoço');
    expect(grade.linhas[6].duracaoMinutos).toBe(65);
    expect(
      calcularFimPeriodo('13:00', 5, 50, 15, 3),
    ).toBe('17:25');
  });

  it('não cria estrutura para turnos sem padrão', () => {
    const grade = montarGradeAPartirDoPadrao(
      'turma-1',
      PADRAO_HORARIO_INICIAL,
      'noite',
    );

    expect(grade.linhas).toEqual([]);
    expect(grade.inicio).toBe('08:00');
  });

  it('rejeita uma tarde que começa antes do fim da manhã', () => {
    const erros = validarPadraoHorario({
      ...PADRAO_HORARIO_INICIAL,
      inicioTarde: '11:00',
    });

    expect(erros).toContain(
      'O início da tarde deve ser igual ou posterior ao fim da manhã.',
    );
  });
});
