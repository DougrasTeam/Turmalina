import { Avaliacao } from '../../models/avaliacao.model';
import { Frequencia } from '../../models/frequencia.model';
import { PeriodoLetivo } from '../../models/periodo-letivo.model';
import { criarSupabaseFake, criarTenantFake, SupabaseFake } from '../supabase-fake';
import { AvaliacoesSupabaseRepository } from './avaliacoes-supabase.repository';
import { FrequenciasSupabaseRepository } from './frequencias-supabase.repository';
import { PeriodosLetivosSupabaseRepository } from './periodos-letivos-supabase.repository';

function linhaAvaliacao(): Record<string, unknown> {
  return {
    id: 'aval-1',
    institution_id: 'instituicao-padrao',
    nome: 'Prova de Matemática',
    turma_id: 'turma-1',
    disciplina_id: 'disc-1',
    periodo_letivo_id: 'per-1',
    etapa_id: null,
    data: '2026-02-01',
    nota_maxima: 10,
    peso: 1,
    status: 'rascunho',
    descricao: null,
    criado_em: '2026-01-01T00:00:00.000Z',
    atualizado_em: '2026-01-01T00:00:00.000Z',
  };
}

function linhaNota(): Record<string, unknown> {
  return {
    id: 'nota-1',
    institution_id: 'instituicao-padrao',
    avaliacao_id: 'aval-1',
    aluno_id: 'aluno-1',
    valor: 8.5,
    criado_em: '2026-01-01T00:00:00.000Z',
    atualizado_em: '2026-01-02T00:00:00.000Z',
  };
}

function linhaFrequencia(): Record<string, unknown> {
  return {
    id: 'freq-1',
    institution_id: 'instituicao-padrao',
    turma_id: 'turma-1',
    periodo_letivo_id: 'per-1',
    disciplina_id: null,
    data: '2026-02-01',
    observacao: null,
    criado_em: '2026-01-01T00:00:00.000Z',
    atualizado_em: '2026-01-01T00:00:00.000Z',
  };
}

function linhaPresenca(): Record<string, unknown> {
  return {
    id: 'pres-1',
    institution_id: 'instituicao-padrao',
    frequencia_id: 'freq-1',
    aluno_id: 'aluno-1',
    status: 'presente',
    justificativa: null,
    criado_em: '2026-01-01T00:00:00.000Z',
    atualizado_em: '2026-01-01T00:00:00.000Z',
  };
}

function linhaPeriodo(): Record<string, unknown> {
  return {
    id: 'per-1',
    institution_id: 'instituicao-padrao',
    nome: 'Ano Letivo',
    data_inicio: '2026-02-01',
    data_fim: '2026-12-15',
    status: 'ativo',
    criado_em: '2026-01-01T00:00:00.000Z',
    atualizado_em: '2026-01-01T00:00:00.000Z',
  };
}

function linhaEtapa(): Record<string, unknown> {
  return {
    id: 'etapa-1',
    institution_id: 'instituicao-padrao',
    periodo_letivo_id: 'per-1',
    nome: '1º Bimestre',
    tipo: 'bimestre',
    data_inicio: '2026-02-01',
    data_fim: '2026-04-30',
    criado_em: '2026-01-01T00:00:00.000Z',
    atualizado_em: '2026-01-01T00:00:00.000Z',
  };
}

