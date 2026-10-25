import {
  DadosFrequencia,
  Frequencia,
  RegistroPresenca,
  calcularResumoFrequencia,
  formatarPercentual,
  validarFrequencia,
} from './frequencia.model';

function registro(alunoId: string, status: RegistroPresenca['status']): RegistroPresenca {
  return { alunoId, status, justificativa: null };
}

function chamada(sobrescrever: Partial<Frequencia> = {}): Frequencia {
  return {
    id: 'chamada-1',
    institutionId: 'instituicao-padrao',
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: '2026-01-01T00:00:00.000Z',
    turmaId: 'turma-1',
    periodoLetivoId: 'periodo-1',
    disciplinaId: 'disc-1',
    data: '2026-03-10',
    registros: [],
    observacao: null,
    ...sobrescrever,
  };
}

describe('frequencia.model', () => {
  describe('calcularResumoFrequencia', () => {
    const registros = [
      registro('a', 'presente'),
      registro('b', 'presente'),
      registro('c', 'falta'),
      registro('d', 'falta_justificada'),
    ];

    it('conta falta justificada como presença computável quando abona', () => {
      const resumo = calcularResumoFrequencia(registros, true);
      expect(resumo.total).toBe(4);
      expect(resumo.computaveis).toBe(3);
      expect(resumo.percentual).toBe(75);
    });

    it('não conta falta justificada como presença quando não abona', () => {
      const resumo = calcularResumoFrequencia(registros, false);
      expect(resumo.computaveis).toBe(2);
      expect(resumo.percentual).toBe(50);
    });

    it('retorna percentual nulo sem registros', () => {
      const resumo = calcularResumoFrequencia([], true);
      expect(resumo.total).toBe(0);
      expect(resumo.percentual).toBeNull();
      expect(formatarPercentual(resumo.percentual)).toBe('Sem registros');
    });
  });

  describe('validarFrequencia', () => {
    const base: DadosFrequencia = {
      turmaId: 'turma-1',
      data: '2026-03-10',
      disciplinaId: 'disc-1',
      registros: [],
    };

    it('exige turma, data e disciplina', () => {
      const erros = validarFrequencia({ ...base, turmaId: '', data: '' }, []);
      expect(erros.length).toBe(2);
      expect(validarFrequencia({ ...base, disciplinaId: '' }, [])).toContain(
        'Selecione a disciplina da aula.',
      );
    });

    it('bloqueia chamada duplicada para a mesma turma/data/disciplina', () => {
      const erros = validarFrequencia(base, [chamada()]);
      expect(erros.length).toBe(1);
    });

    it('permite a própria chamada em edição', () => {
      const erros = validarFrequencia(base, [chamada()], 'chamada-1');
      expect(erros.length).toBe(0);
    });

    it('permite outra disciplina na mesma turma e data', () => {
      const existentes = [chamada({ disciplinaId: 'disc-1' })];
      const erros = validarFrequencia({ ...base, disciplinaId: 'disc-2' }, existentes);
      expect(erros.length).toBe(0);
    });
  });
});
