import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { DadosPeriodoLetivo } from '../models/periodo-letivo.model';
import { PeriodosLetivosService } from './periodos-letivos.service';

function dados(sobrescrever: Partial<DadosPeriodoLetivo> = {}): DadosPeriodoLetivo {
  return { nome: 'Ano 2026', dataInicio: '2026-02-01', dataFim: '2026-11-30', etapas: [], ...sobrescrever };
}

describe('PeriodosLetivosService', () => {
  let service: PeriodosLetivosService;

  beforeEach(() => {
    localStorage.removeItem('turmalina.periodos-letivos');
    localStorage.removeItem('turmalina.auditoria');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });
    service = TestBed.inject(PeriodosLetivosService);
  });

  it('cria um período no status planejado', async () => {
    const periodo = await service.criar(dados());
    expect(periodo.status).toBe('planejado');
    expect(service.periodos().length).toBe(1);
  });

  it('impede criar período sobreposto', async () => {
    await service.criar(dados());
    await expectAsync(service.criar(dados({ dataInicio: '2026-05-01' }))).toBeRejected();
  });

  it('mantém apenas um período ativo, encerrando o anterior', async () => {
    const primeiro = await service.criar(dados({ nome: '2025', dataInicio: '2025-02-01', dataFim: '2025-11-30' }));
    await service.ativar(primeiro.id);

    const segundo = await service.criar(dados({ nome: '2026', dataInicio: '2026-02-01', dataFim: '2026-11-30' }));
    await service.ativar(segundo.id);

    expect(service.ativo()?.id).toBe(segundo.id);
    expect(service.periodos().find((item) => item.id === primeiro.id)?.status).toBe('encerrado');
  });

  it('não permite excluir período que não esteja planejado', async () => {
    const periodo = await service.criar(dados());
    await service.ativar(periodo.id);
    await expectAsync(service.remover(periodo.id)).toBeRejected();
  });

  it('encerra e reabre um período', async () => {
    const periodo = await service.criar(dados());
    await service.ativar(periodo.id);
    await service.encerrar(periodo.id);
    expect(service.periodos()[0].status).toBe('encerrado');

    await service.reabrir(periodo.id);
    expect(service.periodos()[0].status).toBe('planejado');
  });
});
