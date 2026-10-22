import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthRepository } from '../../../core/auth/data-access/auth.repository';
import { MockAuthRepository } from '../../../core/auth/data-access/mock-auth.repository';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { MoedasService } from '../../../core/services/moedas.service';
import { MoedasComponent } from './moedas.component';

const CHAVES = [
  'turmalina.moedas',
  'turmalina.alunos',
  'turmalina.auditoria',
  'turmalina.sessao',
];

function botaoPorTexto(fixture: ComponentFixture<MoedasComponent>, texto: string): HTMLButtonElement | undefined {
  const botoes = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  return botoes.find((botao) => botao.textContent?.includes(texto));
}

describe('MoedasComponent', () => {
  let alunos: AlunosService;
  let moedas: MoedasService;

  beforeEach(async () => {
    for (const chave of CHAVES) {
      localStorage.removeItem(chave);
    }

    await TestBed.configureTestingModule({
      imports: [MoedasComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    }).compileComponents();

    alunos = TestBed.inject(AlunosService);
    moedas = TestBed.inject(MoedasService);
    const auth = TestBed.inject(AuthService);

    await alunos.load();
    await moedas.load();
    await auth.entrar({ email: 'adm@turmalina.com', senha: 'turmalina' });
  });

  function render(): ComponentFixture<MoedasComponent> {
    const fixture = TestBed.createComponent(MoedasComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renderiza o título e o estado vazio do extrato', () => {
    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Moedas virtuais');
    expect(texto).toContain('Nenhuma movimentação');
  });

  it('abre o formulário de ajuste ao clicar em Ajustar moedas', () => {
    const fixture = render();

    botaoPorTexto(fixture, 'Ajustar moedas')!.click();
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Ajuste manual de moedas');
    expect(fixture.nativeElement.querySelector('#moedas-aluno')).toBeTruthy();
  });

  it('lista as movimentações no extrato com a origem', async () => {
    const aluno = await alunos.create({
      nome: 'Ana Lima',
      email: 'ana.lima@turmalina.com',
      matricula: '2026-9',
      turmaId: 'turma-1',
    });
    await moedas.ajustar({
      alunoId: aluno.id,
      turmaId: 'turma-1',
      delta: 10,
      origem: 'manual',
      descricao: 'Crédito de teste.',
      autorId: null,
      autorNome: 'Ana Administradora',
      idempotencyKey: '',
      estornoDe: null,
      referenciaId: null,
    });

    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Ana Lima');
    expect(texto).toContain('Ajuste manual');
    expect(texto).toContain('+10');
  });

  it('filtra o extrato pela origem selecionada', async () => {
    const aluno = await alunos.create({
      nome: 'Bruno Souza',
      email: 'bruno.souza@turmalina.com',
      matricula: '2026-10',
      turmaId: 'turma-1',
    });
    await moedas.ajustar({
      alunoId: aluno.id,
      turmaId: 'turma-1',
      delta: 10,
      origem: 'manual',
      descricao: 'Crédito manual.',
      autorId: null,
      autorNome: 'Ana Administradora',
      idempotencyKey: '',
      estornoDe: null,
      referenciaId: null,
    });

    const fixture = render();
    const select = fixture.nativeElement.querySelector('#moedas-origem') as HTMLSelectElement;
    select.value = 'nivel';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(moedas.total()).toBe(1);
    expect((fixture.nativeElement.textContent as string)).not.toContain('Crédito manual.');
  });
});
