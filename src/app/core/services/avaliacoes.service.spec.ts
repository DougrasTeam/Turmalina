import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { AvaliacoesService } from './avaliacoes.service';
import { PeriodosLetivosService } from './periodos-letivos.service';

const DADOS = {
  nome: 'Prova bimestral',
  turmaId: 'turma-1',
  disciplinaId: 'disc-1',
  periodoLetivoId: 'periodo-1',
  notaMaxima: 10,
  peso: 1,
  status: 'publicada' as const,
};

describe('AvaliacoesService', () => {
  let service: AvaliacoesService;
  let periodos: PeriodosLetivosService;

  beforeEach(() => {
    for (const chave of ['turmalina.avaliacoes', 'turmalina.periodos-letivos', 'turmalina.auditoria']) {
      localStorage.removeItem(chave);
    }
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });
    service = TestBed.inject(AvaliacoesService);
    periodos = TestBed.inject(PeriodosLetivosService);
  });

  it('cria uma avaliação', async () => {
    const avaliacao = await service.criar(DADOS);
    expect(service.total()).toBe(1);
    expect(avaliacao.nome).toBe('Prova bimestral');
  });

  it('lança notas mantendo campos em branco como não lançados', async () => {
    const avaliacao = await service.criar(DADOS);
    await service.lancarNotas(avaliacao.id, [
      { alunoId: 'a', valor: 8, atualizadoEm: '' },
      { alunoId: 'b', valor: null, atualizadoEm: '' },
    ]);

    const atualizada = service.porId(avaliacao.id)!;
    expect(service.resumo(atualizada)).toEqual({ total: 2, lancadas: 1, pendentes: 1 });
    expect(service.media(atualizada)).toBe(8);
  });

  it('rejeita nota acima do máximo', async () => {
    const avaliacao = await service.criar(DADOS);
    await expectAsync(
      service.lancarNotas(avaliacao.id, [{ alunoId: 'a', valor: 11, atualizadoEm: '' }]),
    ).toBeRejected();
  });

  it('bloqueia lançamento quando o período está encerrado', async () => {
    const periodo = await periodos.criar({
      nome: '2026',
      dataInicio: '2026-01-01',
      dataFim: '2026-12-31',
      etapas: [],
    });
    const avaliacao = await service.criar({ ...DADOS, periodoLetivoId: periodo.id });
    await periodos.encerrar(periodo.id);

    await expectAsync(
      service.lancarNotas(avaliacao.id, [{ alunoId: 'a', valor: 8, atualizadoEm: '' }]),
    ).toBeRejected();
  });

  it('calcula a média do aluno por turma e período', async () => {
    const primeira = await service.criar({ ...DADOS, peso: 2 });
    const segunda = await service.criar({ ...DADOS, nome: 'Trabalho', peso: 1 });
    await service.lancarNotas(primeira.id, [{ alunoId: 'a', valor: 10, atualizadoEm: '' }]);
    await service.lancarNotas(segunda.id, [{ alunoId: 'a', valor: 4, atualizadoEm: '' }]);

    const resultado = service.resultadoAluno('a', 'turma-1', 'periodo-1');
    expect(resultado.valor).toBe(8);
    expect(resultado.formula).toBe('ponderada');
  });

  it('calcula a média somente para a disciplina e conjunto de avaliações autorizados', async () => {
    const matematica = await service.criar({ ...DADOS, disciplinaId: 'matematica' });
    await service.criar({ ...DADOS, disciplinaId: 'ciencias', nome: 'Prova de ciências' });
    await service.lancarNotas(matematica.id, [
      { alunoId: 'aluno-1', valor: 9, atualizadoEm: '' },
    ]);
    const matematicaAtualizada = service.porId(matematica.id);

    if (!matematicaAtualizada) {
      throw new Error('A avaliação de matemática não foi encontrada.');
    }

    const resultado = service.resultadoAluno(
      'aluno-1',
      'turma-1',
      'periodo-1',
      'matematica',
      [matematicaAtualizada],
    );

    expect(resultado.valor).toBe(9);
    expect(resultado.lancadas).toBe(1);
  });

  it('remove todas as avaliações', async () => {
    await service.criar(DADOS);
    await service.removerTodas();
    expect(service.total()).toBe(0);
  });
});
