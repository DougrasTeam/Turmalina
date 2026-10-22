import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AuthRepository } from '../../../core/auth/data-access/auth.repository';
import { MockAuthRepository } from '../../../core/auth/data-access/mock-auth.repository';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { DisciplinasService } from '../../../core/services/disciplinas.service';
import { EquipesService } from '../../../core/services/equipes.service';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { TurmaDisciplinaComponent } from '../../turma/turma-disciplina/turma-disciplina.component';
import { EquipesComponent } from './equipes.component';

const rotas: Routes = [
  {
    path: 'turmas/:id/disciplina/:disciplinaId',
    component: TurmaDisciplinaComponent,
    children: [{ path: 'equipes', component: EquipesComponent }],
  },
];

function limparArmazenamentoLocal(): void {
  for (const chave of Object.keys(localStorage)) {
    if (chave.startsWith('turmalina.')) localStorage.removeItem(chave);
  }
}

describe('EquipesComponent na rota da disciplina', () => {
  afterEach(() => limparArmazenamentoLocal());

  it('exibe no seletor a turma acessada, e não a primeira turma da lista', async () => {
    limparArmazenamentoLocal();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(rotas),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });

    const turmas = TestBed.inject(TurmasService);
    const alunos = TestBed.inject(AlunosService);
    const periodos = TestBed.inject(PeriodosLetivosService);
    const disciplinas = TestBed.inject(DisciplinasService);
    const equipes = TestBed.inject(EquipesService);
    const auth = TestBed.inject(AuthService);

    await alunos.load();
    await turmas.load();
    await periodos.load();
    await disciplinas.load();
    await equipes.load();
    await auth.entrar({ email: 'adm@turmalina.com', senha: 'turmalina' });

    await turmas.create({ nome: 'Turma Demonstração', codigo: 'DEMO01' });
    const turmaAcessada = await turmas.create({ nome: 'Turma Acessada', codigo: 'ZZ-9' });
    const disciplina = disciplinas.disciplinas()[0];

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(
      `/turmas/${turmaAcessada.id}/disciplina/${disciplina.id}/equipes`,
    );

    const elemento = harness.routeNativeElement as HTMLElement;
    const selectTurma = elemento.querySelector('#equipes-turma') as HTMLSelectElement;

    expect(selectTurma.disabled).toBe(true);
    expect(selectTurma.value).toBe(turmaAcessada.id);
    expect(selectTurma.selectedOptions[0]?.textContent).toContain('Turma Acessada');
  });
});
