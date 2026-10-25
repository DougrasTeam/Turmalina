import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthRepository } from '../../../core/auth/data-access/auth.repository';
import { MockAuthRepository } from '../../../core/auth/data-access/mock-auth.repository';
import { AlunosService } from '../../../core/services/alunos.service';
import { AvaliacoesService } from '../../../core/services/avaliacoes.service';
import { DisciplinasService } from '../../../core/services/disciplinas.service';
import { FrequenciasService } from '../../../core/services/frequencias.service';
import { InstituicaoService } from '../../../core/services/instituicao.service';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { RelatoriosComponent } from './relatorios.component';

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

function botaoPorTexto(
  fixture: ComponentFixture<RelatoriosComponent>,
  texto: string,
): HTMLButtonElement | undefined {
  const botoes = Array.from(
    fixture.nativeElement.querySelectorAll('button'),
  ) as HTMLButtonElement[];
  return botoes.find((botao) => botao.textContent?.includes(texto));
}

describe('RelatoriosComponent', () => {
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
    await TestBed.configureTestingModule({
      imports: [RelatoriosComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    }).compileComponents();

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

  async function criarCenarioComDados() {
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
    return { matematica, turma, aluno, periodo };
  }

  it('renderiza o relatório de frequência por padrão', async () => {
    await criarCenarioComDados();
    const fixture = TestBed.createComponent(RelatoriosComponent);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Frequência média');
    expect(texto).toContain('100%');
    expect(texto).toContain('Ana');
    expect(texto).toContain('Regular');
  });

  it('alterna para o relatório de desempenho ao selecionar o tipo', async () => {
    await criarCenarioComDados();
    const fixture = TestBed.createComponent(RelatoriosComponent);
    fixture.detectChanges();

    botaoPorTexto(fixture, 'Desempenho')!.click();
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Matemática');
    expect(texto).toContain('Média geral');
    expect(texto).toContain('8,0');
  });

  it('desabilita a exportação quando a turma não tem dados', async () => {
    const turma = await turmas.create({ nome: 'Turma vazia' });
    const periodo = await periodos.criar({
      nome: '2026',
      dataInicio: '2026-01-01',
      dataFim: '2026-12-31',
      etapas: [],
    });
    expect(turma.id).toBeTruthy();

    const fixture = TestBed.createComponent(RelatoriosComponent);
    fixture.detectChanges();

    const botaoExportar = botaoPorTexto(fixture, 'Exportar CSV')!;
    expect(botaoExportar.disabled).toBe(true);
    expect(periodo.id).toBeTruthy();
  });
});
