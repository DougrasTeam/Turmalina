import { EtapaAvaliacao } from './etapa-avaliacao.model';
import { DadosPeriodoLetivo, PeriodoLetivo, validarPeriodoLetivo } from './periodo-letivo.model';

function periodo(sobrescrever: Partial<PeriodoLetivo> = {}): PeriodoLetivo {
  return {
    id: 'periodo-1',
    institutionId: 'instituicao-padrao',
    nome: 'Período existente',
    dataInicio: '2026-01-01',
    dataFim: '2026-12-31',
    status: 'planejado',
    etapas: [],
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: '2026-01-01T00:00:00.000Z',
    ...sobrescrever,
  };
}

function etapa(sobrescrever: Partial<EtapaAvaliacao> = {}): EtapaAvaliacao {
  return { id: 'etapa-1', nome: '1º Bimestre', tipo: 'bimestre', dataInicio: '', dataFim: '', ...sobrescrever };
}

function dados(sobrescrever: Partial<DadosPeriodoLetivo> = {}): DadosPeriodoLetivo {
  return {
    nome: 'Ano letivo 2026',
    dataInicio: '2026-02-01',
    dataFim: '2026-12-15',
    etapas: [],
    ...sobrescrever,
  };
}

describe('validarPeriodoLetivo', () => {
  it('aprova um período válido', () => {
    expect(validarPeriodoLetivo(dados(), [])).toEqual([]);
  });

  it('exige nome', () => {
    const erros = validarPeriodoLetivo(dados({ nome: '   ' }), []);
    expect(erros.some((erro) => erro.includes('nome'))).toBeTrue();
  });

  it('rejeita data inicial posterior à final', () => {
    const erros = validarPeriodoLetivo(dados({ dataInicio: '2026-12-01', dataFim: '2026-02-01' }), []);
    expect(erros.some((erro) => erro.includes('posterior'))).toBeTrue();
  });

  it('rejeita sobreposição entre períodos', () => {
    const existente = periodo({ dataInicio: '2026-03-01', dataFim: '2026-06-01' });
    const erros = validarPeriodoLetivo(dados({ dataInicio: '2026-05-01', dataFim: '2026-08-01' }), [
      existente,
    ]);
    expect(erros.some((erro) => erro.includes('sobrepõem'))).toBeTrue();
  });

  it('ignora o próprio período na checagem de sobreposição', () => {
    const existente = periodo({ id: 'atual', dataInicio: '2026-03-01', dataFim: '2026-06-01' });
    const erros = validarPeriodoLetivo(
      dados({ dataInicio: '2026-03-01', dataFim: '2026-06-01' }),
      [existente],
      'atual',
    );
    expect(erros.some((erro) => erro.includes('sobrepõem'))).toBeFalse();
  });

  it('rejeita etapa fora das datas do período', () => {
    const etapaFora: EtapaAvaliacao = {
      id: 'e1',
      nome: '1º Bimestre',
      tipo: 'bimestre',
      dataInicio: '2026-01-01',
      dataFim: '2026-02-01',
    };
    const erros = validarPeriodoLetivo(dados({ etapas: [etapaFora] }), []);
    expect(erros.some((erro) => erro.includes('dentro das datas'))).toBeTrue();
  });

  it('rejeita etapas sobrepostas', () => {
    const primeira: EtapaAvaliacao = {
      id: 'e1',
      nome: '1º Bimestre',
      tipo: 'bimestre',
      dataInicio: '2026-03-01',
      dataFim: '2026-04-30',
    };
    const segunda: EtapaAvaliacao = {
      id: 'e2',
      nome: '2º Bimestre',
      tipo: 'bimestre',
      dataInicio: '2026-04-01',
      dataFim: '2026-06-30',
    };
    const erros = validarPeriodoLetivo(dados({ etapas: [primeira, segunda] }), []);
    expect(erros.some((erro) => erro.includes('se sobrepõem'))).toBeTrue();
  });
});
