import {
  DadosMeta,
  DadosMissao,
  Meta,
  Missao,
  classeSituacaoMissao,
  classeStatusMeta,
  dataIsoHoje,
  missaoPodeReceberConclusao,
  missaoVisivelParaAluno,
  normalizarIndicador,
  percentualMeta,
  rotuloIndicador,
  rotuloSituacaoMissao,
  rotuloStatusMeta,
  situacaoMissao,
  statusMetaAluno,
  validarMeta,
  validarMissao,
} from './missoes-metas.model';

function dadosMeta(sobrescrever: Partial<DadosMeta> = {}): DadosMeta {
  return {
    nome: 'Participação em aula',
    descricao: 'Participar das atividades da semana.',
    turmaId: 'turma-1',
    disciplinaId: 'disciplina-1',
    indicador: 'participacao',
    quantidade: 5,
    recompensaXp: 20,
    recompensaMoedas: 0,
    ativa: true,
    ...sobrescrever,
  };
}

function metaExistente(sobrescrever: Partial<Meta> = {}): Meta {
  return {
    id: 'meta-1',
    institutionId: 'instituicao-padrao',
    criadoEm: '2026-03-01T10:00:00.000Z',
    atualizadoEm: '2026-03-01T10:00:00.000Z',
    ...dadosMeta(),
    ...sobrescrever,
  };
}

function dadosMissao(sobrescrever: Partial<DadosMissao> = {}): DadosMissao {
  return {
    nome: 'Feira de ciências',
    descricao: 'Apresentar um experimento.',
    instrucoes: 'Forme um grupo e prepare a apresentação.',
    tipo: 'turma',
    turmaId: 'turma-1',
    disciplinaId: 'disciplina-1',
    indicador: 'participacao',
    xpRecompensa: 30,
    moedasRecompensa: 10,
    status: 'publicada',
    inicioEm: '2026-03-01',
    fimEm: '2026-03-31',
    ...sobrescrever,
  };
}

function missaoExistente(sobrescrever: Partial<Missao> = {}): Missao {
  return {
    id: 'missao-1',
    institutionId: 'instituicao-padrao',
    criadoEm: '2026-03-01T10:00:00.000Z',
    atualizadoEm: '2026-03-01T10:00:00.000Z',
    ...dadosMissao(),
    ...sobrescrever,
  };
}

