import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { Aluno, Usuario } from '../models';
import { AlunosService } from './alunos.service';
import { MissoesService } from './missoes.service';
import { MoedasService } from './moedas.service';

const CHAVES = [
  'turmalina.missoes',
  'turmalina.missoes-aluno',
  'turmalina.acoes-gamificacao',
  'turmalina.eventos-xp',
  'turmalina.moedas',
  'turmalina.alunos',
  'turmalina.auditoria',
];

const autor: Usuario = {
  id: 'user-prof-1',
  nome: 'Ana Professora',
  email: 'ana@turmalina.com',
  papel: 'professor',
  ativo: true,
  institutionId: 'instituicao-padrao',
  precisaTrocarSenha: false,
};

async function criarAluno(alunos: AlunosService, nome: string): Promise<Aluno> {
  return alunos.create({
    nome,
    email: `${nome.toLowerCase().replace(/\s+/g, '.')}@turmalina.com`,
    matricula: `${Date.now()}-${Math.random()}`,
    turmaId: 'turma-1',
    xp: 0,
  });
}

describe('MissoesService', () => {
  let service: MissoesService;
  let alunos: AlunosService;
  let moedas: MoedasService;

  beforeEach(() => {
    for (const chave of CHAVES) {
      localStorage.removeItem(chave);
    }

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });

    service = TestBed.inject(MissoesService);
    alunos = TestBed.inject(AlunosService);
    moedas = TestBed.inject(MoedasService);
  });

  async function criarMissaoPublicada(): Promise<string> {
    const missao = await service.criarMissao({
      nome: 'Feira de ciências',
      descricao: 'Apresentar um experimento.',
      instrucoes: 'Forme um grupo.',
      tipo: 'individual',
      turmaId: 'turma-1',
      disciplinaId: 'disciplina-1',
      indicador: '',
      xpRecompensa: 15,
      moedasRecompensa: 5,
      status: 'publicada',
      inicioEm: null,
      fimEm: null,
    });
    return missao.id;
  }

  it('conclui a missão uma única vez e concede as recompensas', async () => {
    const aluno = await criarAluno(alunos, 'Ana Lima');
    const missaoId = await criarMissaoPublicada();

    const concluidas = await service.concluir(missaoId, [aluno.id], autor);
    expect(concluidas.length).toBe(1);
    expect(service.alunoConcluiu(missaoId, aluno.id)).toBeTrue();
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.xp).toBe(15);
    expect(moedas.saldoDoAluno(aluno.id)).toBe(5);

    const repetidas = await service.concluir(missaoId, [aluno.id], autor);
    expect(repetidas).toEqual([]);
    expect(service.totalConclusoes()).toBe(1);
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.xp).toBe(15);
  });

  it('não exibe missões em rascunho para o aluno', async () => {
    const aluno = await criarAluno(alunos, 'Bruno Souza');
    const missao = await service.criarMissao({
      nome: 'Missão secreta',
      descricao: 'Ainda não publicada.',
      instrucoes: '',
      tipo: 'turma',
      turmaId: 'turma-1',
      disciplinaId: 'disciplina-1',
      indicador: '',
      xpRecompensa: 10,
      moedasRecompensa: 0,
      status: 'rascunho',
      inicioEm: null,
      fimEm: null,
    });

    expect(service.missoesVisiveisDoAluno(aluno.id, 'turma-1')).toEqual([]);
    expect(service.missoesVisiveisDaTurmaEDisciplina('turma-1', 'disciplina-1')).toEqual([]);
    expect(missao.status).toBe('rascunho');
  });

  it('recusa concluir missão encerrada', async () => {
    const aluno = await criarAluno(alunos, 'Carla Dias');
    const missaoId = await criarMissaoPublicada();
    await service.encerrar(missaoId);

    await expectAsync(service.concluir(missaoId, [aluno.id], autor)).toBeRejectedWithError(
      'Esta missão não está publicada ou já foi encerrada.',
    );
  });

  it('conclui missão coletiva para todos os alunos ativos', async () => {
    const primeiro = await criarAluno(alunos, 'Diego Alves');
    const segundo = await criarAluno(alunos, 'Elisa Prado');
    const inativo = await criarAluno(alunos, 'Felipe Rocha');
    await alunos.update(inativo.id, { ativo: false });

    const missao = await service.criarMissao({
      nome: 'Dia da cooperação',
      descricao: 'Todos participam.',
      instrucoes: '',
      tipo: 'turma',
      turmaId: 'turma-1',
      disciplinaId: 'disciplina-1',
      indicador: '',
      xpRecompensa: 10,
      moedasRecompensa: 0,
      status: 'publicada',
      inicioEm: null,
      fimEm: null,
    });

    const concluidas = await service.concluirParaTurma(missao.id, autor);

    expect(concluidas.length).toBe(2);
    expect(service.alunoConcluiu(missao.id, primeiro.id)).toBeTrue();
    expect(service.alunoConcluiu(missao.id, segundo.id)).toBeTrue();
    expect(service.alunoConcluiu(missao.id, inativo.id)).toBeFalse();
  });

  it('revoga a conclusão estornando XP e moedas', async () => {
    const aluno = await criarAluno(alunos, 'Gabi Nunes');
    const missaoId = await criarMissaoPublicada();
    const [conclusao] = await service.concluir(missaoId, [aluno.id], autor);

    await service.revogar(conclusao.id, autor);

    expect(service.alunoConcluiu(missaoId, aluno.id)).toBeFalse();
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.xp).toBe(0);
    expect(moedas.saldoDoAluno(aluno.id)).toBe(0);
  });

  it('arquiva a missão sem removê-la do histórico', async () => {
    const missaoId = await criarMissaoPublicada();

    await service.arquivar(missaoId);

    const missao = service.porId(missaoId);
    expect(missao?.status).toBe('arquivada');
    expect(service.missoesVisiveisDaTurmaEDisciplina('turma-1', 'disciplina-1')).toEqual([]);
  });
});
