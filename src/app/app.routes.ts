import { Routes } from '@angular/router';

import { autenticacaoGuard } from './core/auth/guards/autenticacao.guard';
import { papelGuard } from './core/auth/guards/papel.guard';

const equipeDocente = [autenticacaoGuard, papelGuard('administrador', 'professor')];

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    title: 'Entrar · Turmalina',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    title: 'Painel · Turmalina',
    canActivate: equipeDocente,
    loadComponent: () => import('./features/dashboard/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'turmas',
    title: 'Turmas · Turmalina',
    canActivate: equipeDocente,
    loadComponent: () => import('./features/turma/turmas/turmas.component').then((m) => m.TurmasComponent),
  },
  {
    path: 'turmas/:id',
    title: 'Turma · Turmalina',
    canActivate: equipeDocente,
    loadComponent: () =>
      import('./features/turma/turma-detalhe/turma-detalhe.component').then((m) => m.TurmaDetalheComponent),
  },
  {
    path: 'professores',
    title: 'Professores · Turmalina',
    canActivate: equipeDocente,
    loadComponent: () =>
      import('./features/professor/professores/professores.component').then((m) => m.ProfessoresComponent),
  },
  {
    path: 'alunos',
    title: 'Alunos · Turmalina',
    canActivate: equipeDocente,
    loadComponent: () => import('./features/aluno/alunos/alunos.component').then((m) => m.AlunosComponent),
  },
  {
    path: 'aluno/inicio',
    title: 'Minha área · Turmalina',
    canActivate: [autenticacaoGuard, papelGuard('aluno')],
    loadComponent: () =>
      import('./features/aluno/inicio/inicio-aluno.component').then((m) => m.InicioAlunoComponent),
  },
  {
    path: 'instituicao',
    title: 'Instituição · Turmalina',
    canActivate: [autenticacaoGuard, papelGuard('administrador')],
    loadComponent: () =>
      import('./features/periodo-letivo/instituicao/instituicao.component').then((m) => m.InstituicaoComponent),
  },
  {
    path: 'periodos-letivos',
    title: 'Períodos letivos · Turmalina',
    canActivate: [autenticacaoGuard, papelGuard('administrador')],
    loadComponent: () =>
      import('./features/periodo-letivo/periodos-letivos/periodos-letivos.component').then(
        (m) => m.PeriodosLetivosComponent,
      ),
  },
  { path: '**', redirectTo: 'dashboard' },
];
