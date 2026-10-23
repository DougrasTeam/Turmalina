import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { Aluno, Usuario } from '../models';
import { AlunosService } from './alunos.service';
import { EquipesService } from './equipes.service';
import { TurmasService } from './turmas.service';

const CHAVES = [
  'turmalina.equipes',
  'turmalina.equipe-membros',
  'turmalina.alunos',
  'turmalina.turmas',
  'turmalina.periodos-letivos',
  'turmalina.acoes-gamificacao',
  'turmalina.eventos-xp',
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

function criarAlunoEm(alunos: AlunosService, nome: string, turmaId: string): Promise<Aluno> {
  return alunos.create({
    nome,
    email: `${nome.toLowerCase().replace(/\s+/g, '.')}@turmalina.com`,
    matricula: `${Date.now()}-${Math.random()}`,
    turmaId,
    xp: 0,
  });
}

describe('EquipesService', () => {
  let service: EquipesService;
  let alunos: AlunosService;
  let turmas: TurmasService;
  let turmaId: string;

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

    service = TestBed.inject(EquipesService);
    alunos = TestBed.inject(AlunosService);
    turmas = TestBed.inject(TurmasService);

    await turmas.load();
    turmaId = (
      await turmas.create({ nome: 'Turma Equipes', codigo: 'EQ-1', turno: 'manha' })
    ).id;
    await service.load();
  });

  it('cria uma equipe e impede nomes duplicados na mesma turma/período', async () => {
    await service.criarEquipe({
      nome: 'Leões',
      emoji: '🦁',
      cor: '#2563EB',
      ativa: true,
      turmaId,
      disciplinaId: null,
      periodoLetivoId: null,
    });

    await expectAsync(
      service.criarEquipe({
        nome: 'Leões',
        emoji: '🐯',
        cor: '#DC2626',
        ativa: true,
        turmaId,
        disciplinaId: null,
        periodoLetivoId: null,
      }),
    ).toBeRejected();

    expect(service.totalEquipes()).toBe(1);
  });

  it('associa um aluno à equipe e registra o vínculo', async () => {
    const equipe = await service.criarEquipe({
      nome: 'Falcões',
      emoji: '🦅',
      cor: '#16A34A',
      ativa: true,
      turmaId,
      disciplinaId: null,
      periodoLetivoId: null,
    });
    const aluno = await criarAlunoEm(alunos, 'Ana Lima', turmaId);

    const membro = await service.associarAluno(equipe.id, aluno.id, autor);

    expect(membro.ativa).toBeTrue();
    expect(membro.alunoId).toBe(aluno.id);
    expect(service.membrosDaEquipe(equipe.id).length).toBe(1);
  });

  it('recusa associar aluno de outra turma', async () => {
    const outraTurma = await turmas.create({
      nome: 'Turma Alheia',
      codigo: 'EQ-2',
      turno: 'tarde',
    });
    const equipe = await service.criarEquipe({
      nome: 'Tubarões',
      emoji: '🦈',
      cor: '#0EA5E9',
      ativa: true,
      turmaId,
      disciplinaId: null,
      periodoLetivoId: null,
    });
    const alunoAlheio = await criarAlunoEm(alunos, 'Bruno Souza', outraTurma.id);

    await expectAsync(
      service.associarAluno(equipe.id, alunoAlheio.id, autor),
    ).toBeRejected();
  });

  it('transfere o aluno encerrando o vínculo anterior', async () => {
    const origem = await service.criarEquipe({
      nome: 'Leões',
      emoji: '🦁',
      cor: '#2563EB',
      ativa: true,
      turmaId,
      disciplinaId: null,
      periodoLetivoId: null,
    });
    const destino = await service.criarEquipe({
      nome: 'Tigres',
      emoji: '🐯',
      cor: '#F97316',
      ativa: true,
      turmaId,
      disciplinaId: null,
      periodoLetivoId: null,
    });
    const aluno = await criarAlunoEm(alunos, 'Carla Dias', turmaId);

    await service.associarAluno(origem.id, aluno.id, autor);
    await service.associarAluno(destino.id, aluno.id, autor);

    const ativo = service.equipeAtivaDoAluno(aluno.id, turmaId, null);
    expect(ativo?.equipeId).toBe(destino.id);
    expect(service.membrosDaEquipe(origem.id, true).length).toBe(0);
    expect(service.historicoDoAluno(aluno.id).length).toBe(2);
  });

  it('sorteia apenas alunos sem equipe entre as equipes ativas, equilibrando os tamanhos', async () => {
    const leoes = await service.criarEquipe({
      nome: 'Leões',
      emoji: '🦁',
      cor: '#2563EB',
      ativa: true,
      turmaId,
      disciplinaId: null,
      periodoLetivoId: null,
    });
    const tigres = await service.criarEquipe({
      nome: 'Tigres',
      emoji: '🐯',
      cor: '#F97316',
      ativa: true,
      turmaId,
      disciplinaId: null,
      periodoLetivoId: null,
    });
    const nomes = ['Ana Lima', 'Bruno Souza', 'Carla Dias', 'Diego Reis', 'Elisa Prado'];
    const alunosDaTurma: Aluno[] = [];
    for (const nome of nomes) {
      alunosDaTurma.push(await criarAlunoEm(alunos, nome, turmaId));
    }
    await service.associarAluno(leoes.id, alunosDaTurma[0].id, autor);

    const outraTurma = await turmas.create({
      nome: 'Turma Alheia',
      codigo: 'EQ-2',
      turno: 'tarde',
    });
    const alunoAlheio = await criarAlunoEm(alunos, 'Forasteiro', outraTurma.id);

    const resultado = await service.sortearAlunos(
      {
        turmaId,
        periodoLetivoId: null,
        disciplinaId: null,
        alunoIds: [...alunosDaTurma.map((aluno) => aluno.id), alunoAlheio.id],
      },
      autor,
    );

    const tamanhos = [leoes, tigres]
      .map((equipe) => service.membrosDaEquipe(equipe.id, true).length)
      .sort((primeiro, segundo) => primeiro - segundo);

    expect(resultado.quantidadeSorteados).toBe(4);
    expect(tamanhos).toEqual([2, 3]);
    expect(service.equipeAtivaDoAluno(alunosDaTurma[0].id, turmaId, null)?.equipeId).toBe(
      leoes.id,
    );
    expect(service.equipeAtivaDoAluno(alunoAlheio.id, outraTurma.id, null)).toBeUndefined();
  });

  it('recusa o sorteio quando não há equipe ativa', async () => {
    const equipe = await service.criarEquipe({
      nome: 'Desativada',
      emoji: '🐺',
      cor: '#64748B',
      ativa: true,
      turmaId,
      disciplinaId: null,
      periodoLetivoId: null,
    });
    await service.alternarAtiva(equipe.id);
    const aluno = await criarAlunoEm(alunos, 'Ana Lima', turmaId);

    await expectAsync(
      service.sortearAlunos(
        {
          turmaId,
          periodoLetivoId: null,
          disciplinaId: null,
          alunoIds: [aluno.id],
        },
        autor,
      ),
    ).toBeRejectedWithError('Crie ao menos uma equipe ativa antes de sortear.');
  });

  it('desassocia o aluno sem apagar o histórico', async () => {
    const equipe = await service.criarEquipe({
      nome: 'Panteras',
      emoji: '🐆',
      cor: '#7C3AED',
      ativa: true,
      turmaId,
      disciplinaId: null,
      periodoLetivoId: null,
    });
    const aluno = await criarAlunoEm(alunos, 'Diego Reis', turmaId);
    const membro = await service.associarAluno(equipe.id, aluno.id, autor);

    await service.desassociarAluno(membro.id);

    expect(service.membrosDaEquipe(equipe.id, true).length).toBe(0);
    expect(service.historicoDoAluno(aluno.id).length).toBe(1);
    expect(service.historicoDoAluno(aluno.id)[0].ativa).toBeFalse();
  });

  it('monta o placar por XP acumulado em ordem decrescente', async () => {
    const leoes = await service.criarEquipe({
      nome: 'Leões',
      emoji: '🦁',
      cor: '#2563EB',
      ativa: true,
      turmaId,
      disciplinaId: null,
      periodoLetivoId: null,
    });
    const tigres = await service.criarEquipe({
      nome: 'Tigres',
      emoji: '🐯',
      cor: '#F97316',
      ativa: true,
      turmaId,
      disciplinaId: null,
      periodoLetivoId: null,
    });
    const anaLima = await criarAlunoEm(alunos, 'Ana Lima', turmaId);
    const brunoSouza = await criarAlunoEm(alunos, 'Bruno Souza', turmaId);
    await alunos.update(anaLima.id, { xp: 40 });
    await alunos.update(brunoSouza.id, { xp: 25 });

    await service.associarAluno(leoes.id, anaLima.id, autor);
    await service.associarAluno(tigres.id, brunoSouza.id, autor);

    const placar = service.placar(turmaId, null);

    expect(placar[0].equipe.id).toBe(leoes.id);
    expect(placar[0].xpTotal).toBe(40);
    expect(placar[0].posicao).toBe(1);
    expect(placar[1].equipe.id).toBe(tigres.id);
  });

  it('exclui a equipe removendo seus vínculos', async () => {
    const equipe = await service.criarEquipe({
      nome: 'Águias',
      emoji: '🦅',
      cor: '#16A34A',
      ativa: true,
      turmaId,
      disciplinaId: null,
      periodoLetivoId: null,
    });
    const aluno = await criarAlunoEm(alunos, 'Elisa Prado', turmaId);
    await service.associarAluno(equipe.id, aluno.id, autor);

    await service.removerEquipe(equipe.id);

    expect(service.totalEquipes()).toBe(0);
    expect(service.membrosDaEquipe(equipe.id).length).toBe(0);
    expect(service.totalMembros()).toBe(0);
  });

  it('alterna o estado ativo da equipe', async () => {
    const equipe = await service.criarEquipe({
      nome: 'Lobos',
      emoji: '🐺',
      cor: '#64748B',
      ativa: true,
      turmaId,
      disciplinaId: null,
      periodoLetivoId: null,
    });

    await service.alternarAtiva(equipe.id);

    expect(service.porId(equipe.id)?.ativa).toBeFalse();
  });
});
