import {
  ACOES_GAMIFICACAO_PADRAO,
  DadosAcaoGamificacao,
  criarChaveIdempotencia,
  formatarDeltaXp,
  nivelPorXp,
  progressoNivel,
  validarAcaoGamificacao,
  xpNoNivelAtual,
  xpParaProximoNivel,
} from './gamificacao.model';

function dados(sobrescrever: Partial<DadosAcaoGamificacao> = {}): DadosAcaoGamificacao {
  return {
    nome: 'Participação em aula',
    icone: 'star',
    valorXp: 10,
    indicador: 'participacao',
    ativa: true,
    turmaId: 'turma-1',
    disciplinaId: 'disciplina-1',
    ...sobrescrever,
  };
}

describe('gamificacao.model', () => {
  it('aceita uma ação válida', () => {
    expect(validarAcaoGamificacao(dados(), [])).toEqual([]);
  });

  it('recusa valor de XP zero, acima do máximo ou negativo além do limite', () => {
    expect(validarAcaoGamificacao(dados({ valorXp: 0 }), [])).not.toEqual([]);
    expect(validarAcaoGamificacao(dados({ valorXp: 101 }), [])).not.toEqual([]);
    expect(validarAcaoGamificacao(dados({ valorXp: -51 }), [])).not.toEqual([]);
    expect(validarAcaoGamificacao(dados({ valorXp: -20 }), [])).toEqual([]);
  });

  it('recusa ação sem turma, disciplina, nome e indicador', () => {
    const erros = validarAcaoGamificacao(
      dados({ turmaId: ' ', disciplinaId: ' ', nome: '  ', indicador: ' ' }),
      [],
    );
    expect(erros).toContain('Selecione a turma da ação.');
    expect(erros).toContain('Selecione a disciplina da ação.');
    expect(erros).toContain('Informe o nome da ação.');
    expect(erros).toContain('Informe o indicador associado à ação.');
  });

  it('recusa nome duplicado na mesma turma e disciplina, ignorando a própria ação', () => {
    const existente = {
      ...dados(),
      id: 'acao-1',
      institutionId: 'i',
      criadoEm: '',
      atualizadoEm: '',
    };

    expect(validarAcaoGamificacao(dados(), [existente])).toContain(
      'Já existe uma ação com este nome nesta turma e disciplina.',
    );
    expect(validarAcaoGamificacao(dados({ valorXp: 15 }), [existente], 'acao-1')).toEqual([]);
    expect(validarAcaoGamificacao(dados({ disciplinaId: 'disciplina-2' }), [existente])).toEqual(
      [],
    );
  });

  it('calcula o nível a partir do XP acumulado', () => {
    expect(nivelPorXp(0)).toBe(1);
    expect(nivelPorXp(99)).toBe(1);
    expect(nivelPorXp(100)).toBe(2);
    expect(nivelPorXp(250)).toBe(3);
    expect(nivelPorXp(-10)).toBe(1);
  });

  it('calcula progresso e quanto falta para o próximo nível', () => {
    expect(xpNoNivelAtual(130)).toBe(30);
    expect(xpParaProximoNivel(130)).toBe(70);
    expect(progressoNivel(130)).toBe(30);
    expect(xpNoNivelAtual(100)).toBe(0);
    expect(xpParaProximoNivel(100)).toBe(100);
  });

  it('formata o delta de XP com sinal', () => {
    expect(formatarDeltaXp(15)).toBe('+15');
    expect(formatarDeltaXp(-5)).toBe('-5');
  });

  it('gera chaves de idempotência distintas', () => {
    expect(criarChaveIdempotencia()).not.toBe(criarChaveIdempotencia());
  });

  it('mantém as ações padrão com nomes únicos e valores não nulos', () => {
    const nomes = ACOES_GAMIFICACAO_PADRAO.map((acao) => acao.nome.toLowerCase());
    expect(new Set(nomes).size).toBe(nomes.length);
    for (const acao of ACOES_GAMIFICACAO_PADRAO) {
      expect(acao.valorXp).not.toBe(0);
      expect(
        validarAcaoGamificacao({ ...acao, turmaId: 'turma-1', disciplinaId: 'disciplina-1' }, []),
      ).toEqual([]);
    }
  });
});