describe('missoes-metas.model', () => {
  it('normaliza e apresenta indicadores de forma legível', () => {
    expect(normalizarIndicador('  Participacao_Em_Aula ')).toBe('participacao_em_aula');
    expect(rotuloIndicador('participacao_em_aula')).toBe('Participacao em aula');
    expect(rotuloIndicador('   ')).toBe('Sem indicador');
  });

  it('aceita uma meta válida', () => {
    expect(validarMeta(dadosMeta(), [])).toEqual([]);
  });

  it('recusa meta sem turma, sem disciplina, sem indicador e sem recompensa', () => {
    const erros = validarMeta(
      dadosMeta({
        turmaId: ' ',
        disciplinaId: ' ',
        indicador: '',
        recompensaXp: 0,
        recompensaMoedas: 0,
      }),
      [],
    );

    expect(erros).toContain('Selecione a turma da meta.');
    expect(erros).toContain('Selecione a disciplina da meta.');
    expect(erros).toContain('Escolha o indicador da meta.');
    expect(erros).toContain('Defina ao menos uma recompensa em XP ou moedas.');
  });

  it('recusa quantidade e recompensas inválidas', () => {
    const erros = validarMeta(
      dadosMeta({ quantidade: 0, recompensaXp: -1, recompensaMoedas: 1001 }),
      [],
    );

    expect(erros).toContain('A quantidade necessária deve ser um número inteiro maior que zero.');
    expect(erros).toContain('A recompensa em XP deve ser um número inteiro maior ou igual a zero.');
    expect(erros).toContain('A recompensa em moedas não pode ultrapassar 1000.');
  });

  it('impede nome duplicado na mesma turma e disciplina, ignorando a própria meta', () => {
    const existente = metaExistente();

    expect(validarMeta(dadosMeta({ nome: ' participação EM aula ' }), [existente])).toContain(
      'Já existe uma meta com este nome nesta turma e disciplina.',
    );
    expect(validarMeta(dadosMeta(), [existente], existente.id)).toEqual([]);
    expect(validarMeta(dadosMeta({ disciplinaId: 'disciplina-2' }), [existente])).toEqual([]);
  });

  it('calcula percentual e status da meta', () => {
    expect(percentualMeta(0, 5)).toBe(0);
    expect(percentualMeta(3, 5)).toBe(60);
    expect(percentualMeta(8, 5)).toBe(100);
    expect(percentualMeta(1, 0)).toBe(0);

    expect(statusMetaAluno(2, 5, false)).toBe('em-andamento');
    expect(statusMetaAluno(5, 5, false)).toBe('disponivel');
    expect(statusMetaAluno(5, 5, true)).toBe('concedida');
  });

  it('apresenta rótulos e classes de status da meta', () => {
    expect(rotuloStatusMeta('disponivel')).toBe('Disponível para concessão');
    expect(rotuloStatusMeta('concedida')).toBe('Concedida');
    expect(classeStatusMeta('disponivel')).toBe('badge-warning');
    expect(classeStatusMeta('em-andamento')).toBe('badge-info');
  });

  it('aceita uma missão válida', () => {
    expect(validarMissao(dadosMissao(), [])).toEqual([]);
  });

  it('recusa missão com período invertido', () => {
    const erros = validarMissao(dadosMissao({ inicioEm: '2026-03-31', fimEm: '2026-03-01' }), []);

    expect(erros).toContain('A data de fim não pode ser anterior à data de início.');
  });

  it('impede nome de missão duplicado na mesma turma e disciplina', () => {
    expect(
      validarMissao(dadosMissao({ nome: 'FEIRA de ciências' }), [missaoExistente()]),
    ).toContain('Já existe uma missão com este nome nesta turma e disciplina.');
    expect(
      validarMissao(dadosMissao({ nome: 'FEIRA de ciências', disciplinaId: 'disciplina-2' }), [
        missaoExistente(),
      ]),
    ).toEqual([]);
  });

  it('identifica missão publicada, agendada e expirada', () => {
    expect(situacaoMissao(missaoExistente(), '2026-03-10')).toBe('publicada');
    expect(situacaoMissao(missaoExistente(), '2026-02-28')).toBe('rascunho');
    expect(situacaoMissao(missaoExistente(), '2026-04-01')).toBe('expirada');
    expect(situacaoMissao(missaoExistente({ status: 'encerrada' }), '2026-03-10')).toBe(
      'encerrada',
    );
    expect(situacaoMissao(missaoExistente({ status: 'arquivada' }), '2026-03-10')).toBe(
      'arquivada',
    );
  });

  it('só expõe e permite conclusão em missões publicadas dentro do período', () => {
    const publicada = missaoExistente();

    expect(missaoVisivelParaAluno(publicada, '2026-03-10')).toBeTrue();
    expect(missaoPodeReceberConclusao(publicada, '2026-03-10')).toBeTrue();
    expect(missaoVisivelParaAluno(publicada, '2026-04-01')).toBeFalse();
    expect(missaoPodeReceberConclusao(publicada, '2026-04-01')).toBeFalse();
    expect(
      missaoVisivelParaAluno(missaoExistente({ status: 'rascunho' }), '2026-03-10'),
    ).toBeFalse();
  });

  it('apresenta rótulos e classes da situação da missão', () => {
    expect(rotuloSituacaoMissao('expirada')).toBe('Expirada');
    expect(rotuloSituacaoMissao('publicada')).toBe('Publicada');
    expect(rotuloSituacaoMissao('arquivada')).toBe('Arquivada');
    expect(classeSituacaoMissao('publicada')).toBe('badge-success');
    expect(classeSituacaoMissao('expirada')).toBe('badge-warning');
    expect(classeSituacaoMissao('arquivada')).toBe('badge-neutral');
  });

  it('gera a data de hoje no formato ISO local', () => {
    expect(dataIsoHoje(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
