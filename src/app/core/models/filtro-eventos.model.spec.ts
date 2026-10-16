import { FILTRO_EVENTOS_PADRAO, FiltroEventos, aplicarFiltroEventos } from './filtro-eventos.model';
import { Evento } from './evento.model';

function criarEvento(parcial: Partial<Evento>): Evento {
  return {
    id: 'evento',
    institutionId: 'instituicao-padrao',
    criadoEm: '2026-03-01T10:00:00.000Z',
    atualizadoEm: '2026-03-01T10:00:00.000Z',
    titulo: 'Evento',
    descricao: '',
    tipo: 'aviso',
    inicioEm: '2026-03-11T10:00:00.000Z',
    turmaId: null,
    autorId: 'autor-a',
    autorNome: 'Autor A',
    ...parcial,
  };
}

const referencia = new Date('2026-03-10T12:00:00.000Z');

const institucional = criarEvento({
  id: 'inst',
  turmaId: null,
  inicioEm: '2026-03-11T10:00:00.000Z',
});
const daTurmaA = criarEvento({ id: 'a', turmaId: 'turma-a', inicioEm: '2026-03-15T10:00:00.000Z' });
const daTurmaB = criarEvento({ id: 'b', turmaId: 'turma-b', inicioEm: '2026-04-20T10:00:00.000Z' });
const passado = criarEvento({
  id: 'passado',
  turmaId: 'turma-a',
  inicioEm: '2026-03-01T10:00:00.000Z',
});

const eventos = [daTurmaB, passado, institucional, daTurmaA];

function filtrar(filtro: Partial<FiltroEventos>): string[] {
  return aplicarFiltroEventos(eventos, { ...FILTRO_EVENTOS_PADRAO, ...filtro }, referencia).map(
    (evento) => evento.id,
  );
}

describe('filtro-eventos.model', () => {
  it('retorna os próximos eventos em ordem cronológica, sem os passados', () => {
    expect(filtrar({})).toEqual(['inst', 'a', 'b']);
  });

  it('mantém apenas os eventos institucionais no escopo escola', () => {
    expect(filtrar({ escopo: 'escola' })).toEqual(['inst']);
  });

  it('mantém apenas os eventos da turma no escopo turma', () => {
    expect(filtrar({ escopo: 'turma', turmaId: 'turma-a' })).toEqual(['a']);
  });

  it('retorna lista vazia quando o escopo turma não tem turma correspondente', () => {
    expect(filtrar({ escopo: 'turma', turmaId: 'turma-c' })).toEqual([]);
  });

  it('limita aos próximos 7 dias quando o período é semana', () => {
    expect(filtrar({ periodo: 'semana' })).toEqual(['inst', 'a']);
  });

  it('limita aos próximos 30 dias quando o período é mês', () => {
    expect(filtrar({ periodo: 'mes' })).toEqual(['inst', 'a']);
  });

  it('inclui os eventos passados quando o período é todos', () => {
    expect(filtrar({ periodo: 'todos' })).toEqual(['passado', 'inst', 'a', 'b']);
  });

  it('combina escopo turma com o período todos', () => {
    expect(filtrar({ escopo: 'turma', turmaId: 'turma-a', periodo: 'todos' })).toEqual([
      'passado',
      'a',
    ]);
  });
});
