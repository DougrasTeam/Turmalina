import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { Aluno, Usuario } from '../models';
import { AlunosService } from './alunos.service';
import { GamificacaoService } from './gamificacao.service';
import { MetasService } from './metas.service';
import { MoedasService } from './moedas.service';

const CHAVES = [
  'turmalina.metas',
  'turmalina.metas-aluno',
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

describe('MetasService', () => {
  let service: MetasService;
  let alunos: AlunosService;
  let gamificacao: GamificacaoService;
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

    service = TestBed.inject(MetasService);
    alunos = TestBed.inject(AlunosService);
    gamificacao = TestBed.inject(GamificacaoService);
    moedas = TestBed.inject(MoedasService);
  });

  async function criarMetaComIndicador(): Promise<string> {
    const meta = await service.criarMeta({
      nome: 'Participação da semana',
      descricao: 'Participar de duas aulas.',
      turmaId: 'turma-1',
      disciplinaId: 'disciplina-1',
      indicador: 'participacao',
      quantidade: 2,
      recompensaXp: 10,
      recompensaMoedas: 5,
      ativa: true,
    });
    return meta.id;
  }

  async function registrarParticipacao(alunoId: string, chaveLote: string): Promise<void> {
    const acao = await gamificacao.criarAcao({
      nome: `Participação ${chaveLote}`,
      icone: 'star',
      valorXp: 5,
      indicador: 'participacao',
      ativa: true,
      turmaId: 'turma-1',
      disciplinaId: 'disciplina-1',
    });
    await gamificacao.registrarPontuacao(acao.id, [alunoId], autor, chaveLote);
  }

  it('calcula o progresso pelos eventos de XP do indicador', async () => {
    const aluno = await criarAluno(alunos, 'Ana Lima');
    const metaId = await criarMetaComIndicador();

    await registrarParticipacao(aluno.id, 'lote-1');
    await registrarParticipacao(aluno.id, 'lote-2');

    const meta = service.porId(metaId);
    expect(meta).toBeDefined();

    const progresso = service.progressoDoAluno(meta!, aluno.id);
    expect(progresso.quantidadeAtual).toBe(2);
    expect(progresso.percentual).toBe(100);
    expect(progresso.status).toBe('disponivel');
  });

  it('não conta eventos estornados no progresso', async () => {
    const aluno = await criarAluno(alunos, 'Bruno Souza');
    const metaId = await criarMetaComIndicador();
    await registrarParticipacao(aluno.id, 'lote-1');

    const evento = gamificacao.eventosDoAluno(aluno.id)[0];
    await gamificacao.estornar(evento.id, autor);

    const progresso = service.progressoDoAluno(service.porId(metaId)!, aluno.id);
    expect(progresso.quantidadeAtual).toBe(0);
    expect(progresso.status).toBe('em-andamento');
  });

  it('concede a recompensa uma única vez e estorna ao revogar', async () => {
    const aluno = await criarAluno(alunos, 'Carla Dias');
    const metaId = await criarMetaComIndicador();
    await registrarParticipacao(aluno.id, 'lote-1');
    await registrarParticipacao(aluno.id, 'lote-2');

    const concessao = await service.conceder(metaId, aluno.id, autor);
    expect(concessao).not.toBeNull();
    expect(service.alunoTemMeta(metaId, aluno.id)).toBeTrue();
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.xp).toBe(20);
    expect(moedas.saldoDoAluno(aluno.id)).toBe(5);

    const repetida = await service.conceder(metaId, aluno.id, autor);
    expect(repetida).toBeNull();
    expect(service.totalConcessoes()).toBe(1);

    await service.revogar(concessao!.id, autor);
    expect(service.alunoTemMeta(metaId, aluno.id)).toBeFalse();
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.xp).toBe(10);
    expect(moedas.saldoDoAluno(aluno.id)).toBe(0);
  });

  it('recusa conceder quando o aluno ainda não atingiu a meta', async () => {
    const aluno = await criarAluno(alunos, 'Diego Alves');
    const metaId = await criarMetaComIndicador();
    await registrarParticipacao(aluno.id, 'lote-1');

    await expectAsync(service.conceder(metaId, aluno.id, autor)).toBeRejectedWithError(
      'O aluno ainda não atingiu o critério desta meta.',
    );
  });
});
