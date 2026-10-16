import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { AlunosService } from './alunos.service';
import { AvaliacoesService } from './avaliacoes.service';
import { DisciplinasService } from './disciplinas.service';
import { FrequenciasService } from './frequencias.service';
import { InstituicaoService } from './instituicao.service';
import { PeriodosLetivosService } from './periodos-letivos.service';
import { RelatoriosService } from './relatorios.service';
import { TurmasService } from './turmas.service';

const CHAVES = [
  'turmalina.turmas',
  'turmalina.alunos',
  'turmalina.disciplinas',
  'turmalina.disciplinas.inicializado',
  'turmalina.periodos-letivos',
  'turmalina.avaliacoes',
  'turmalina.frequencias',
  'turmalina.instituicao',
  'turmalina.auditoria',
];

describe('RelatoriosService', () => {
  let relatorios: RelatoriosService;
  let turmas: TurmasService;
  let alunos: AlunosService;
  let disciplinas: DisciplinasService;
  let periodos: PeriodosLetivosService;
  let avaliacoes: AvaliacoesService;
  let frequencias: FrequenciasService;
  let instituicao: InstituicaoService;

  beforeEach(async () => {
    for (const chave of CHAVES) {
      localStorage.removeItem(chave);
    }
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });
    relatorios = TestBed.inject(RelatoriosService);
    turmas = TestBed.inject(TurmasService);
    alunos = TestBed.inject(AlunosService);
    disciplinas = TestBed.inject(DisciplinasService);
    periodos = TestBed.inject(PeriodosLetivosService);
    avaliacoes = TestBed.inject(AvaliacoesService);
    frequencias = TestBed.inject(FrequenciasService);
    instituicao = TestBed.inject(InstituicaoService);

    await Promise.all([
      turmas.load(),
      alunos.load(),
      disciplinas.load(),
      periodos.load(),
      avaliacoes.load(),
      frequencias.load(),
      instituicao.load(),
    ]);
  });

  async function criarCenario() {
    const matematica = disciplinas.porNome('Matemática')!;
    const turma = await turmas.create({ nome: 'Turma A', disciplinaIds: [matematica.id] });
    const aluno = await alunos.create({
      nome: 'Ana',
      email: 'ana@demo',
      matricula: '2026-1',
      turmaId: turma.id,
    });
    const periodo = await periodos.criar({
      nome: '2026',
      dataInicio: '2026-01-01',
      dataFim: '2026-12-31',
      etapas: [],
    });
    return { matematica, turma, aluno, periodo };
  }

  it('monta o relatório de frequência e sinaliza abaixo do limite', async () => {
    const { turma, aluno, periodo } = await criarCenario();
    await frequencias.salvar({
      turmaId: turma.id,
      periodoLetivoId: periodo.id,
      data: '2026-03-10',
      registros: [{ alunoId: aluno.id, status: 'presente', justificativa: null }],
    });
    await frequencias.salvar({
      turmaId: turma.id,
      periodoLetivoId: periodo.id,
      data: '2026-03-11',
      registros: [{ alunoId: aluno.id, status: 'falta', justificativa: null }],
    });
    await frequencias.salvar({
      turmaId: turma.id,
      periodoLetivoId: periodo.id,
      data: '2026-03-12',
      registros: [{ alunoId: aluno.id, status: 'falta_justificada', justificativa: 'atestado' }],
    });

    const relatorio = relatorios.frequenciaDaTurma(turma.id, periodo.id)!;

    expect(relatorio.linhas.length).toBe(1);
    expect(relatorio.linhas[0].total).toBe(3);
    expect(relatorio.linhas[0].presentes).toBe(1);
    expect(relatorio.linhas[0].faltas).toBe(1);
    expect(relatorio.linhas[0].justificadas).toBe(1);
    expect(relatorio.linhas[0].percentual).toBe(66.7);
    expect(relatorio.linhas[0].abaixoDoLimite).toBe(true);
    expect(relatorio.alunosAbaixoDoLimite).toBe(1);
  });

  it('monta o relatório de desempenho com médias por disciplina e média geral', async () => {
    const { matematica, turma, aluno, periodo } = await criarCenario();
    const prova = await avaliacoes.criar({
      nome: 'Prova',
      turmaId: turma.id,
      disciplinaId: matematica.id,
      periodoLetivoId: periodo.id,
      notaMaxima: 10,
      peso: 1,
      status: 'publicada',
    });
    await avaliacoes.lancarNotas(prova.id, [{ alunoId: aluno.id, valor: 4, atualizadoEm: '' }]);

    const relatorio = relatorios.desempenhoDaTurma(turma.id, periodo.id)!;

    expect(relatorio.colunas.length).toBe(1);
    expect(relatorio.colunas[0].disciplinaNome).toBe('Matemática');
    expect(relatorio.linhas[0].mediasPorDisciplina[0]).toBe(4);
    expect(relatorio.linhas[0].mediaGeral).toBe(4);
    expect(relatorio.linhas[0].abaixoDaMedia).toBe(true);
    expect(relatorio.alunosAbaixoDaMedia).toBe(1);
  });

  it('lista apenas avaliações com notas pendentes', async () => {
    const { matematica, turma, aluno, periodo } = await criarCenario();
    const prova = await avaliacoes.criar({
      nome: 'Prova',
      turmaId: turma.id,
      disciplinaId: matematica.id,
      periodoLetivoId: periodo.id,
      notaMaxima: 10,
      peso: 1,
      status: 'publicada',
    });
    await avaliacoes.lancarNotas(prova.id, [{ alunoId: aluno.id, valor: null, atualizadoEm: '' }]);

    const relatorio = relatorios.avaliacoesPendentes(turma.id, periodo.id)!;

    expect(relatorio.linhas.length).toBe(1);
    expect(relatorio.linhas[0].pendentes).toBe(1);
    expect(relatorio.linhas[0].disciplinaNome).toBe('Matemática');
    expect(relatorio.totalPendentes).toBe(1);
  });

  it('agrega o resumo institucional do período', async () => {
    const { matematica, turma, aluno, periodo } = await criarCenario();
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
      data: '2026-03-10',
      registros: [{ alunoId: aluno.id, status: 'presente', justificativa: null }],
    });

    const resumo = relatorios.resumoInstitucional(periodo.id);

    expect(resumo.turmasAtivas).toBe(1);
    expect(resumo.alunosAtivos).toBe(1);
    expect(resumo.frequenciaMedia).toBe(100);
    expect(resumo.mediaGeral).toBe(8);
    expect(resumo.alunosAbaixoDoLimite).toBe(0);
    expect(resumo.alunosAbaixoDaMedia).toBe(0);
    expect(resumo.avaliacoesComPendencia).toBe(0);
  });

  it('retorna null para turma inexistente', () => {
    expect(relatorios.frequenciaDaTurma('inexistente', 'periodo')).toBeNull();
    expect(relatorios.desempenhoDaTurma('inexistente', 'periodo')).toBeNull();
    expect(relatorios.avaliacoesPendentes('inexistente', 'periodo')).toBeNull();
  });
});
