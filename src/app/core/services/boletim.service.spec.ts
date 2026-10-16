import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { AlunosService } from './alunos.service';
import { AvaliacoesService } from './avaliacoes.service';
import { BoletimService } from './boletim.service';
import { DisciplinasService } from './disciplinas.service';
import { FrequenciasService } from './frequencias.service';
import { InstituicaoService } from './instituicao.service';
import { PeriodosLetivosService } from './periodos-letivos.service';
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

describe('BoletimService', () => {
  let boletim: BoletimService;
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
      providers: [provideZonelessChangeDetection(), { provide: AuthRepository, useClass: MockAuthRepository }],
    });
    boletim = TestBed.inject(BoletimService);
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

  async function criarAlunoNaMatematica() {
    const matematica = disciplinas.porNome('Matemática')!;
    const turma = await turmas.create({ nome: 'Turma A', disciplinaIds: [matematica.id] });
    const aluno = await alunos.create({ nome: 'Ana', email: 'ana@demo', matricula: '2026-1', turmaId: turma.id });
    const periodo = await periodos.criar({
      nome: '2026',
      dataInicio: '2026-01-01',
      dataFim: '2026-12-31',
      etapas: [],
    });
    return { matematica, turma, aluno, periodo };
  }

  it('gera o boletim com média, frequência e situação por disciplina', async () => {
    const { matematica, turma, aluno, periodo } = await criarAlunoNaMatematica();
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

    const resultado = boletim.gerar(aluno.id, periodo.id)!;

    expect(resultado.alunoNome).toBe('Ana');
    expect(resultado.turmaNome).toBe('Turma A');
    expect(resultado.disciplinas.length).toBe(1);
    expect(resultado.disciplinas[0].media).toBe(8);
    expect(resultado.disciplinas[0].frequencia).toBe(100);
    expect(resultado.disciplinas[0].situacao).toBe('aprovado');
    expect(resultado.mediaGeral).toBe(8);
    expect(resultado.situacao).toBe('aprovado');
  });

  it('coloca em recuperação quando a média fica abaixo da mínima', async () => {
    const { matematica, turma, aluno, periodo } = await criarAlunoNaMatematica();
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

    const resultado = boletim.gerar(aluno.id, periodo.id)!;
    expect(resultado.mediaGeral).toBe(4);
    expect(resultado.situacao).toBe('recuperacao');
  });

  it('reprova por frequência insuficiente acima do mínimo institucional', async () => {
    const { matematica, turma, aluno, periodo } = await criarAlunoNaMatematica();
    await instituicao.salvar({
      nome: 'Escola Turmalina',
      fusoHorario: 'America/Sao_Paulo',
      status: 'ativa',
      frequenciaMinima: 75,
      faltaJustificadaAbona: true,
      notaMaxima: 10,
      mediaMinima: 6,
      casasDecimaisNota: 1,
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
    await avaliacoes.lancarNotas(prova.id, [{ alunoId: aluno.id, valor: 9, atualizadoEm: '' }]);
    await frequencias.salvar({
      turmaId: turma.id,
      periodoLetivoId: periodo.id,
      disciplinaId: matematica.id,
      data: '2026-03-10',
      registros: [{ alunoId: aluno.id, status: 'falta', justificativa: null }],
    });

    const resultado = boletim.gerar(aluno.id, periodo.id)!;
    expect(resultado.disciplinas[0].frequencia).toBe(0);
    expect(resultado.disciplinas[0].situacao).toBe('reprovado');
  });

  it('marca sem dados quando não há notas nem frequência lançadas', async () => {
    const { aluno, periodo } = await criarAlunoNaMatematica();
    const resultado = boletim.gerar(aluno.id, periodo.id)!;
    expect(resultado.mediaGeral).toBeNull();
    expect(resultado.frequenciaGeral).toBeNull();
    expect(resultado.situacao).toBe('sem_dados');
  });

  it('retorna null para aluno inexistente', () => {
    expect(boletim.gerar('inexistente', 'periodo')).toBeNull();
  });

  it('gera a relação da turma por período', async () => {
    const { aluno, turma, periodo } = await criarAlunoNaMatematica();
    const relacao = boletim.gerarPorTurma(turma.id, periodo.id);
    expect(relacao.length).toBe(1);
    expect(relacao[0].alunoId).toBe(aluno.id);
  });
});
