import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthRepository } from '../../../core/auth/data-access/auth.repository';
import { MockAuthRepository } from '../../../core/auth/data-access/mock-auth.repository';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConquistasService } from '../../../core/services/conquistas.service';
import { ConquistasComponent } from './conquistas.component';

const CHAVES = [
  'turmalina.conquistas',
  'turmalina.conquistas-aluno',
  'turmalina.conquistas.inicializado',
  'turmalina.acoes-gamificacao',
  'turmalina.eventos-xp',
  'turmalina.alunos',
  'turmalina.auditoria',
  'turmalina.sessao',
];

function botaoPorTexto(fixture: ComponentFixture<ConquistasComponent>, texto: string): HTMLButtonElement | undefined {
  const botoes = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  return botoes.find((botao) => botao.textContent?.includes(texto));
}

describe('ConquistasComponent', () => {
  let alunos: AlunosService;
  let conquistas: ConquistasService;

  beforeEach(async () => {
    for (const chave of CHAVES) {
      localStorage.removeItem(chave);
    }

    await TestBed.configureTestingModule({
      imports: [ConquistasComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    }).compileComponents();

    alunos = TestBed.inject(AlunosService);
    conquistas = TestBed.inject(ConquistasService);
    const auth = TestBed.inject(AuthService);

    await alunos.load();
    await conquistas.load();
    await auth.entrar({ email: 'adm@turmalina.com', senha: 'turmalina' });
  });

  function render(): ComponentFixture<ConquistasComponent> {
    const fixture = TestBed.createComponent(ConquistasComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('lista as conquistas semeadas e mostra o título', () => {
    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Conquistas');
    expect(texto).toContain(`conquista(s)`);
    expect(conquistas.totalConquistas()).toBeGreaterThan(0);
  });

  it('abre o modal de nova conquista ao clicar em Nova conquista', () => {
    const fixture = render();

    botaoPorTexto(fixture, 'Nova conquista')!.click();
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Nova conquista');
    expect(fixture.nativeElement.querySelector('#conquista-nome')).toBeTruthy();
  });

  it('abre o modal de desbloqueio ao acionar o botão da linha', async () => {
    const aluno = await alunos.create({
      nome: 'Ana Lima',
      email: 'ana.lima@turmalina.com',
      matricula: '2026-9',
      turmaId: 'turma-1',
    });
    expect(aluno.id).toBeTruthy();

    const fixture = render();
    const botaoDesbloquear = fixture.nativeElement.querySelector(
      'button[title="Desbloquear para alunos"]',
    ) as HTMLButtonElement | null;

    botaoDesbloquear!.click();
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Desbloquear:');
    expect(texto).toContain('Alunos que já têm esta conquista');
  });

  it('mostra estado vazio quando não há conquistas', async () => {
    await conquistas.removerTodasConquistas();

    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Nenhuma conquista cadastrada');
  });
});

