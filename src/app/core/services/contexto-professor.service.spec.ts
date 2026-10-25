import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { AuthService } from './auth.service';
import { ContextoProfessorService } from './contexto-professor.service';
import { DisciplinasService } from './disciplinas.service';
import { ProfessoresService } from './professores.service';
import { TurmasService } from './turmas.service';
import { VinculosDocentesService } from './vinculos-docentes.service';

const authProfessor = {
  carregando: () => false,
  autenticado: () => true,
  papel: () => 'professor' as const,
  usuario: () => ({
    id: 'auth-user-1',
    nome: 'Professora',
    email: 'novo-email@example.com',
    papel: 'professor' as const,
    ativo: true,
  }),
  temPapel: (papel: string) => papel === 'professor',
};

const CHAVES = [
  'turmalina.professores',
  'turmalina.turmas',
  'turmalina.disciplinas',
  'turmalina.disciplinas.inicializado',
  'turmalina.vinculos-docentes',
  'turmalina.auditoria',
];

describe('ContextoProfessorService', () => {
  let contexto: ContextoProfessorService;
  let disciplinas: DisciplinasService;
  let professores: ProfessoresService;
  let turmas: TurmasService;
  let vinculos: VinculosDocentesService;

  beforeEach(async () => {
    for (const chave of CHAVES) {
      localStorage.removeItem(chave);
    }

    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
        { provide: AuthService, useValue: authProfessor },
      ],
    }).compileComponents();

    contexto = TestBed.inject(ContextoProfessorService);
    disciplinas = TestBed.inject(DisciplinasService);
    professores = TestBed.inject(ProfessoresService);
    turmas = TestBed.inject(TurmasService);
    vinculos = TestBed.inject(VinculosDocentesService);
    await disciplinas.load();
  });

  it('resolve pelo userId apesar de o e-mail ter mudado e retorna apenas disciplinas vinculadas', async () => {
    const disciplina = disciplinas.porNome('Matemática');
    if (!disciplina) throw new Error('A disciplina padrão de teste não foi carregada.');

    const professorVinculado = await professores.create({
      nome: 'Professora',
      email: 'email-antigo@example.com',
      userId: 'auth-user-1',
    });
    const mesmoEmailDeOutraConta = await professores.create({
      nome: 'Outra pessoa',
      email: 'novo-email@example.com',
      userId: 'auth-user-2',
    });
    const turma = await turmas.create({
      nome: 'Turma A',
      professorIds: [professorVinculado.id, mesmoEmailDeOutraConta.id],
      disciplinaIds: [disciplina.id],
    });

    await vinculos.criar({
      professorId: professorVinculado.id,
      turmaId: turma.id,
      disciplinaId: disciplina.id,
    });

    expect(contexto.professorAtual()?.id).toBe(professorVinculado.id);
    expect(contexto.disciplinasDoProfessorNaTurma(turma.id).map((item) => item.id)).toEqual([
      disciplina.id,
    ]);
    expect(contexto.possuiVinculoAtivo(turma.id, disciplina.id)).toBeTrue();
  });

  it('não considera vínculo inativo como disciplina lecionada', async () => {
    const disciplina = disciplinas.porNome('Matemática');
    if (!disciplina) throw new Error('A disciplina padrão de teste não foi carregada.');

    const professor = await professores.create({
      nome: 'Professora',
      email: 'email-antigo@example.com',
      userId: 'auth-user-1',
    });
    const turma = await turmas.create({
      nome: 'Turma B',
      professorIds: [],
      disciplinaIds: [disciplina.id],
    });

    localStorage.setItem(
      'turmalina.vinculos-docentes',
      JSON.stringify([
        {
          id: 'vinculo-inativo',
          institutionId: turma.institutionId,
          professorId: professor.id,
          turmaId: turma.id,
          disciplinaId: disciplina.id,
          ativo: false,
          criadoEm: '',
          atualizadoEm: '',
        },
      ]),
    );
    await vinculos.load();

    expect(contexto.turmasDoProfessor()).toEqual([]);
    expect(contexto.disciplinasDoProfessorNaTurma(turma.id)).toEqual([]);
    expect(contexto.possuiVinculoAtivo(turma.id, disciplina.id)).toBeFalse();
  });

  it('não considera disciplina desativada como vínculo disponível', async () => {
    const disciplina = disciplinas.porNome('Matemática');
    if (!disciplina) throw new Error('A disciplina padrão de teste não foi carregada.');

    const professor = await professores.create({
      nome: 'Professora',
      email: 'professora@example.com',
      userId: 'auth-user-1',
    });
    const turma = await turmas.create({
      nome: 'Turma C',
      professorIds: [],
      disciplinaIds: [disciplina.id],
    });
    await vinculos.criar({
      professorId: professor.id,
      turmaId: turma.id,
      disciplinaId: disciplina.id,
    });
    await disciplinas.alternarAtiva(disciplina.id);

    expect(contexto.disciplinasDoProfessorNaTurma(turma.id)).toEqual([]);
    expect(contexto.possuiVinculoAtivo(turma.id, disciplina.id)).toBeFalse();
  });

  it('não expõe disciplina vinculada que não está ofertada na turma', async () => {
    const disciplina = disciplinas.porNome('Matemática');
    if (!disciplina) throw new Error('A disciplina padrão de teste não foi carregada.');

    const professor = await professores.create({
      nome: 'Professora',
      email: 'professora@example.com',
      userId: 'auth-user-1',
    });
    const turma = await turmas.create({
      nome: 'Turma D',
      professorIds: [],
      disciplinaIds: [disciplina.id],
    });
    await vinculos.criar({
      professorId: professor.id,
      turmaId: turma.id,
      disciplinaId: disciplina.id,
    });
    await turmas.update(turma.id, { disciplinaIds: [] });

    expect(contexto.disciplinasDoProfessorNaTurma(turma.id)).toEqual([]);
    expect(contexto.possuiVinculoAtivo(turma.id, disciplina.id)).toBeFalse();
  });
});
