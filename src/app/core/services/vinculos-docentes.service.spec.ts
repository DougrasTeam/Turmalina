import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { DadosVinculoDocente } from '../models/vinculo-docente.model';
import { VinculosDocentesService } from './vinculos-docentes.service';

function dados(sobrescrever: Partial<DadosVinculoDocente> = {}): DadosVinculoDocente {
  return { professorId: 'prof-1', turmaId: 'turma-1', disciplinaId: 'disc-1', ...sobrescrever };
}

describe('VinculosDocentesService', () => {
  let service: VinculosDocentesService;

  beforeEach(() => {
    localStorage.removeItem('turmalina.vinculos-docentes');
    localStorage.removeItem('turmalina.auditoria');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });
    service = TestBed.inject(VinculosDocentesService);
  });

  it('cria um vínculo docente', async () => {
    const vinculo = await service.criar(dados());
    expect(vinculo.ativo).toBeTrue();
    expect(service.porTurma('turma-1').length).toBe(1);
  });

  it('recusa vínculo duplicado', async () => {
    await service.criar(dados());
    await expectAsync(service.criar(dados())).toBeRejected();
  });

  it('exige professor e disciplina', async () => {
    await expectAsync(service.criar(dados({ professorId: '' }))).toBeRejected();
    await expectAsync(service.criar(dados({ disciplinaId: '' }))).toBeRejected();
  });

  it('remove um vínculo', async () => {
    const vinculo = await service.criar(dados());
    await service.remover(vinculo.id);
    expect(service.porTurma('turma-1').length).toBe(0);
  });
});
