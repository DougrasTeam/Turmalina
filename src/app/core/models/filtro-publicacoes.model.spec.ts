import {
  FILTRO_PUBLICACOES_PADRAO,
  FiltroPublicacoes,
  aplicarFiltroPublicacoes,
} from './filtro-publicacoes.model';
import { Publicacao } from './publicacao.model';

function criarPublicacao(parcial: Partial<Publicacao>): Publicacao {
  return {
    id: 'pub',
    institutionId: 'instituicao-padrao',
    criadoEm: '2026-01-01T10:00:00.000Z',
    atualizadoEm: '2026-01-01T10:00:00.000Z',
    titulo: 'Título',
    conteudo: 'Conteúdo',
    imagemUrl: null,
    turmaId: null,
    autorId: 'autor-a',
    autorNome: 'Autor A',
    publicadaEm: '2026-01-01T10:00:00.000Z',
    expiraEm: null,
    status: 'publicada',
    ...parcial,
  };
}

const institucional = criarPublicacao({ id: 'inst', turmaId: null, autorId: 'autor-a' });
const daTurmaA = criarPublicacao({ id: 'a', turmaId: 'turma-a', autorId: 'autor-a' });
const daTurmaB = criarPublicacao({ id: 'b', turmaId: 'turma-b', autorId: 'autor-b' });

const publicacoes = [institucional, daTurmaA, daTurmaB];

function filtrar(filtro: Partial<FiltroPublicacoes>, autorId: string | null = null): string[] {
  return aplicarFiltroPublicacoes(
    publicacoes,
    { ...FILTRO_PUBLICACOES_PADRAO, ...filtro },
    autorId,
  ).map((publicacao) => publicacao.id);
}

describe('filtro-publicacoes.model', () => {
  it('retorna todas as publicações quando não há filtro', () => {
    expect(filtrar({})).toEqual(['inst', 'a', 'b']);
  });

  it('mantém apenas as publicações institucionais no escopo escola', () => {
    expect(filtrar({ escopo: 'escola' })).toEqual(['inst']);
  });

  it('mantém apenas as publicações da turma no escopo turma', () => {
    expect(filtrar({ escopo: 'turma', turmaId: 'turma-a' })).toEqual(['a']);
  });

  it('retorna lista vazia quando o escopo turma não tem turma correspondente', () => {
    expect(filtrar({ escopo: 'turma', turmaId: 'turma-c' })).toEqual([]);
  });

  it('restringe às publicações do autor quando apenasMeus está ativo', () => {
    expect(filtrar({ apenasMeus: true }, 'autor-a')).toEqual(['inst', 'a']);
  });

  it('não retorna nada quando apenasMeus está ativo e nenhum autor foi informado', () => {
    expect(filtrar({ apenasMeus: true }, null)).toEqual([]);
  });

  it('combina escopo e autoria', () => {
    expect(filtrar({ escopo: 'turma', turmaId: 'turma-a', apenasMeus: true }, 'autor-a')).toEqual([
      'a',
    ]);
    expect(filtrar({ escopo: 'turma', turmaId: 'turma-b', apenasMeus: true }, 'autor-a')).toEqual(
      [],
    );
  });
});
