import {
  DadosEquipe,
  Equipe,
  EquipeMembro,
  membrosParaPlacar,
  pontuarEquipe,
  validarEquipe,
  vinculoVigenteNaData,
} from './equipes.model';

function criarEquipe(sobrescritos: Partial<Equipe> = {}): Equipe {
  return {
    id: 'equipe-1',
    institutionId: 'instituicao-padrao',
    criadoEm: '2026-01-01T10:00:00.000Z',
    atualizadoEm: '2026-01-01T10:00:00.000Z',
    nome: 'Leões',
    emoji: '🦁',
    cor: '#2563EB',
    ativa: true,
    turmaId: 'turma-1',
    periodoLetivoId: 'periodo-1',
    ...sobrescritos,
  };
}

function criarMembro(sobrescritos: Partial<EquipeMembro> = {}): EquipeMembro {
  return {
    id: 'membro-1',
    institutionId: 'instituicao-padrao',
    criadoEm: '2026-01-01T10:00:00.000Z',
    atualizadoEm: '2026-01-01T10:00:00.000Z',
    equipeId: 'equipe-1',
    equipeNome: 'Leões',
    alunoId: 'aluno-1',
    alunoNome: 'Ana Lima',
    turmaId: 'turma-1',
    periodoLetivoId: 'periodo-1',
    ativa: true,
    inicioEm: '2026-01-01T10:00:00.000Z',
    fimEm: null,
    autorId: 'user-1',
    autorNome: 'Ana Professora',
    ...sobrescritos,
  };
}

const DADOS_VALIDOS: DadosEquipe = {
  nome: 'Leões',
  emoji: '🦁',
  cor: '#2563EB',
  ativa: true,
  turmaId: 'turma-1',
  periodoLetivoId: 'periodo-1',
};

describe('validarEquipe', () => {
  it('aceita dados válidos', () => {
    expect(validarEquipe(DADOS_VALIDOS, [])).toEqual([]);
  });

  it('exige nome, emoji, turma e cor', () => {
    const erros = validarEquipe(
      { ...DADOS_VALIDOS, nome: '  ', emoji: '', turmaId: '', cor: 'azul' },
      [],
    );
    expect(erros).toContain('Informe o nome da equipe.');
    expect(erros).toContain('Escolha um emoji para a equipe.');
    expect(erros).toContain('Selecione a turma da equipe.');
    expect(erros).toContain('Escolha uma cor válida para a equipe.');
  });

  it('impede nome duplicado na mesma turma/período', () => {
    const existentes = [criarEquipe()];
    const erros = validarEquipe({ ...DADOS_VALIDOS, nome: 'leões' }, existentes);
    expect(erros).toContain('Já existe uma equipe com este nome nesta turma/período.');
  });

  it('permite o mesmo nome em período diferente', () => {
    const existentes = [criarEquipe()];
    const erros = validarEquipe(
      { ...DADOS_VALIDOS, periodoLetivoId: 'periodo-2' },
      existentes,
    );
    expect(erros).toEqual([]);
  });

  it('ignora o próprio registro ao editar', () => {
    const existentes = [criarEquipe()];
    expect(validarEquipe(DADOS_VALIDOS, existentes, 'equipe-1')).toEqual([]);
  });
});

describe('vinculoVigenteNaData', () => {
  it('considera vigente entre início e fim', () => {
    const membro = criarMembro({
      inicioEm: '2026-01-01T00:00:00.000Z',
      fimEm: '2026-02-01T00:00:00.000Z',
    });
    expect(vinculoVigenteNaData(membro, new Date('2026-01-15T00:00:00.000Z'))).toBe(true);
    expect(vinculoVigenteNaData(membro, new Date('2026-02-15T00:00:00.000Z'))).toBe(false);
  });

  it('considera vigente sem data de fim', () => {
    const membro = criarMembro({ fimEm: null });
    expect(vinculoVigenteNaData(membro, new Date('2030-01-01T00:00:00.000Z'))).toBe(true);
  });
});

describe('membrosParaPlacar', () => {
  it('no XP acumulado inclui os vínculos históricos', () => {
    const membros = [
      criarMembro({ id: 'm1' }),
      criarMembro({ id: 'm2', ativa: false, fimEm: '2026-03-01T00:00:00.000Z' }),
    ];
    const resultado = membrosParaPlacar(membros, 'equipe-1', 'xp_acumulado', 'periodo-1');
    expect(resultado.length).toBe(2);
  });

  it('no XP do período filtra pelo período informado', () => {
    const membros = [
      criarMembro({ id: 'm1', periodoLetivoId: 'periodo-1' }),
      criarMembro({ id: 'm2', periodoLetivoId: 'periodo-2' }),
    ];
    const resultado = membrosParaPlacar(membros, 'equipe-1', 'xp_periodo', 'periodo-1');
    expect(resultado.map((membro) => membro.id)).toEqual(['m1']);  });
});

describe('pontuarEquipe', () => {
  it('soma o XP de alunos únicos e calcula a média', () => {
    const membros = [
      criarMembro({ id: 'm1', alunoId: 'aluno-1' }),
      criarMembro({ id: 'm2', alunoId: 'aluno-1' }),
      criarMembro({ id: 'm3', alunoId: 'aluno-2' }),
    ];
    const xpPorAluno = new Map([
      ['aluno-1', 30],
      ['aluno-2', 10],
    ]);
    const resultado = pontuarEquipe(membros, xpPorAluno);
    expect(resultado.quantidadeMembros).toBe(2);
    expect(resultado.xpTotal).toBe(40);
    expect(resultado.xpMedio).toBe(20);
  });

  it('retorna zeros sem membros', () => {
    const resultado = pontuarEquipe([], new Map());
    expect(resultado).toEqual({ quantidadeMembros: 0, xpTotal: 0, xpMedio: 0 });
  });
});
