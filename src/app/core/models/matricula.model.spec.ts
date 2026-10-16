import { validarMatricula } from './matricula.model';

describe('Matricula model', () => {
  it('não permite matrícula ativa duplicada no mesmo contexto', () => {
    const existentes = [
      {
        id: 'm1',
        institutionId: 'instituicao-padrao',
        alunoId: 'a1',
        turmaId: 't1',
        periodoLetivoId: 'p1',
        status: 'ativa' as const,
        inicioEm: '2026-01-01',
        fimEm: null,
        motivoSaida: null,
        criadoEm: '',
        atualizadoEm: '',
      },
    ];
    const erros = validarMatricula({ alunoId: 'a1', turmaId: 't1' }, existentes);
    expect(erros).toContain('O aluno já possui matrícula ativa nesta turma.');
  });

  it('permite matrículas em turmas diferentes', () => {
    const existentes = [
      {
        id: 'm1',
        institutionId: 'instituicao-padrao',
        alunoId: 'a1',
        turmaId: 't1',
        periodoLetivoId: 'p1',
        status: 'ativa' as const,
        inicioEm: '2026-01-01',
        fimEm: null,
        motivoSaida: null,
        criadoEm: '',
        atualizadoEm: '',
      },
    ];
    const erros = validarMatricula({ alunoId: 'a1', turmaId: 't2' }, existentes);
    expect(erros).toEqual([]);
  });

  it('exige aluno e turma', () => {
    const erros = validarMatricula({ alunoId: '', turmaId: '' }, []);
    expect(erros).toContain('Selecione o aluno.');
    expect(erros).toContain('Selecione a turma.');
  });
});
