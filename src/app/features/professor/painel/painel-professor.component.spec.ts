import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthRepository } from '../../../core/auth/data-access/auth.repository';
import { MockAuthRepository } from '../../../core/auth/data-access/mock-auth.repository';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { AvaliacoesService } from '../../../core/services/avaliacoes.service';
import { DisciplinasService } from '../../../core/services/disciplinas.service';
import { FrequenciasService } from '../../../core/services/frequencias.service';
import { InstituicaoService } from '../../../core/services/instituicao.service';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';
import { ProfessoresService } from '../../../core/services/professores.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { VinculosDocentesService } from '../../../core/services/vinculos-docentes.service';
import { PainelProfessorComponent } from './painel-professor.component';

const CHAVES = [
  'turmalina.turmas',
  'turmalina.alunos',
  'turmalina.professores',
  'turmalina.disciplinas',
  'turmalina.disciplinas.inicializado',
  'turmalina.periodos-letivos',
  'turmalina.avaliacoes',
  'turmalina.frequencias',
  'turmalina.vinculos-docentes',
  'turmalina.auditoria',
];

const EMAIL_PROFESSOR = 'professor@turmalina.demo';

const authProfessor = {
  carregando: () => false,
  autenticado: () => true,
  papel: () => 'professor' as const,
  usuario: () => ({ id: 'usuario-prof', nome: 'Prof Teste', email: EMAIL_PROFESSOR, papel: 'professor' as const, ativo: true }),
  temPapel: () => true,
};

describe('PainelProfessorComponent', () => {
  let turmas: TurmasService;
  let alunos: AlunosService;
  let professores: ProfessoresService;
  let disciplinas: DisciplinasService;
  let periodos: PeriodosLetivosService;
  let avaliacoes: AvaliacoesService;
  let frequencias: FrequenciasService;
  let instituicao: InstituicaoService;

  beforeEach(async () => {
    for (const chave of CHAVES) {
      localStorage.removeItem(chave);
    }
    await TestBed.configureTestingModule({
      imports: [PainelProfessorComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthRepository, useClass: MockAuthRepository },
        { provide: AuthService, useValue: authProfessor },
      ],
    }).compileComponents();

    turmas = TestBed.inject(TurmasService);
    alunos = TestBed.inject(AlunosService);
    professores = TestBed.inject(ProfessoresService);
    disciplinas = TestBed.inject(DisciplinasService);
    periodos = TestBed.inject(PeriodosLetivosService);
    avaliacoes = TestBed.inject(AvaliacoesService);
    frequencias = TestBed.inject(FrequenciasService);
    instituicao = TestBed.inject(InstituicaoService);
    TestBed.inject(VinculosDocentesService);

    await Promise.all([
      turmas.load(),
      alunos.load(),
      professores.load(),
      disciplinas.load(),
      periodos.load(),
      avaliacoes.load(),
      frequencias.load(),
      instituicao.load(),
    ]);
  });

  function valores(fixture: { nativeElement: HTMLElement }): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.kpi-card__value')).map(
      (elemento) => elemento.textContent?.trim() ?? '',
    );
  }

  it('mostra estado vazio quando não há professor correspondente', () => {
    const fixture = TestBed.createComponent(PainelProfessorComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
  });

  it('mostra os indicadores da turma do professor', async () => {
    const matematica = disciplinas.porNome('Matemática')!;
    const professor = await professores.create({ nome: 'Prof Teste', email: EMAIL_PROFESSOR });
    const turma = await turmas.create({
      nome: 'Turma A',
      disciplinaIds: [matematica.id],
      professorIds: [professor.id],
    });
    const aluno = await alunos.create({ nome: 'Ana', email: 'ana@demo', turmaId: turma.id });
    const periodo = await periodos.criar({
      nome: '2026',
      dataInicio: '2026-01-01',
      dataFim: '2026-12-31',
      etapas: [],
    });
    const prova = await avaliacoes.criar({
      nome: 'Prova',
      turmaId: turma.id,
      disciplinaId: matematica.id,
      periodoLetivoId: periodo.id,
      notaMaxima: 10,
      peso: 1,
      status: 'publicada',
    });
    await avaliacoes.lancarNotas(prova.id, [{ alunoId: aluno.id, valor: 8, atualizadoEm: '' }]);
    await frequencias.salvar({
      turmaId: turma.id,
      periodoLetivoId: periodo.id,
      disciplinaId: matematica.id,
      data: '2026-03-10',
      registros: [{ alunoId: aluno.id, status: 'presente', justificativa: null }],
    });

    const fixture = TestBed.createComponent(PainelProfessorComponent);
    fixture.detectChanges();

    expect(valores(fixture)).toEqual(['1', '100%', '8,0', '0']);
  });
});
