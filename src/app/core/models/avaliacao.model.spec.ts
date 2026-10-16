import {
  Avaliacao,
  RegistroNota,
  calcularMediaAluno,
  formatarNota,
  mediaDaAvaliacao,
  resumoNotas,
  validarAvaliacao,
  validarNota,
} from './avaliacao.model';

function nota(alunoId: string, valor: number | null): RegistroNota {
  return { alunoId, valor, atualizadoEm: '2026-03-10T00:00:00.000Z' };
}

function avaliacao(sobrescrever: Partial<Avaliacao> = {}): Avaliacao {
  return {
    id: 'av-1',
    institutionId: 'instituicao-padrao',
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: '2026-01-01T00:00:00.000Z',
    nome: 'Prova bimestral',
    turmaId: 'turma-1',
    disciplinaId: 'disc-1',
    periodoLetivoId: 'periodo-1',
    etapaId: null,
    data: '2026-03-10',
    notaMaxima: 10,
    peso: 1,
    status: 'publicada',
    descricao: null,
    notas: [],
    ...sobrescrever,
  };
}

describe('avaliacao.model', () => {
  describe('mediaDaAvaliacao', () => {
    it('ignora notas em branco (não viram zero)', () => {
      const prova = avaliacao({ notas: [nota('a', 8), nota('b', null), nota('c', 6)] });
      expect(mediaDaAvaliacao(prova, 1)).toBe(7);
    });

    it('retorna null sem notas lançadas', () => {
      const prova = avaliacao({ notas: [nota('a', null)] });
      expect(mediaDaAvaliacao(prova, 1)).toBeNull();
    });
  });

  describe('calcularMediaAluno', () => {
    it('usa média aritmética quando todos os pesos são 1', () => {
      const avaliacoes = [
        avaliacao({ id: 'a', notas: [nota('aluno', 8)] }),
        avaliacao({ id: 'b', notas: [nota('aluno', 6)] }),
      ];
      const resultado = calcularMediaAluno(avaliacoes, 'aluno', 1);
      expect(resultado.valor).toBe(7);
      expect(resultado.formula).toBe('aritmetica');
      expect(resultado.lancadas).toBe(2);
    });

    it('usa média ponderada quando há pesos diferentes', () => {
      const avaliacoes = [
        avaliacao({ id: 'a', peso: 2, notas: [nota('aluno', 10)] }),
        avaliacao({ id: 'b', peso: 1, notas: [nota('aluno', 4)] }),
      ];
      const resultado = calcularMediaAluno(avaliacoes, 'aluno', 1);
      expect(resultado.valor).toBe(8);
      expect(resultado.formula).toBe('ponderada');
    });

    it('ignora avaliações arquivadas e notas não lançadas', () => {
      const avaliacoes = [
        avaliacao({ id: 'a', notas: [nota('aluno', 10)] }),
        avaliacao({ id: 'b', status: 'arquivada', notas: [nota('aluno', 0)] }),
        avaliacao({ id: 'c', notas: [nota('aluno', null)] }),
      ];
      const resultado = calcularMediaAluno(avaliacoes, 'aluno', 1);
      expect(resultado.valor).toBe(10);
      expect(resultado.lancadas).toBe(1);
    });

    it('retorna null quando não há notas lançadas', () => {
      expect(calcularMediaAluno([avaliacao()], 'aluno', 1).valor).toBeNull();
    });
  });

  describe('validarNota', () => {
    it('aceita nota em branco', () => {
      expect(validarNota(null, 10)).toEqual([]);
    });

    it('rejeita nota acima do máximo', () => {
      expect(validarNota(11, 10).length).toBe(1);
    });

    it('rejeita nota negativa', () => {
      expect(validarNota(-1, 10).length).toBe(1);
    });
  });

  describe('validarAvaliacao', () => {
    const base = {
      nome: 'Prova',
      turmaId: 'turma-1',
      disciplinaId: 'disc-1',
      periodoLetivoId: 'periodo-1',
      notaMaxima: 10,
      peso: 1,
      status: 'rascunho' as const,
    };

    it('exige campos obrigatórios', () => {
      const erros = validarAvaliacao({ ...base, nome: '', turmaId: '', disciplinaId: '' });
      expect(erros.length).toBe(3);
    });

    it('exige nota máxima e peso positivos', () => {
      const erros = validarAvaliacao({ ...base, notaMaxima: 0, peso: 0 });
      expect(erros.length).toBe(2);
    });
  });

  describe('resumoNotas', () => {
    it('conta lançadas e pendentes', () => {
      const prova = avaliacao({ notas: [nota('a', 8), nota('b', null), nota('c', 5)] });
      expect(resumoNotas(prova)).toEqual({ total: 3, lancadas: 2, pendentes: 1 });
    });
  });

  it('formata nota em branco como travessão', () => {
    expect(formatarNota(null, 1)).toBe('—');
  });
});
