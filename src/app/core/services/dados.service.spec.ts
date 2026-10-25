import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { AlunosService } from './alunos.service';
import { AvaliacoesService } from './avaliacoes.service';
import { DadosService } from './dados.service';
import { DisciplinasService } from './disciplinas.service';
import { MatriculasService } from './matriculas.service';
import { PeriodosLetivosService } from './periodos-letivos.service';
import { ProfessoresService } from './professores.service';
import { TurmasService } from './turmas.service';
import { VinculosDocentesService } from './vinculos-docentes.service';

describe('DadosService', () => {
  let dados: DadosService;
  let turmas: TurmasService;
  let professores: ProfessoresService;
  let alunos: AlunosService;
  let disciplinas: DisciplinasService;
  let periodos: PeriodosLetivosService;
  let vinculos: VinculosDocentesService;
  let matriculas: MatriculasService;
  let avaliacoes: AvaliacoesService;

  const chaves = [
    'turmalina.turmas',
    'turmalina.professores',
    'turmalina.alunos',
    'turmalina.disciplinas',
    'turmalina.disciplinas.inicializado',
    'turmalina.periodos-letivos',
    'turmalina.vinculos-docentes',
    'turmalina.matriculas',
    'turmalina.frequencias',
    'turmalina.grades-horarias',
    'turmalina.avaliacoes',
    'turmalina.auditoria',
  ];

  beforeEach(() => {
    for (const chave of chaves) localStorage.removeItem(chave);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });
    dados = TestBed.inject(DadosService);
    turmas = TestBed.inject(TurmasService);
    professores = TestBed.inject(ProfessoresService);
    alunos = TestBed.inject(AlunosService);
    disciplinas = TestBed.inject(DisciplinasService);
    periodos = TestBed.inject(PeriodosLetivosService);
    vinculos = TestBed.inject(VinculosDocentesService);
    matriculas = TestBed.inject(MatriculasService);
    avaliacoes = TestBed.inject(AvaliacoesService);
  });

  async function semear() {
    const turma = await turmas.create({ nome: 'Turma A' });
    const professor = await professores.create({ nome: 'Professor A' });
    const aluno = await alunos.create({ nome: 'Aluno A', turmaId: turma.id });
    await turmas.update(turma.id, { professorIds: [professor.id], disciplinaIds: ['disc-1'] });
    await vinculos.criar({ professorId: professor.id, turmaId: turma.id, disciplinaId: 'disc-1' });
    await matriculas.matricular(aluno.id, turma.id, 'periodo-1');
    return { turma, professor, aluno };
  }

  it('exclui turmas e limpa vínculos, matrículas e a turma dos alunos', async () => {
    const { turma, aluno } = await semear();

    await dados.excluir('turmas');

    expect(turmas.total()).toBe(0);
    expect(vinculos.total()).toBe(0);
    expect(matriculas.total()).toBe(0);
    expect(alunos.porTurma(turma.id).length).toBe(0);
    expect(alunos.alunos().find((a) => a.id === aluno.id)?.turmaId).toBe('');
  });

  it('exclui professores e remove seus vínculos e referências nas turmas', async () => {
    const { turma } = await semear();

    await dados.excluir('professores');

    expect(professores.total()).toBe(0);
    expect(vinculos.total()).toBe(0);
    expect(turmas.porId(turma.id)?.professorIds).toEqual([]);
  });

  it('exclui disciplinas e limpa ofertas e vínculos', async () => {
    const { turma } = await semear();
    await disciplinas.load();

    await dados.excluir('disciplinas');

    expect(disciplinas.total()).toBe(0);
    expect(vinculos.total()).toBe(0);
    expect(turmas.porId(turma.id)?.disciplinaIds).toEqual([]);
  });

  it('exclui todos os dados de uma vez', async () => {
    await semear();
    await disciplinas.load();
    await periodos.criar({ nome: '2026', dataInicio: '2026-01-01', dataFim: '2026-12-31', etapas: [] });

    await dados.excluirTudo();

    expect(turmas.total()).toBe(0);
    expect(alunos.total()).toBe(0);
    expect(professores.total()).toBe(0);
    expect(disciplinas.total()).toBe(0);
    expect(periodos.periodos().length).toBe(0);
    expect(matriculas.total()).toBe(0);
    expect(vinculos.total()).toBe(0);
  });

  it('não semeia disciplinas novamente após exclusão em massa', async () => {
    await disciplinas.load();
    expect(disciplinas.total()).toBeGreaterThan(0);

    await dados.excluir('disciplinas');

    expect(disciplinas.total()).toBe(0);
    expect(localStorage.getItem('turmalina.disciplinas.inicializado')).toBe('1');
  });

  it('exclui avaliações junto com as turmas', async () => {
    const { turma } = await semear();
    await avaliacoes.criar({
      nome: 'Prova',
      turmaId: turma.id,
      disciplinaId: 'disc-1',
      periodoLetivoId: 'periodo-1',
      notaMaxima: 10,
      peso: 1,
      status: 'publicada',
    });
    expect(avaliacoes.total()).toBe(1);

    await dados.excluir('turmas');

    expect(avaliacoes.total()).toBe(0);
  });
});
