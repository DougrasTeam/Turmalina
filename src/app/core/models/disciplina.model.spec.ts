import {
  DadosDisciplina,
  Disciplina,
  gerarCodigoDisciplina,
  validarDisciplina,
} from './disciplina.model';

function disciplina(sobrescrever: Partial<Disciplina> = {}): Disciplina {
  return {
    id: 'disciplina-1',
    institutionId: 'instituicao-padrao',
    nome: 'Matemática',
    codigo: 'MAT',
    cargaHoraria: 80,
    cor: '#2563eb',
    ativa: true,
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: '2026-01-01T00:00:00.000Z',
    ...sobrescrever,
  };
}

function dados(sobrescrever: Partial<DadosDisciplina> = {}): DadosDisciplina {
  return { nome: 'História', codigo: 'HIS', cargaHoraria: 80, cor: '#16a34a', ativa: true, ...sobrescrever };
}

describe('gerarCodigoDisciplina', () => {
  it('usa as iniciais quando há mais de uma palavra', () => {
    expect(gerarCodigoDisciplina('Educação Física')).toBe('EF');
  });

  it('usa as três primeiras letras em nomes únicos', () => {
    expect(gerarCodigoDisciplina('Arte')).toBe('ART');
  });

  it('adiciona sufixo quando o código já existe', () => {
    expect(gerarCodigoDisciplina('Educação Física', ['EF'])).toBe('EF2');
  });
});

describe('validarDisciplina', () => {
  it('aprova uma disciplina válida', () => {
    expect(validarDisciplina(dados(), [])).toEqual([]);
  });

  it('exige o nome', () => {
    const erros = validarDisciplina(dados({ nome: '   ' }), []);
    expect(erros.some((erro) => erro.includes('nome'))).toBeTrue();
  });

  it('recusa nome duplicado', () => {
    const erros = validarDisciplina(dados({ nome: 'Matemática' }), [disciplina()]);
    expect(erros.some((erro) => erro.includes('nome'))).toBeTrue();
  });

  it('recusa código duplicado', () => {
    const erros = validarDisciplina(dados({ codigo: 'MAT' }), [disciplina()]);
    expect(erros.some((erro) => erro.includes('código'))).toBeTrue();
  });

  it('ignora o próprio registro na validação', () => {
    const erros = validarDisciplina(
      dados({ nome: 'Matemática', codigo: 'MAT' }),
      [disciplina({ id: 'd1' })],
      'd1',
    );
    expect(erros).toEqual([]);
  });
});
