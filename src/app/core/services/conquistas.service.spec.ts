import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { Aluno, Usuario } from '../models';
import { AlunosService } from './alunos.service';
import { ConquistasService } from './conquistas.service';

const CHAVES = [
  'turmalina.conquistas',
  'turmalina.conquistas-aluno',
  'turmalina.conquistas.inicializado',
  'turmalina.acoes-gamificacao',
  'turmalina.eventos-xp',
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

describe('ConquistasService', () => {
  let service: ConquistasService;
  let alunos: AlunosService;

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

    service = TestBed.inject(ConquistasService);
    alunos = TestBed.inject(AlunosService);
  });

  it('semeia as conquistas padrão na primeira carga', async () => {
    await service.load();

    expect(service.totalConquistas()).toBeGreaterThan(0);
    expect(service.conquistasAtivas().length).toBe(service.totalConquistas());
  });

  it('cria uma conquista e impede nomes duplicados', async () => {
    await service.load();
    await service.criarConquista({
      nome: 'Leitor de gibis',
      emoji: '📚',
      descricao: 'Leu um livro no mês.',
      bonusXp: 10,
      ativa: true,
    });

    await expectAsync(
      service.criarConquista({
        nome: 'Leitor de gibis',
        emoji: '📚',
        descricao: 'Duplicada.',
        bonusXp: 10,
        ativa: true,
      }),
    ).toBeRejected();
  });

  it('desbloqueia para um aluno e concede o bônus de XP', async () => {
    await service.load();
    const conquista = await service.criarConquista({
      nome: 'Ajudante de classe',
      emoji: '🤝',
      descricao: 'Ajudou um colega.',
      bonusXp: 15,
      ativa: true,
    });
    const aluno = await criarAluno(alunos, 'Ana Lima');

    const criados = await service.desbloquear(conquista.id, [aluno.id], autor);

    expect(criados.length).toBe(1);
    expect(service.alunoTemConquista(aluno.id, conquista.id)).toBeTrue();
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.xp).toBe(15);
  });

  it('não duplica o desbloqueio para o mesmo aluno', async () => {
    await service.load();
    const conquista = await service.criarConquista({
      nome: 'Sempre pontual',
      emoji: '⏰',
      descricao: 'Chegou no prazo.',
      bonusXp: 10,
      ativa: true,
    });
    const aluno = await criarAluno(alunos, 'Bruno Souza');

    await service.desbloquear(conquista.id, [aluno.id], autor);
    const repetidos = await service.desbloquear(conquista.id, [aluno.id], autor);

    expect(repetidos).toEqual([]);
    expect(service.totalDesbloqueios()).toBe(1);
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.xp).toBe(10);
  });

  it('recusa desbloquear conquista desativada', async () => {
    await service.load();
    const conquista = await service.criarConquista({
      nome: 'Temporária',
      emoji: '🌟',
      descricao: 'Teste.',
      bonusXp: 5,
      ativa: true,
    });
    const aluno = await criarAluno(alunos, 'Carla Dias');
    await service.alternarAtiva(conquista.id);

    await expectAsync(
      service.desbloquear(conquista.id, [aluno.id], autor),
    ).toBeRejectedWithError('Esta conquista está desativada.');
  });

  it('reverte um desbloqueio com estorno do XP', async () => {
    await service.load();
    const conquista = await service.criarConquista({
      nome: 'Mente criativa',
      emoji: '🎨',
      descricao: 'Resolveu de outro jeito.',
      bonusXp: 20,
      ativa: true,
    });
    const aluno = await criarAluno(alunos, 'Diego Alves');
    const [desbloqueio] = await service.desbloquear(conquista.id, [aluno.id], autor);

    await service.reverter(desbloqueio.id, autor);

    expect(service.alunoTemConquista(aluno.id, conquista.id)).toBeFalse();
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.xp).toBe(0);
  });

  it('remove uma conquista e recalcula o XP dos alunos afetados', async () => {
    await service.load();
    const conquista = await service.criarConquista({
      nome: 'Liderança de grupo',
      emoji: '👑',
      descricao: 'Organizou o grupo.',
      bonusXp: 15,
      ativa: true,
    });
    const aluno = await criarAluno(alunos, 'Elisa Prado');
    await service.desbloquear(conquista.id, [aluno.id], autor);
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.xp).toBe(15);

    await service.removerConquista(conquista.id);

    expect(service.porId(conquista.id)).toBeUndefined();
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.xp).toBe(0);
  });

  it('conta quantos alunos desbloquearam a conquista', async () => {
    await service.load();
    const conquista = await service.criarConquista({
      nome: 'Muito persistente',
      emoji: '💪',
      descricao: 'Não desistiu.',
      bonusXp: 15,
      ativa: true,
    });
    const primeiro = await criarAluno(alunos, 'Felipe Rocha');
    const segundo = await criarAluno(alunos, 'Gabi Nunes');

    await service.desbloquear(conquista.id, [primeiro.id, segundo.id], autor);

    expect(service.quantidadeDeAlunos(conquista.id)).toBe(2);
  });
});

