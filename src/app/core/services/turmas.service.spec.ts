import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { TurmasService } from './turmas.service';

describe('TurmasService', () => {
  let service: TurmasService;

  beforeEach(() => {
    localStorage.removeItem('turmalina.turmas');
    localStorage.removeItem('turmalina.auditoria');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });
    service = TestBed.inject(TurmasService);
  });

  it('gera códigos únicos ao criar várias turmas sem código', async () => {
    await service.load();

    const criadas = await service.createMuitas([
      { nome: '6º Ano A' },
      { nome: '6º Ano B' },
      { nome: '7º Ano A' },
    ]);

    const codigos = criadas.map((turma) => turma.codigo);
    expect(codigos.every((codigo) => codigo.length > 0)).toBeTrue();
    expect(new Set(codigos).size).toBe(criadas.length);
  });

  it('preserva o código informado e gera apenas para os vazios', async () => {
    await service.load();

    const criadas = await service.createMuitas([
      { nome: '6º Ano A', codigo: 'TURMA1' },
      { nome: '6º Ano B', codigo: '   ' },
    ]);

    expect(criadas[0].codigo).toBe('TURMA1');
    expect(criadas[1].codigo.trim().length).toBeGreaterThan(0);
  });

  it('gera código ao cadastrar uma turma sem código', async () => {
    await service.load();

    const turma = await service.create({ nome: '8º Ano A' });

    expect(turma.codigo.trim().length).toBeGreaterThan(0);
  });
});
