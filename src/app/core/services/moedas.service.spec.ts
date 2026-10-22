import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { Aluno } from '../models';
import { AlunosService } from './alunos.service';
import { MoedasService } from './moedas.service';

const CHAVES = [
  'turmalina.moedas',
  'turmalina.alunos',
  'turmalina.auditoria',
];

async function criarAluno(alunos: AlunosService, nome: string, turmaId = 'turma-1'): Promise<Aluno> {
  return alunos.create({
    nome,
    email: `${nome.toLowerCase().replace(/\s+/g, '.')}@turmalina.com`,
    matricula: `${Date.now()}-${Math.random()}`,
    turmaId,
    xp: 0,
  });
}

describe('MoedasService', () => {
  let service: MoedasService;
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

    service = TestBed.inject(MoedasService);
    alunos = TestBed.inject(AlunosService);
  });

  it('registra um ajuste manual e atualiza o saldo materializado', async () => {
    await service.load();
    const aluno = await criarAluno(alunos, 'Ana Lima');

    await service.ajustar({
      alunoId: aluno.id,
      turmaId: 'turma-1',
      delta: 20,
      origem: 'manual',
      descricao: 'Bônus de participação.',
      autorId: null,
      autorNome: 'Ana Professora',
      idempotencyKey: '',
      estornoDe: null,
      referenciaId: null,
    });

    expect(service.saldoDoAluno(aluno.id)).toBe(20);
    expect(alunos.alunos().find((item) => item.id === aluno.id)?.moedas).toBe(20);
  });

  it('recusa um ajuste com valor zero ou sem descrição', async () => {
    await service.load();
    const aluno = await criarAluno(alunos, 'Bruno Souza');

    await expectAsync(
      service.ajustar({
        alunoId: aluno.id,
        turmaId: 'turma-1',
        delta: 0,
        origem: 'manual',
        descricao: '',
        autorId: null,
        autorNome: 'Ana Professora',
        idempotencyKey: '',
        estornoDe: null,
        referenciaId: null,
      }),
    ).toBeRejected();
  });

  it('concede moedas por nível de forma idempotente', async () => {
    await service.load();
    const aluno = await criarAluno(alunos, 'Carla Dias');

    const primeira = await service.concederPorNivel(aluno.id, 2, 'turma-1');
    const segunda = await service.concederPorNivel(aluno.id, 2, 'turma-1');

    expect(primeira).not.toBeNull();
    expect(segunda).toBeNull();
    expect(service.saldoDoAluno(aluno.id)).toBe(service.moedasPorNivel);
  });

  it('corrige por estorno sem apagar a movimentação original', async () => {
    await service.load();
    const aluno = await criarAluno(alunos, 'Diego Alves');
    const original = await service.ajustar({
      alunoId: aluno.id,
      turmaId: 'turma-1',
      delta: 30,
      origem: 'manual',
      descricao: 'Crédito indevido.',
      autorId: null,
      autorNome: 'Ana Professora',
      idempotencyKey: '',
      estornoDe: null,
      referenciaId: null,
    });

    const estorno = await service.estornar(original.id, 'Ana Professora');

    expect(estorno.delta).toBe(-30);
    expect(estorno.estornoDe).toBe(original.id);
    expect(service.total()).toBe(2);
    expect(service.saldoDoAluno(aluno.id)).toBe(0);
    expect(service.estaEstornada(original.id)).toBeTrue();
  });

  it('não permite estornar a mesma movimentação duas vezes', async () => {
    await service.load();
    const aluno = await criarAluno(alunos, 'Elisa Prado');
    const original = await service.ajustar({
      alunoId: aluno.id,
      turmaId: 'turma-1',
      delta: 10,
      origem: 'manual',
      descricao: 'Crédito.',
      autorId: null,
      autorNome: 'Ana Professora',
      idempotencyKey: '',
      estornoDe: null,
      referenciaId: null,
    });
    await service.estornar(original.id, 'Ana Professora');

    await expectAsync(service.estornar(original.id, 'Ana Professora')).toBeRejectedWithError(
      'Esta movimentação já foi estornada.',
    );
  });

  it('mantém o saldo em zero ao aplicar débito maior que o crédito', async () => {
    await service.load();
    const aluno = await criarAluno(alunos, 'Felipe Rocha');

    await service.ajustar({
      alunoId: aluno.id,
      turmaId: 'turma-1',
      delta: -15,
      origem: 'manual',
      descricao: 'Débito de teste.',
      autorId: null,
      autorNome: 'Ana Professora',
      idempotencyKey: '',
      estornoDe: null,
      referenciaId: null,
    });

    expect(service.saldoDoAluno(aluno.id)).toBe(0);
  });

  it('remove as movimentações de turma e recalcula os saldos afetados', async () => {
    await service.load();
    const aluno = await criarAluno(alunos, 'Gabi Nunes', 'turma-9');
    await service.ajustar({
      alunoId: aluno.id,
      turmaId: 'turma-9',
      delta: 25,
      origem: 'manual',
      descricao: 'Crédito de turma.',
      autorId: null,
      autorNome: 'Ana Professora',
      idempotencyKey: '',
      estornoDe: null,
      referenciaId: null,
    });
    expect(service.saldoDoAluno(aluno.id)).toBe(25);

    await service.removerDeTurmas();

    expect(service.total()).toBe(0);
    expect(service.saldoDoAluno(aluno.id)).toBe(0);
  });
});
