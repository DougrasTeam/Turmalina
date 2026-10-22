import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

import { AuthRepository } from '../../../core/auth/data-access/auth.repository';
import { MockAuthRepository } from '../../../core/auth/data-access/mock-auth.repository';
import { Aluno } from '../../../core/models';
import { Equipe } from '../../../core/models/equipes.model';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { EquipesService } from '../../../core/services/equipes.service';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { EquipesComponent } from './equipes.component';

interface RotaDeTesteControlavel {
  parent: null;
  paramMap: Observable<ParamMap>;
  queryParamMap: Observable<ParamMap>;
  readonly snapshot: { paramMap: ParamMap; queryParamMap: ParamMap };
  definirParametros(parametros: Record<string, string>): void;
}

function criarRotaDeTeste(): RotaDeTesteControlavel {
  const parametros = new BehaviorSubject<ParamMap>(convertToParamMap({}));
  return {
    parent: null,
    paramMap: parametros.asObservable(),
    queryParamMap: parametros.asObservable(),
    get snapshot() {
      return { paramMap: parametros.value, queryParamMap: parametros.value };
    },
    definirParametros(novosParametros) {
      parametros.next(convertToParamMap(novosParametros));
    },
  };
}

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

function botaoComTextoExato(
  fixture: ComponentFixture<EquipesComponent>,
  texto: string,
): HTMLButtonElement | undefined {
  const botoes = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  return botoes.find((botao) =>
    (botao.textContent ?? '').replace(/\s+/g, ' ').trim().endsWith(texto),
  );
}