describe('repositórios Supabase com relacionamentos', () => {
  let servidor: SupabaseFake;

  beforeEach(() => {
    servidor = new SupabaseFake();
  });

  describe('AvaliacoesSupabaseRepository', () => {
    function criar(): AvaliacoesSupabaseRepository {
      return new AvaliacoesSupabaseRepository(criarSupabaseFake(servidor), criarTenantFake(), () => ({
        nome: '',
        status: 'rascunho',
        notaMaxima: 10,
        peso: 1,
        notas: [],
      }));
    }

    it('carrega as notas da tabela normalizada ao listar', async () => {
      servidor.definirRespostas('avaliacoes', [{ data: [linhaAvaliacao()], error: null }]);
      servidor.definirRespostas('notas', [{ data: [linhaNota()], error: null }]);

      const [avaliacao] = await criar().list();

      expect(avaliacao.nome).toBe('Prova de Matemática');
      expect(avaliacao.notas).toEqual([
        { alunoId: 'aluno-1', valor: 8.5, atualizadoEm: '2026-01-02T00:00:00.000Z' },
      ]);
      expect(servidor.chamada('notas', 'in')?.argumentos).toEqual(['avaliacao_id', ['aval-1']]);
    });

    it('substitui as notas (delete + insert) ao criar uma avaliação', async () => {
      servidor.definirRespostas('avaliacoes', [{ data: linhaAvaliacao(), error: null }]);
      servidor.definirRespostas('notas', [
        { error: null },
        { error: null },
        { data: [linhaNota()], error: null },
      ]);

      const avaliacao = await criar().create({
        nome: 'Prova de Matemática',
        turmaId: 'turma-1',
        disciplinaId: 'disc-1',
        periodoLetivoId: 'per-1',
        notaMaxima: 10,
        peso: 1,
        status: 'rascunho',
        notas: [{ alunoId: 'aluno-1', valor: 8.5, atualizadoEm: '2026-01-02T00:00:00.000Z' }],
      });

      expect(servidor.chamada('notas', 'delete')?.argumentos).toEqual([]);
      const payload = servidor.chamada('notas', 'insert')?.argumentos[0] as Record<string, unknown>[];
      expect(payload[0]['avaliacao_id']).toBe('aval-1');
      expect(payload[0]['aluno_id']).toBe('aluno-1');
      expect(payload[0]['valor']).toBe(8.5);
      expect(avaliacao.notas.length).toBe(1);
    });
  });

  describe('FrequenciasSupabaseRepository', () => {
    function criar(): FrequenciasSupabaseRepository {
      return new FrequenciasSupabaseRepository(criarSupabaseFake(servidor), criarTenantFake(), () => ({
        turmaId: '',
        periodoLetivoId: '',
        disciplinaId: null,
        data: '',
        registros: [],
        observacao: null,
      }));
    }

    it('carrega os registros de presença ao listar', async () => {
      servidor.definirRespostas('frequencias', [{ data: [linhaFrequencia()], error: null }]);
      servidor.definirRespostas('presencas', [{ data: [linhaPresenca()], error: null }]);

      const [frequencia] = await criar().list();

      expect(frequencia.data).toBe('2026-02-01');
      expect(frequencia.registros).toEqual([
        { alunoId: 'aluno-1', status: 'presente', justificativa: null },
      ]);
      expect(servidor.chamada('presencas', 'in')?.argumentos).toEqual(['frequencia_id', ['freq-1']]);
    });

    it('substitui os registros de presença ao salvar uma chamada', async () => {
      servidor.definirRespostas('frequencias', [{ data: linhaFrequencia(), error: null }]);
      servidor.definirRespostas('presencas', [
        { error: null },
        { error: null },
        { data: [linhaPresenca()], error: null },
      ]);

      const frequencia = await criar().create({
        turmaId: 'turma-1',
        periodoLetivoId: 'per-1',
        disciplinaId: null,
        data: '2026-02-01',
        observacao: null,
        registros: [{ alunoId: 'aluno-1', status: 'presente', justificativa: null }],
      });

      const payload = servidor.chamada('presencas', 'insert')?.argumentos[0] as Record<string, unknown>[];
      expect(payload[0]['frequencia_id']).toBe('freq-1');
      expect(payload[0]['status']).toBe('presente');
      expect(frequencia.registros.length).toBe(1);
    });
  });

  describe('PeriodosLetivosSupabaseRepository', () => {
    function criar(): PeriodosLetivosSupabaseRepository {
      return new PeriodosLetivosSupabaseRepository(criarSupabaseFake(servidor), criarTenantFake(), () => ({
        nome: '',
        dataInicio: '',
        dataFim: '',
        etapas: [],
      }));
    }

    it('carrega as etapas do período ao listar', async () => {
      servidor.definirRespostas('periodos_letivos', [{ data: [linhaPeriodo()], error: null }]);
      servidor.definirRespostas('etapas_avaliacao', [{ data: [linhaEtapa()], error: null }]);

      const [periodo] = await criar().list();

      expect(periodo.etapas).toEqual([
        { id: 'etapa-1', nome: '1º Bimestre', tipo: 'bimestre', dataInicio: '2026-02-01', dataFim: '2026-04-30' },
      ]);
      expect(servidor.chamada('etapas_avaliacao', 'in')?.argumentos).toEqual(['periodo_letivo_id', ['per-1']]);
    });

    it('remove as etapas excluídas e faz upsert das enviadas ao atualizar', async () => {
      servidor.definirRespostas('periodos_letivos', [{ data: linhaPeriodo(), error: null }]);
      servidor.definirRespostas('etapas_avaliacao', [
        { data: [{ id: 'etapa-1' }, { id: 'etapa-2' }], error: null },
        { error: null },
        { error: null },
        { data: [linhaEtapa()], error: null },
      ]);

      await criar().update('per-1', {
        etapas: [
          { id: 'etapa-1', nome: '1º Bimestre', tipo: 'bimestre', dataInicio: '2026-02-01', dataFim: '2026-04-30' },
        ],
      });

      expect(servidor.chamada('etapas_avaliacao', 'in')?.argumentos).toEqual(['id', ['etapa-2']]);
      const payload = servidor.chamada('etapas_avaliacao', 'upsert')?.argumentos[0] as Record<string, unknown>[];
      expect(payload[0]['id']).toBe('etapa-1');
      expect(payload[0]['periodo_letivo_id']).toBe('per-1');
    });
  });
});
