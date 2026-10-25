import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { DadosDisciplina, DISCIPLINAS_PADRAO } from '../models/disciplina.model';
import { DisciplinasService } from './disciplinas.service';

function dados(sobrescrever: Partial<DadosDisciplina> = {}): DadosDisciplina {
  return { nome: 'Física', codigo: 'FIS', cargaHoraria: 80, cor: '#2563eb', ativa: true, ...sobrescrever };
}

describe('DisciplinasService', () => {
  let service: DisciplinasService;

  beforeEach(() => {
    localStorage.removeItem('turmalina.disciplinas');
    localStorage.removeItem('turmalina.disciplinas.inicializado');
    localStorage.removeItem('turmalina.auditoria');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });
    service = TestBed.inject(DisciplinasService);
  });

  it('semeia disciplinas padrão quando o armazenamento está vazio', async () => {
    await service.load();
    expect(service.total()).toBeGreaterThan(0);
  });

  it('cria as disciplinas padrão apenas uma vez e com cores diferentes', async () => {
    await service.load();
    await service.removerTodas();

    const criadas = await service.criarDisciplinasPadrao();

    expect(criadas).toBe(DISCIPLINAS_PADRAO.length);
    expect(service.total()).toBe(DISCIPLINAS_PADRAO.length);
    expect(new Set(service.disciplinas().map((disciplina) => disciplina.cor)).size).toBe(
      DISCIPLINAS_PADRAO.length,
    );
    expect(await service.criarDisciplinasPadrao()).toBe(0);
  });

  it('cria e lista uma disciplina', async () => {
    await service.load();
    const antes = service.total();
    await service.criar(dados());
    expect(service.total()).toBe(antes + 1);
    expect(service.porNome('Física')).toBeTruthy();
  });

  it('recusa disciplina com nome duplicado', async () => {
    await service.criar(dados());
    await expectAsync(service.criar(dados())).toBeRejected();
  });

  it('alterna entre ativa e inativa', async () => {
    const disciplina = await service.criar(dados());
    expect(disciplina.ativa).toBeTrue();
    await service.alternarAtiva(disciplina.id);
    expect(service.porId(disciplina.id)?.ativa).toBeFalse();
  });
});