describe('EquipesComponent', () => {
  let equipes: EquipesService;
  let turmas: TurmasService;
  let periodos: PeriodosLetivosService;
  let alunos: AlunosService;
  let auth: AuthService;
  let turmaId: string;
  let rota: RotaDeTesteControlavel;

  beforeEach(async () => {
    for (const chave of CHAVES) {
      localStorage.removeItem(chave);
    }

    rota = criarRotaDeTeste();

    await TestBed.configureTestingModule({
      imports: [EquipesComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
        { provide: ActivatedRoute, useValue: rota },
      ],
    }).compileComponents();

    equipes = TestBed.inject(EquipesService);
    turmas = TestBed.inject(TurmasService);
    periodos = TestBed.inject(PeriodosLetivosService);
    alunos = TestBed.inject(AlunosService);
    auth = TestBed.inject(AuthService);

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

  async function criarEquipe(nome: string, disciplinaId: string | null = null): Promise<Equipe> {
    return equipes.criarEquipe({
      nome,
      emoji: '🐯',
      cor: '#F97316',
      ativa: true,
      turmaId,
      disciplinaId,
      periodoLetivoId: periodos.ativo()?.id ?? null,
    });
  }

  async function criarAluno(nome: string): Promise<Aluno> {
    return alunos.create({
      nome,
      email: `${nome.toLowerCase().replace(/\s+/g, '.')}@turmalina.com`,
      matricula: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      turmaId,
    });
  }

  async function associarAluno(equipe: Equipe, aluno: Aluno): Promise<void> {
    const autor = auth.usuario();
    if (!autor) throw new Error('Sessão de teste ausente.');
    await equipes.associarAluno(equipe.id, aluno.id, autor);
  }

  it('mostra o título e permite escolher a turma no acesso pelo menu', () => {
    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;
    const selectTurma = fixture.nativeElement.querySelector('#equipes-turma') as HTMLSelectElement;
    const selectPeriodo = fixture.nativeElement.querySelector(
      '#equipes-periodo',
    ) as HTMLSelectElement;

    expect(texto).toContain('Equipes');
    expect(texto).toContain('Placar das equipes');
    expect(texto).toContain('Período letivo');
    expect(selectTurma.disabled).toBe(false);
    expect(selectPeriodo.disabled).toBe(true);
    expect(turmas.turmas().length).toBeGreaterThan(0);
  });

  it('no contexto da turma, fixa a turma da rota e limita os alunos a ela', async () => {
    const outraTurma = await turmas.create({
      nome: 'Outra Turma',
      codigo: 'EQ-2',
      turno: 'tarde',
    });
    await criarAluno('Ana da Turma');
    await alunos.create({
      nome: 'Bia de Outra',
      email: 'bia.outra@turmalina.com',
      matricula: `${Date.now()}-outra`,
      turmaId: outraTurma.id,
    });
    await criarEquipe('Tigres', 'disciplina-1');

    rota.definirParametros({ id: turmaId, disciplinaId: 'disciplina-1' });
    const fixture = render();

    const selectTurma = fixture.nativeElement.querySelector('#equipes-turma') as HTMLSelectElement;
    const selectPeriodo = fixture.nativeElement.querySelector(
      '#equipes-periodo',
    ) as HTMLSelectElement;

    expect(selectTurma.disabled).toBe(true);
    expect(selectTurma.value).toBe(turmaId);
    expect(selectPeriodo.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Turma Equipes');

    const botaoMembros = fixture.nativeElement.querySelector(
      'button[title="Gerenciar membros"]',
    ) as HTMLButtonElement;
    botaoMembros.click();
    fixture.detectChanges();

    const nomesNoSelect = Array.from(
      fixture.nativeElement.querySelectorAll('#equipe-aluno option'),
    ).map((opcao) => (opcao as HTMLOptionElement).textContent?.trim());

    expect(nomesNoSelect).toContain('Ana da Turma');
    expect(nomesNoSelect).not.toContain('Bia de Outra');
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
      disciplinaId: null,
      periodoLetivoId: periodos.ativo()?.id ?? null,
    });

    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Leões');
    expect(texto).toContain('🥇');
  });

  it('escolhe a cor da equipe pelo seletor e pela paleta sugerida', () => {
    const fixture = render();

    botaoPorTexto(fixture, 'Nova equipe')!.click();
    fixture.detectChanges();

    const seletor = fixture.nativeElement.querySelector('#equipe-cor') as HTMLInputElement;
    expect(seletor.type).toBe('color');

    const amostras = Array.from(
      fixture.nativeElement.querySelectorAll('.equipes__amostra'),
    ) as HTMLButtonElement[];
    expect(amostras.length).toBeGreaterThan(0);

    const corEscolhida = (amostras[2].getAttribute('aria-label') ?? '')
      .replace('Usar a cor ', '')
      .toLowerCase();

    amostras[2].click();
    fixture.detectChanges();

    expect(seletor.value.toLowerCase()).toBe(corEscolhida);
  });

  it('abre o modal de integrantes ao acionar o botão da linha', async () => {
    await criarEquipe('Tigres');

    const fixture = render();
    const botaoMembros = fixture.nativeElement.querySelector(
      'button[title="Gerenciar membros"]',
    ) as HTMLButtonElement | null;

    botaoMembros!.click();
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Integrantes: Tigres');
    expect(texto).toContain('Adicionar aluno');
  });

  it('mostra quem integra cada equipe na lista de equipes', async () => {
    const aluno = await criarAluno('Cecília Lima');
    const equipe = await criarEquipe('Tigres');
    await associarAluno(equipe, aluno);

    const fixture = render();
    const celula = fixture.nativeElement.querySelector('.equipes__integrantes') as HTMLElement;

    expect(celula.textContent).toContain('Cecília Lima');
  });

  it('remove um integrante da equipe e o retira da lista', async () => {
    const aluno = await criarAluno('Cecília Lima');
    const equipe = await criarEquipe('Tigres');
    await associarAluno(equipe, aluno);

    const fixture = render();
    const celula = fixture.nativeElement.querySelector('.equipes__integrantes') as HTMLElement;
    expect(celula.textContent).toContain('Cecília Lima');

    const botaoMembros = fixture.nativeElement.querySelector(
      'button[title="Gerenciar membros"]',
    ) as HTMLButtonElement;
    botaoMembros.click();
    fixture.detectChanges();

    const botaoRemover = fixture.nativeElement.querySelector(
      'button[aria-label="Remover Cecília Lima da equipe"]',
    ) as HTMLButtonElement | null;
    expect(botaoRemover).toBeTruthy();

    botaoRemover!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(celula.textContent).toContain('Sem integrantes');
    expect(equipes.membrosDaEquipe(equipe.id, true).length).toBe(0);
  });

  it('sorteia os alunos sem equipe entre as equipes ativas ao confirmar', async () => {
    await criarEquipe('Leões');
    await criarEquipe('Tigres');
    await criarAluno('Ana Lima');
    await criarAluno('Bruno Souza');
    await criarAluno('Carla Dias');
    await criarAluno('Diego Reis');

    const fixture = render();
    botaoPorTexto(fixture, 'Sortear alunos')!.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Sortear 4 alunos entre 2 equipes ativas?',
    );

    botaoComTextoExato(fixture, 'Sortear')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const membrosAtivos = equipes.membros().filter((membro) => membro.ativa);
    const equipesComAlunos = new Set(membrosAtivos.map((membro) => membro.equipeId));

    expect(membrosAtivos.length).toBe(4);
    expect(equipesComAlunos.size).toBe(2);
  });
});
