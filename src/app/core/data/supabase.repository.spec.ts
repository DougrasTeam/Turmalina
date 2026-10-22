import { BaseEntity } from '../models';
import { SupabaseRepository } from './supabase.repository';
import { criarSupabaseFake, criarTenantFake, SupabaseFake } from './supabase-fake';

interface ItemTeste extends BaseEntity {
  nome: string;
  turmaId: string | null;
  ativa: boolean;
}

function linhaTeste(sobrescritas: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'item-1',
    institution_id: 'instituicao-padrao',
    nome: 'Matemática',
    turma_id: 'turma-1',
    ativa: true,
    criado_em: '2026-01-01T00:00:00.000Z',
    atualizado_em: '2026-01-02T00:00:00.000Z',
    ...sobrescritas,
  };
}

describe('SupabaseRepository', () => {
  let servidor: SupabaseFake;

  function criar(): SupabaseRepository<ItemTeste> {
    return new SupabaseRepository<ItemTeste>(criarSupabaseFake(servidor), criarTenantFake(), () => ({ nome: '', ativa: true }), {
      tabela: 'itens',
      ordenacao: 'nome',
      nulaveis: ['turma_id'],
    });
  }

  beforeEach(() => {
    servidor = new SupabaseFake();
  });

  it('lista os registros convertendo as colunas para camelCase e ordenando', async () => {
    servidor.definirRespostas('itens', [{ data: [linhaTeste()], error: null }]);

    const lista = await criar().list();

    expect(lista).toEqual([
      {
        id: 'item-1',
        institutionId: 'instituicao-padrao',
        nome: 'Matemática',
        turmaId: 'turma-1',
        ativa: true,
        criadoEm: '2026-01-01T00:00:00.000Z',
        atualizadoEm: '2026-01-02T00:00:00.000Z',
      },
    ]);
    expect(servidor.chamada('itens', 'select')?.argumentos).toEqual(['*']);
    expect(servidor.chamada('itens', 'order')?.argumentos).toEqual(['nome', { ascending: true }]);
  });

  it('busca um registro por id e devolve undefined quando não existe', async () => {
    servidor.definirRespostas('itens', [{ data: linhaTeste(), error: null }]);
    const encontrado = await criar().get('item-1');
    expect(encontrado?.nome).toBe('Matemática');
    expect(servidor.chamada('itens', 'eq')?.argumentos).toEqual(['id', 'item-1']);
    expect(servidor.chamada('itens', 'maybeSingle')).toBeDefined();

    servidor.definirRespostas('itens', [{ data: null, error: null }]);
    expect(await criar().get('inexistente')).toBeUndefined();
  });

  it('cria o registro com id, institutionId do tenant e colunas em snake_case', async () => {
    servidor.definirRespostas('itens', [{ data: linhaTeste(), error: null }]);

    await criar().create({ nome: 'História', turmaId: 'turma-1', ativa: true });

    const payload = servidor.chamada('itens', 'insert')?.argumentos[0] as Record<string, unknown>;
    expect(typeof payload['id']).toBe('string');
    expect(payload['institution_id']).toBe('instituicao-padrao');
    expect(payload['nome']).toBe('História');
    expect(payload['turma_id']).toBe('turma-1');
    expect(payload['criado_em']).toBeDefined();
    expect(payload['atualizado_em']).toBeDefined();
  });

  it('normaliza chave estrangeira vazia para null ao criar', async () => {
    servidor.definirRespostas('itens', [{ data: linhaTeste({ turma_id: null }), error: null }]);

    await criar().create({ nome: 'Sem turma', turmaId: '' });

    const payload = servidor.chamada('itens', 'insert')?.argumentos[0] as Record<string, unknown>;
    expect(payload['turma_id']).toBeNull();
  });

  it('atualiza sem reenviar id, institution_id ou criado_em, e renova atualizado_em', async () => {
    servidor.definirRespostas('itens', [{ data: linhaTeste({ ativa: false }), error: null }]);

    await criar().update('item-1', { ativa: false });

    const payload = servidor.chamada('itens', 'update')?.argumentos[0] as Record<string, unknown>;
    expect(payload['ativa']).toBe(false);
    expect(payload['atualizado_em']).toBeDefined();
    expect('id' in payload).toBe(false);
    expect('institution_id' in payload).toBe(false);
    expect('criado_em' in payload).toBe(false);
    expect(servidor.chamada('itens', 'eq')?.argumentos).toEqual(['id', 'item-1']);
  });

  it('remove pelo id', async () => {
    servidor.definirRespostas('itens', [{ error: null }]);

    await criar().remove('item-1');

    expect(servidor.chamada('itens', 'delete')).toBeDefined();
    expect(servidor.chamada('itens', 'eq')?.argumentos).toEqual(['id', 'item-1']);
  });

  it('cria vários registros em um único insert', async () => {
    servidor.definirRespostas('itens', [
      { data: [linhaTeste(), linhaTeste({ id: 'item-2' })], error: null },
    ]);

    const criados = await criar().createMany([{ nome: 'A' }, { nome: 'B' }]);

    const linhas = servidor.chamada('itens', 'insert')?.argumentos[0] as Record<string, unknown>[];
    expect(servidor.chamadasDe('itens', 'insert').length).toBe(1);
    expect(linhas.length).toBe(2);
    expect(linhas[0]['institution_id']).toBe('instituicao-padrao');
    expect(criados.map((item) => item.id)).toEqual(['item-1', 'item-2']);
  });

  it('remover vários registros envia um único delete com a lista de ids', async () => {
    servidor.definirRespostas('itens', [{ error: null }]);

    await criar().removeMany(['item-1', 'item-2']);

    expect(servidor.chamadasDe('itens', 'delete').length).toBe(1);
    expect(servidor.chamada('itens', 'in')?.argumentos).toEqual(['id', ['item-1', 'item-2']]);
  });

  it('não chama o Supabase para lotes vazios', async () => {
    await criar().createMany([]);
    await criar().removeMany([]);

    expect(servidor.chamadas.length).toBe(0);
  });

  it('saveAll envia um upsert em snake_case com conflito por id', async () => {
    servidor.definirRespostas('itens', [{ error: null }]);

    await criar().saveAll([
      {
        id: 'item-1',
        institutionId: 'instituicao-padrao',
        nome: 'Matemática',
        turmaId: 'turma-1',
        ativa: true,
        criadoEm: '2026-01-01T00:00:00.000Z',
        atualizadoEm: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const [linhas, opcoes] = servidor.chamada('itens', 'upsert')?.argumentos as [Record<string, unknown>[], unknown];
    expect(linhas[0]['nome']).toBe('Matemática');
    expect(linhas[0]['turma_id']).toBe('turma-1');
    expect(opcoes).toEqual({ onConflict: 'id' });
  });

  it('propaga o erro retornado pelo Supabase', async () => {
    servidor.definirRespostas('itens', [{ data: null, error: { message: 'RLS negou o acesso' } }]);

    await expectAsync(criar().list()).toBeRejectedWithError('RLS negou o acesso');
  });
});
