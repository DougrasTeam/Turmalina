import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthRepository } from '../../../core/auth/data-access/auth.repository';
import { MockAuthRepository } from '../../../core/auth/data-access/mock-auth.repository';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { MoedasService } from '../../../core/services/moedas.service';
import { MoedasAlunoComponent } from './moedas-aluno.component';

const CHAVES = [
  'turmalina.moedas',
  'turmalina.alunos',
  'turmalina.auditoria',
  'turmalina.sessao',
];

describe('MoedasAlunoComponent', () => {
  let alunos: AlunosService;
  let auth: AuthService;
  let moedas: MoedasService;

  beforeEach(async () => {
    for (const chave of CHAVES) {
      localStorage.removeItem(chave);
    }

    await TestBed.configureTestingModule({
      imports: [MoedasAlunoComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    }).compileComponents();

    alunos = TestBed.inject(AlunosService);
    auth = TestBed.inject(AuthService);
    moedas = TestBed.inject(MoedasService);

    await alunos.load();
    await moedas.load();
    await alunos.create({
      nome: 'Carla Aluna',
      email: 'aluno@turmalina.com',
      matricula: '2026-1',
      turmaId: 'turma-1',
    });
    await auth.entrar({ email: 'aluno@turmalina.com', senha: 'turmalina' });
  });

  function render(): ComponentFixture<MoedasAlunoComponent> {
    const fixture = TestBed.createComponent(MoedasAlunoComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('mostra o saldo inicial em zero', () => {
    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Minhas moedas');
    expect(texto).toContain('Carla Aluna');
    expect(texto).toContain('Nenhuma movimentação');
  });

  it('exibe o extrato com origem e delta da movimentação', async () => {
    const aluno = alunos.alunos().find((item) => item.email === 'aluno@turmalina.com')!;
    await moedas.ajustar({
      alunoId: aluno.id,
      turmaId: 'turma-1',
      delta: 15,
      origem: 'manual',
      descricao: 'Troca por material extra.',
      autorId: null,
      autorNome: 'Ana Professora',
      idempotencyKey: '',
      estornoDe: null,
      referenciaId: null,
    });

    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Ajuste manual');
    expect(texto).toContain('Troca por material extra.');
    expect(texto).toContain('+15 moedas');
  });

  it('exibe mensagem quando a conta de aluno não é localizada', async () => {
    await auth.sair();
    await auth.entrar({ email: 'professor@turmalina.com', senha: 'turmalina' });

    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Conta de aluno não localizada');
  });
});
