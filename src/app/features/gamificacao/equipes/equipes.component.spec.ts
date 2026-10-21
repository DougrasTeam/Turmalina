import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthRepository } from '../../../core/auth/data-access/auth.repository';
import { MockAuthRepository } from '../../../core/auth/data-access/mock-auth.repository';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { EquipesService } from '../../../core/services/equipes.service';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { EquipesComponent } from './equipes.component';

const CHAVES = [
  'turmalina.equipes',
  'turmalina.equipe-membros',
  'turmalina.alunos',
  'turmalina.turmas',
  'turmalina.periodos-letivos',
  'turmalina.acoes-gamificacao',
  'turmalina.eventos-xp',
  'turmalina.auditoria',
  'turmalina.sessao',
];

function botaoPorTexto(
  fixture: ComponentFixture<EquipesComponent>,
  texto: string,
): HTMLButtonElement | undefined {
  const botoes = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  return botoes.find((botao) => botao.textContent?.includes(texto));
}

describe('EquipesComponent', () => {
  let equipes: EquipesService;
  let turmas: TurmasService;
  let periodos: PeriodosLetivosService;
  let turmaId: string;

  beforeEach(async () => {
    for (const chave of CHAVES) {
      localStorage.removeItem(chave);
    }

    await TestBed.configureTestingModule({
      imports: [EquipesComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    }).compileComponents();

    equipes = TestBed.inject(EquipesService);
    turmas = TestBed.inject(TurmasService);
    periodos = TestBed.inject(PeriodosLetivosService);
    const alunos = TestBed.inject(AlunosService);
    const auth = TestBed.inject(AuthService);

    await alunos.load();
    await turmas.load();
    await periodos.load();
    await equipes.load();
    await auth.entrar({ email: 'adm@turmalina.com', senha: 'turmalina' });

    turmaId = (
      await turmas.create({ nome: 'Turma Equipes', codigo: 'EQ-1', turno: 'manha' })
    ).id;
  });

  function render(): ComponentFixture<EquipesComponent> {
    const fixture = TestBed.createComponent(EquipesComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('mostra o título e a turma disponível', () => {
    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Equipes');
    expect(texto).toContain('Placar das equipes');
    expect(turmas.turmas().length).toBeGreaterThan(0);
  });

  it('abre o modal de nova equipe ao clicar em Nova equipe', () => {
    const fixture = render();

    botaoPorTexto(fixture, 'Nova equipe')!.click();
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Nova equipe');
    expect(fixture.nativeElement.querySelector('#equipe-nome')).toBeTruthy();
  });

  it('mostra o estado vazio do placar quando não há equipes', () => {
    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Nenhuma equipe nesta turma/período');
  });

  it('lista uma equipe criada no placar', async () => {
    await equipes.criarEquipe({
      nome: 'Leões',
      emoji: '🦁',
      cor: '#2563EB',
      ativa: true,
      turmaId,
      periodoLetivoId: periodos.ativo()?.id ?? null,
    });

    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Leões');
    expect(texto).toContain('🥇');
  });

  it('abre o modal de membros ao acionar o botão da linha', async () => {
    await equipes.criarEquipe({
      nome: 'Tigres',
      emoji: '🐯',
      cor: '#F97316',
      ativa: true,
      turmaId,
      periodoLetivoId: periodos.ativo()?.id ?? null,
    });

    const fixture = render();
    const botaoMembros = fixture.nativeElement.querySelector(
      'button[title="Gerenciar membros"]',
    ) as HTMLButtonElement | null;

    botaoMembros!.click();
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Membros: Tigres');
    expect(texto).toContain('Adicionar aluno');
  });
});
