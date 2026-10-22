import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { EMAIL_ALUNO_DEMO, EMAIL_PROFESSOR_DEMO } from '../auth/contas-demo';
import { Aluno, Usuario } from '../models';
import { AlunosService } from './alunos.service';
import { AuthService } from './auth.service';
import { GamificacaoService } from './gamificacao.service';

const autor: Usuario = {
  id: 'user-prof-1',
  nome: 'Ana Professora',
  email: 'ana@turmalina.com',
  papel: 'professor',
  ativo: true,
  precisaTrocarSenha: false,
};

async function criarAluno(alunos: AlunosService, nome: string, turmaId = 'turma-1'): Promise<Aluno> {
  return alunos.create({
    nome,
    email: `${nome.toLowerCase().replace(/\s+/g, '.')}@turmalina.com`,
    matricula: `${Date.now()}-${Math.random()}`,
    turmaId,
    xp: 0,
  });
}

describe('GamificacaoService', () => {
  let service: GamificacaoService;
  let alunos: AlunosService;
  let auth: AuthService;

  beforeEach(async () => {
    localStorage.removeItem('turmalina.acoes-gamificacao');
    localStorage.removeItem('turmalina.eventos-xp');
    localStorage.removeItem('turmalina.alunos');
    localStorage.removeItem('turmalina.auditoria');
    localStorage.removeItem('turmalina.gamificacao.inicializado');

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });

    service = TestBed.inject(GamificacaoService);
    alunos = TestBed.inject(AlunosService);
    auth = TestBed.inject(AuthService);

    // O catálogo de ações é semeado apenas pela equipe; autentica como professor.
    await auth.entrar({ email: EMAIL_PROFESSOR_DEMO, senha: 'turmalina' });
  });

  it('semeia as ações padrão na primeira carga', async () => {
    await service.load();

    expect(service.totalAcoes()).toBeGreaterThan(0);
    expect(service.acoesAtivas().length).toBe(service.totalAcoes());
  });

  it('cria uma ação e impede nomes duplicados', async () => {
    await service.load();
    const acao = await service.criarAcao({
      nome: 'Leitura compartilhada',
      icone: 'menu_book',
      valorXp: 5,
      indicador: 'leitura',
      ativa: true,
    });

    expect(acao.nome).toBe('Leitura compartilhada');
    await expectAsync(
      service.criarAcao({
        nome: 'Leitura compartilhada',
        icone: 'menu_book',
        valorXp: 5,
        indicador: 'leitura',
        ativa: true,
      }),
    ).toBeRejected();
  });

  it('registra XP para vários alunos e atualiza o saldo', async () => {
    await service.load();
    const acao = await service.criarAcao({
      nome: 'Participação',
      icone: 'star',
      valorXp: 10,
      indicador: 'participacao',
      ativa: true,
    });
    const primeiro = await criarAluno(alunos, 'Ana Lima');
    const segundo = await criarAluno(alunos, 'Bruno Souza');

    const eventos = await service.registrarPontuacao(acao.id, [primeiro.id, segundo.id], autor);

    expect(eventos.length).toBe(2);
    expect(eventos[0].deltaXp).toBe(10);
    expect(alunos.alunos().find((aluno) => aluno.id === primeiro.id)?.xp).toBe(10);
    expect(alunos.alunos().find((aluno) => aluno.id === segundo.id)?.xp).toBe(10);
  });

  it('não duplica o lançamento ao reenviar a mesma chave de lote', async () => {
    await service.load();
    const acao = await service.criarAcao({
      nome: 'Colaboração',
      icone: 'groups',
      valorXp: 15,
      indicador: 'colaboracao',
      ativa: true,
    });
    const aluno = await criarAluno(alunos, 'Carla Dias');
    const chaveLote = 'lote-teste';

    await service.registrarPontuacao(acao.id, [aluno.id], autor, chaveLote);
    const repetidos = await service.registrarPontuacao(acao.id, [aluno.id], autor, chaveLote);

    expect(repetidos).toEqual([]);
    expect(service.totalEventos()).toBe(1);
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.xp).toBe(15);
  });

  it('recusa lançamento em ação desativada', async () => {
    await service.load();
    const acao = await service.criarAcao({
      nome: 'Ação temporária',
      icone: 'bolt',
      valorXp: 5,
      indicador: 'esforco',
      ativa: true,
    });
    const aluno = await criarAluno(alunos, 'Diego Alves');
    await service.alternarAtiva(acao.id);

    await expectAsync(
      service.registrarPontuacao(acao.id, [aluno.id], autor),
    ).toBeRejectedWithError('Esta ação está desativada e não pode ser aplicada.');
  });

  it('corrige um lançamento por estorno sem apagar o original', async () => {
    await service.load();
    const acao = await service.criarAcao({
      nome: 'Ajuda',
      icone: 'volunteer_activism',
      valorXp: 20,
      indicador: 'solidariedade',
      ativa: true,
    });
    const aluno = await criarAluno(alunos, 'Elisa Prado');
    const [original] = await service.registrarPontuacao(acao.id, [aluno.id], autor);

    const estorno = await service.estornar(original.id, autor);

    expect(estorno.deltaXp).toBe(-20);
    expect(estorno.estornoDe).toBe(original.id);
    expect(service.totalEventos()).toBe(2);
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.xp).toBe(0);
    expect(service.estaEstornado(original.id)).toBeTrue();

    await expectAsync(service.estornar(original.id, autor)).toBeRejectedWithError(
      'Este lançamento já foi estornado.',
    );
  });

  it('não permite estornar um estorno', async () => {
    await service.load();
    const acao = await service.criarAcao({
      nome: 'Pontualidade',
      icone: 'check_circle',
      valorXp: 10,
      indicador: 'organizacao',
      ativa: true,
    });
    const aluno = await criarAluno(alunos, 'Felipe Rocha');
    const [original] = await service.registrarPontuacao(acao.id, [aluno.id], autor);
    const estorno = await service.estornar(original.id, autor);

    await expectAsync(service.estornar(estorno.id, autor)).toBeRejectedWithError(
      'Um estorno não pode ser estornado.',
    );
  });

  it('mantém o XP em zero ao aplicar ação negativa em aluno sem saldo', async () => {
    await service.load();
    const acao = await service.criarAcao({
      nome: 'Tarefa não entregue',
      icone: 'assignment_late',
      valorXp: -5,
      indicador: 'responsabilidade',
      ativa: true,
    });
    const aluno = await criarAluno(alunos, 'Gabi Nunes');

    const [evento] = await service.registrarPontuacao(acao.id, [aluno.id], autor);

    expect(evento.deltaXp).toBe(-5);
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.xp).toBe(0);
  });

  it('recalcula o XP dos alunos ao remover os lançamentos de uma turma', async () => {
    await service.load();
    const acao = await service.criarAcao({
      nome: 'Equipe',
      icone: 'groups',
      valorXp: 10,
      indicador: 'colaboracao',
      ativa: true,
    });
    const aluno = await criarAluno(alunos, 'Hugo Martins', 'turma-9');
    await service.registrarPontuacao(acao.id, [aluno.id], autor);
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.xp).toBe(10);

    await service.removerEventosDeTurmas();

    expect(service.totalEventos()).toBe(0);
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.xp).toBe(0);
  });

  it('não semeia ações padrão quando o usuário é aluno', async () => {
    await auth.sair();
    await auth.entrar({ email: EMAIL_ALUNO_DEMO, senha: 'turmalina' });

    await service.load();

    expect(service.totalAcoes()).toBe(0);
  });
});
