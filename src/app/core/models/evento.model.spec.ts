import {
  DadosEvento,
  Evento,
  alcanceEvento,
  deValorInputDataHora,
  eventoDuplicado,
  eventoPassado,
  formatarInicioEvento,
  ordenarEventosPorInicio,
  paraValorInputDataHora,
  rotuloTipoEvento,
  validarEvento,
} from './evento.model';

function criarEvento(parcial: Partial<Evento> = {}): Evento {
  return {
    id: 'evento-1',
    institutionId: 'instituicao-padrao',
    criadoEm: '2026-03-01T10:00:00.000Z',
    atualizadoEm: '2026-03-01T10:00:00.000Z',
    titulo: 'Prova de matemática',
    descricao: 'Conteúdo dos capítulos 1 a 3.',
    tipo: 'avaliacao',
    inicioEm: '2026-03-10T13:00:00.000Z',
    turmaId: 'turma-1',
    autorId: 'prof-1',
    autorNome: 'Ana Professora',
    ...parcial,
  };
}

function dados(sobrescrever: Partial<DadosEvento> = {}): DadosEvento {
  return {
    titulo: 'Prova de matemática',
    descricao: 'Conteúdo dos capítulos 1 a 3.',
    tipo: 'avaliacao',
    inicioEm: '2026-03-10T13:00:00.000Z',
    turmaId: 'turma-1',
    ...sobrescrever,
  };
}

describe('evento.model', () => {
  describe('validarEvento', () => {
    it('aceita um evento completo', () => {
      expect(validarEvento(dados())).toEqual([]);
    });

    it('exige título', () => {
      expect(validarEvento(dados({ titulo: '   ' }))).toContain('Informe o título do evento.');
    });

    it('exige data e hora válida', () => {
      expect(validarEvento(dados({ inicioEm: '' }))).toContain(
        'Informe a data e a hora do evento.',
      );
      expect(validarEvento(dados({ inicioEm: 'não é data' }))).toContain(
        'A data e a hora do evento são inválidas.',
      );
    });

    it('exige um tipo conhecido', () => {
      const tipoInvalido = 'prova' as DadosEvento['tipo'];
      expect(validarEvento(dados({ tipo: tipoInvalido }))).toContain('Selecione o tipo do evento.');
    });
  });

  describe('alcanceEvento', () => {
    it('o evento institucional alcança qualquer turma', () => {
      const institucional = criarEvento({ turmaId: null });
      expect(alcanceEvento(institucional, 'turma-1')).toBe(true);
      expect(alcanceEvento(institucional, null)).toBe(true);
    });

    it('o evento de turma alcança apenas a própria turma', () => {
      const daTurma = criarEvento({ turmaId: 'turma-1' });
      expect(alcanceEvento(daTurma, 'turma-1')).toBe(true);
      expect(alcanceEvento(daTurma, 'turma-2')).toBe(false);
    });
  });

  describe('eventoPassado', () => {
    it('identifica eventos anteriores à referência', () => {
      const passado = criarEvento({ inicioEm: '2026-03-01T10:00:00.000Z' });
      const futuro = criarEvento({ inicioEm: '2026-03-20T10:00:00.000Z' });
      const referencia = new Date('2026-03-10T00:00:00.000Z');

      expect(eventoPassado(passado, referencia)).toBe(true);
      expect(eventoPassado(futuro, referencia)).toBe(false);
    });
  });

  describe('ordenarEventosPorInicio', () => {
    it('ordena cronologicamente sem alterar a lista original', () => {
      const lista = [
        criarEvento({ id: 'b', inicioEm: '2026-03-20T10:00:00.000Z' }),
        criarEvento({ id: 'a', inicioEm: '2026-03-12T10:00:00.000Z' }),
        criarEvento({ id: 'c', inicioEm: '2026-04-01T10:00:00.000Z' }),
      ];

      const ordenada = ordenarEventosPorInicio(lista);

      expect(ordenada.map((evento) => evento.id)).toEqual(['a', 'b', 'c']);
      expect(lista.map((evento) => evento.id)).toEqual(['b', 'a', 'c']);
    });
  });

  describe('formatarInicioEvento', () => {
    it('devolve o valor original quando a data é inválida', () => {
      expect(formatarInicioEvento('data-inválida')).toBe('data-inválida');
    });

    it('formata uma data válida em pt-BR', () => {
      const formatado = formatarInicioEvento('2026-03-10T13:00:00.000Z');
      expect(formatado).not.toBe('');
      expect(formatado).not.toBe('2026-03-10T13:00:00.000Z');
    });
  });

  describe('conversão para e do input datetime-local', () => {
    it('faz a ida e a volta preservando o instante', () => {
      const iso = '2026-03-10T13:00:00.000Z';
      const valorInput = paraValorInputDataHora(iso);
      expect(valorInput).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(new Date(deValorInputDataHora(valorInput)).getTime()).toBe(new Date(iso).getTime());
    });

    it('devolve vazio para valores inválidos', () => {
      expect(paraValorInputDataHora('inválido')).toBe('');
      expect(deValorInputDataHora('')).toBe('');
    });
  });

  describe('eventoDuplicado', () => {
    it('detecta duplicidade por título, tipo, início e turma', () => {
      const evento = criarEvento();
      expect(eventoDuplicado(evento, dados())).toBe(true);
    });

    it('ignora diferenças de caixa e espaços no título', () => {
      const evento = criarEvento({ titulo: 'Prova de Matemática' });
      expect(eventoDuplicado(evento, dados({ titulo: '  prova de matemática  ' }))).toBe(true);
    });

    it('não considera duplicado quando o início ou a turma diferem', () => {
      const evento = criarEvento();
      expect(eventoDuplicado(evento, dados({ inicioEm: '2026-03-11T13:00:00.000Z' }))).toBe(false);
      expect(eventoDuplicado(evento, dados({ turmaId: 'turma-2' }))).toBe(false);
    });
  });

  describe('rotuloTipoEvento', () => {
    it('traduz o tipo conhecido', () => {
      expect(rotuloTipoEvento('entrega')).toBe('Entrega');
    });
  });
});
