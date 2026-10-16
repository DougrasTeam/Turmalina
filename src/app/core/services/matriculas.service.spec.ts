import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { MatriculasService } from './matriculas.service';
import { AlunosService } from './alunos.service';
import { TurmasService } from './turmas.service';
import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { StorageService } from './storage.service';
import { TenantService } from './tenant.service';

describe('MatriculasService', () => {
  let storage: StorageService;
  let tenant: TenantService;
  let turmas: TurmasService;
  let alunos: AlunosService;
  let matriculas: MatriculasService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });
    storage = TestBed.inject(StorageService);
    tenant = TestBed.inject(TenantService);
    tenant.definir('instituicao-padrao');
    turmas = TestBed.inject(TurmasService);
    alunos = TestBed.inject(AlunosService);
    matriculas = TestBed.inject(MatriculasService);
  });

  it('matricula aluno e mantém histórico ao transferir', async () => {
    const turmaA = await turmas.create({ nome: 'T1', serie: '1', turno: 'manha', anoLetivo: 2026, codigo: 'T1', descricao: '', professorIds: [], disciplinaIds: [], ativa: true });
    const turmaB = await turmas.create({ nome: 'T2', serie: '1', turno: 'manha', anoLetivo: 2026, codigo: 'T2', descricao: '', professorIds: [], disciplinaIds: [], ativa: true });
    const aluno = await alunos.create({ nome: 'Ana', email: '', matricula: 'A1', turmaId: turmaA.id, dataNascimento: '', responsavel: '', telefoneResponsavel: '', ativo: true, xp: 0, moedas: 0 });

    await matriculas.matricular(aluno.id, turmaA.id);
    await matriculas.transferir(aluno.id, turmaB.id, 'Mudança');

    const historico = matriculas.matriculasDoAluno(aluno.id);
    expect(historico.length).toBe(2);
    expect(historico[0].status).toBe('transferida');
    expect(historico[1].status).toBe('ativa');
    expect(historico[1].turmaId).toBe(turmaB.id);
  });

  it('não duplica matrícula ativa na mesma turma', async () => {
    const turma = await turmas.create({ nome: 'T1', serie: '1', turno: 'manha', anoLetivo: 2026, codigo: 'T1', descricao: '', professorIds: [], disciplinaIds: [], ativa: true });
    const aluno = await alunos.create({ nome: 'Ana', email: '', matricula: 'A1', turmaId: turma.id, dataNascimento: '', responsavel: '', telefoneResponsavel: '', ativo: true, xp: 0, moedas: 0 });

    await matriculas.matricular(aluno.id, turma.id);
    await expectAsync(matriculas.matricular(aluno.id, turma.id)).toBeRejected();
  });

  it('desmatricula encerra matrículas ativas mantendo histórico', async () => {
    const turma = await turmas.create({ nome: 'T1', serie: '1', turno: 'manha', anoLetivo: 2026, codigo: 'T1', descricao: '', professorIds: [], disciplinaIds: [], ativa: true });
    const aluno = await alunos.create({ nome: 'Ana', email: '', matricula: 'A1', turmaId: turma.id, dataNascimento: '', responsavel: '', telefoneResponsavel: '', ativo: true, xp: 0, moedas: 0 });

    await matriculas.matricular(aluno.id, turma.id);
    await matriculas.desmatricular(aluno.id, 'Saída');

    const historico = matriculas.matriculasDoAluno(aluno.id);
    expect(historico.length).toBe(1);
    expect(historico[0].status).toBe('encerrada');
    expect(historico[0].fimEm).not.toBeNull();
  });
});
