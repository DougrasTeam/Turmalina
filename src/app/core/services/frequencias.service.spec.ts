import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { FrequenciasService } from './frequencias.service';

function registros(status: 'presente' | 'falta' | 'falta_justificada') {
  return [{ alunoId: 'aluno-1', status, justificativa: null }];
}

describe('FrequenciasService', () => {
  let service: FrequenciasService;

  beforeEach(() => {
    localStorage.removeItem('turmalina.frequencias');
    localStorage.removeItem('turmalina.auditoria');
    localStorage.removeItem('turmalina.instituicao');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });
    service = TestBed.inject(FrequenciasService);
  });

  it('salva e recupera uma chamada', async () => {
    await service.salvar({
      turmaId: 'turma-1',
      disciplinaId: 'disc-1',
      data: '2026-03-10',
      registros: registros('presente'),
    });
    expect(service.total()).toBe(1);
    const encontrada = service.encontrar('turma-1', '2026-03-10', 'disc-1');
    expect(encontrada?.registros[0].status).toBe('presente');
  });

  it('atualiza (upsert) a chamada existente em vez de duplicar', async () => {
    await service.salvar({
      turmaId: 'turma-1',
      disciplinaId: 'disc-1',
      data: '2026-03-10',
      registros: registros('presente'),
    });
    await service.salvar({
      turmaId: 'turma-1',
      disciplinaId: 'disc-1',
      data: '2026-03-10',
      registros: registros('falta'),
    });
    expect(service.total()).toBe(1);
    expect(service.encontrar('turma-1', '2026-03-10', 'disc-1')?.registros[0].status).toBe('falta');
  });

  it('diferencia chamadas por disciplina', async () => {
    await service.salvar({
      turmaId: 'turma-1',
      disciplinaId: 'disc-1',
      data: '2026-03-10',
      registros: registros('presente'),
    });
    await service.salvar({
      turmaId: 'turma-1',
      disciplinaId: 'disc-2',
      data: '2026-03-10',
      registros: registros('falta'),
    });
    expect(service.total()).toBe(2);
  });

  it('remove todas as chamadas', async () => {
    await service.salvar({
      turmaId: 'turma-1',
      disciplinaId: 'disc-1',
      data: '2026-03-10',
      registros: registros('presente'),
    });
    await service.salvar({
      turmaId: 'turma-2',
      disciplinaId: 'disc-2',
      data: '2026-03-11',
      registros: registros('falta'),
    });
    await service.removerTodas();
    expect(service.total()).toBe(0);
  });

  it('calcula o resumo do aluno respeitando a configuração institucional', async () => {
    await service.salvar({
      turmaId: 'turma-1',
      disciplinaId: 'disc-1',
      data: '2026-03-10',
      registros: registros('presente'),
    });
    await service.salvar({
      turmaId: 'turma-1',
      disciplinaId: 'disc-1',
      data: '2026-03-11',
      registros: registros('falta_justificada'),
    });

    const resumo = service.resumoAluno('aluno-1');
    expect(resumo.total).toBe(2);
    expect(resumo.percentual).toBe(100);
  });

  it('rejeita uma chamada sem disciplina', async () => {
    await expectAsync(
      service.salvar({
        turmaId: 'turma-1',
        disciplinaId: '',
        data: '2026-03-10',
        registros: registros('presente'),
      }),
    ).toBeRejectedWithError('Selecione a disciplina da aula.');
  });
});
