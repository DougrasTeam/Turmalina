import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { PADRAO_HORARIO_INICIAL } from '../models/padrao-horario.model';
import { PadroesHorarioService } from './padroes-horario.service';

describe('PadroesHorarioService', () => {
  let service: PadroesHorarioService;

  beforeEach(() => {
    localStorage.removeItem('turmalina.padroes-horario');
    localStorage.removeItem('turmalina.auditoria');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });
    service = TestBed.inject(PadroesHorarioService);
  });

  it('salva um único padrão por escola e atualiza o existente', async () => {
    await service.load();
    expect(service.padrao()).toBeNull();

    const criado = await service.salvar({
      ...PADRAO_HORARIO_INICIAL,
      minutosIntervalo: 20,
    });
    expect(criado.minutosIntervalo).toBe(20);

    const atualizado = await service.salvar({
      ...PADRAO_HORARIO_INICIAL,
      inicioManha: '07:10:00',
    });

    expect(atualizado.id).toBe(criado.id);
    expect(atualizado.inicioManha).toBe('07:10');
    expect(service.padrao()?.inicioManha).toBe('07:10');

    const registros = JSON.parse(
      localStorage.getItem('turmalina.padroes-horario') ?? '[]',
    );
    expect(registros.length).toBe(1);
  });

  it('rejeita uma tarde que começa antes do fim da manhã', async () => {
    await service.load();

    await expectAsync(
      service.salvar({
        ...PADRAO_HORARIO_INICIAL,
        inicioTarde: '11:00',
      }),
    ).toBeRejectedWithError(/início da tarde/);
  });
});
