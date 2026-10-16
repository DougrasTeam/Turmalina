import { Routes } from '@angular/router';

import { autenticacaoGuard } from './core/auth/guards/autenticacao.guard';
import { papelGuard } from './core/auth/guards/papel.guard';
import { primeiroAcessoGuard } from './core/auth/guards/primeiro-acesso.guard';

const equipeDocente = [autenticacaoGuard, papelGuard('administrador', 'professor')];

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    title: 'Entrar · Turmalina',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'primeiro-acesso',
    title: 'Primeiro acesso · Turmalina',
    canActivate: [autenticacaoGuard, primeiroAcessoGuard],
    loadComponent: () =>
      import('./features/auth/primeiro-acesso/primeiro-acesso.component').then(
        (m) => m.PrimeiroAcessoComponent,
      ),
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
    title: 'Alunos — Turmalina',
    canActivate: equipeDocente,
    loadComponent: () => import('./features/aluno/alunos/alunos.component').then((m) => m.AlunosComponent),
  },
  {
    path: 'frequencia',
    title: 'Frequência — Turmalina',
    canActivate: equipeDocente,
    loadComponent: () =>
      import('./features/frequencia/frequencias/frequencias.component').then((m) => m.FrequenciasComponent),
  },
  {
    path: 'avaliacoes',
    title: 'Avaliações e notas — Turmalina',
    canActivate: equipeDocente,
    loadComponent: () =>
      import('./features/avaliacao/avaliacoes/avaliacoes.component').then((m) => m.AvaliacoesComponent),
  },
  {
    path: 'mural',
    title: 'Mural e recados · Turmalina',
    canActivate: equipeDocente,
    loadComponent: () => import('./features/mural/mural/mural.component').then((m) => m.MuralComponent),
  },
  {
    path: 'agenda',
    title: 'Agenda · Turmalina',
    canActivate: equipeDocente,
    loadComponent: () => import('./features/agenda/agenda/agenda.component').then((m) => m.AgendaComponent),
  },
  {
    path: 'aluno/inicio',
    title: 'Minha área · Turmalina',
    canActivate: [autenticacaoGuard, papelGuard('aluno')],
    loadComponent: () =>
      import('./features/aluno/inicio/inicio-aluno.component').then((m) => m.InicioAlunoComponent),
  },
  {
    path: 'aluno/boletim',
    title: 'Meu boletim · Turmalina',
    canActivate: [autenticacaoGuard, papelGuard('aluno')],
    loadComponent: () => import('./features/boletim/boletim/boletim.component').then((m) => m.BoletimComponent),
  },
  {
    path: 'aluno/mural',
    title: 'Meu mural · Turmalina',
    canActivate: [autenticacaoGuard, papelGuard('aluno')],
    loadComponent: () =>
      import('./features/aluno/mural/mural-aluno.component').then((m) => m.MuralAlunoComponent),
  },
  {
    path: 'aluno/agenda',
    title: 'Minha agenda · Turmalina',
    canActivate: [autenticacaoGuard, papelGuard('aluno')],
    loadComponent: () =>
      import('./features/aluno/agenda/agenda-aluno.component').then((m) => m.AgendaAlunoComponent),
  },
  {
    path: 'boletim/:alunoId',
    title: 'Boletim · Turmalina',
    canActivate: equipeDocente,
    loadComponent: () => import('./features/boletim/boletim/boletim.component').then((m) => m.BoletimComponent),
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
  {
    path: 'disciplinas',
    title: 'Disciplinas — Turmalina',
    canActivate: [autenticacaoGuard, papelGuard('administrador')],
    loadComponent: () =>
      import('./features/disciplina/disciplinas/disciplinas.component').then((m) => m.DisciplinasComponent),
  },
  {
    path: 'relatorios',
    title: 'Relatórios · Turmalina',
    canActivate: [autenticacaoGuard, papelGuard('administrador')],
    loadComponent: () =>
      import('./features/relatorios/relatorios/relatorios.component').then((m) => m.RelatoriosComponent),
  },
  {
    path: 'auditoria',
    title: 'Auditoria · Turmalina',
    canActivate: [autenticacaoGuard, papelGuard('administrador')],
    loadComponent: () => import('./features/admin/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
  },
  {
    path: 'reset-dados',
    title: 'Zona de perigo — Turmalina',
    canActivate: [autenticacaoGuard, papelGuard('administrador')],
    loadComponent: () =>
      import('./features/admin/reset-dados/reset-dados.component').then((m) => m.ResetDadosComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
