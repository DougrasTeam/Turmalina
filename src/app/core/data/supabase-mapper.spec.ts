import {
  nomeColuna,
  nomePropriedade,
  paraCamelCase,
  paraCamelCaseLista,
  paraSnakeCase,
} from './supabase-mapper';

describe('supabase-mapper', () => {
  it('converte propriedades camelCase para colunas snake_case', () => {
    expect(nomeColuna('frequenciaMinima')).toBe('frequencia_minima');
    expect(nomeColuna('notaMaxima')).toBe('nota_maxima');
    expect(nomeColuna('nome')).toBe('nome');
  });

  it('converte colunas snake_case para propriedades camelCase', () => {
    expect(nomePropriedade('frequencia_minima')).toBe('frequenciaMinima');
    expect(nomePropriedade('nota_maxima')).toBe('notaMaxima');
    expect(nomePropriedade('nome')).toBe('nome');
  });

  it('serializa Date como ISO na ida para o banco', () => {
    const momento = new Date('2026-02-03T10:20:30.000Z');
    const linha = paraSnakeCase({ criadoEm: momento, turmaId: 'turma-1' });
    expect(linha['criado_em']).toBe('2026-02-03T10:20:30.000Z');
    expect(linha['turma_id']).toBe('turma-1');
  });

  it('faz ida e volta preservando as chaves', () => {
    const original = { id: 'x', institutionId: 'instituicao-padrao', frequenciaMinima: 75 };
    const idaEVolta = paraCamelCase<typeof original>(paraSnakeCase(original));
    expect(idaEVolta).toEqual(original);
  });

  it('converte uma lista de linhas, tratando nulo como vazio', () => {
    expect(paraCamelCaseLista([{ id: 'a' }, { id: 'b' }])).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(paraCamelCaseLista(null)).toEqual([]);
  });
});
