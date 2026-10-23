import { Routes } from '@angular/router';

import { autenticacaoGuard } from './core/auth/guards/autenticacao.guard';
import { papelGuard } from './core/auth/guards/papel.guard';
import { primeiroAcessoGuard } from './core/auth/guards/primeiro-acesso.guard';
import { funcionalidadeGuard } from './core/auth/guards/funcionalidade.guard';
import { superAdminGuard } from './core/auth/guards/super-admin.guard';

const equipeDocente = [autenticacaoGuard, papelGuard('administrador', 'professor')];

/** Combina a checagem de papel da equipe com a permissão da funcionalidade. */
function rotaEquipe(funcionalidade: string) {
  return [...equipeDocente, funcionalidadeGuard(funcionalidade)];
}

/** Rota administrativa restrita a administrador e à funcionalidade informada. */
function rotaAdmin(funcionalidade: string) {
  return [autenticacaoGuard, papelGuard('administrador'), funcionalidadeGuard(funcionalidade)];
}

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
    path: 'contratar',
    title: 'Contratar plano · Turmalina',
    loadComponent: () =>
      import('./features/onboarding/contratar/contratar-plano.component').then(
        (m) => m.ContratarPlanoComponent,
      ),
  },
  {
    path: 'dashboard',
    title: 'Painel · Turmalina',
    canActivate: rotaEquipe('dashboard'),
    loadComponent: () => import('./features/dashboard/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'turmas',
    title: 'Turmas · Turmalina',
    canActivate: rotaEquipe('turmas'),
    loadComponent: () => import('./features/turma/turmas/turmas.component').then((m) => m.TurmasComponent),
  },
  {
    path: 'turmas/:id',
    title: 'Turma · Turmalina',
    canActivate: rotaEquipe('turmas'),
    loadComponent: () =>
      import('./features/turma/turma-detalhe/turma-detalhe.component').then((m) => m.TurmaDetalheComponent),
  },
  {
    path: 'turmas/:id/disciplina/:disciplinaId',
    title: 'Disciplina · Turmalina',
    canActivate: rotaEquipe('turmas'),
    loadComponent: () =>
      import('./features/turma/turma-disciplina/turma-disciplina.component').then(
        (m) => m.TurmaDisciplinaComponent,
      ),
    children: [
      {
        path: '',
        title: 'Disciplina · Visao geral · Turmalina',
        loadComponent: () =>
          import(
            './features/turma/turma-disciplina/visao-geral/turma-disciplina-visao-geral.component'
          ).then((m) => m.TurmaDisciplinaVisaoGeralComponent),
      },
      {
        path: 'frequencia',
        title: 'Frequencia · Turmalina',
        loadComponent: () =>
          import('./features/frequencia/frequencias/frequencias.component').then((m) => m.FrequenciasComponent),
      },
      {
        path: 'avaliacoes',
        title: 'Avaliacoes e notas · Turmalina',
        loadComponent: () =>
          import('./features/avaliacao/avaliacoes/avaliacoes.component').then((m) => m.AvaliacoesComponent),
      },
      {
        path: 'pontuar',
        title: 'Pontuar · Turmalina',
        loadComponent: () =>
          import('./features/gamificacao/pontuar/pontuar.component').then((m) => m.PontuarComponent),
      },
      {
        path: 'equipes',
        title: 'Equipes · Turmalina',
        loadComponent: () =>
          import('./features/gamificacao/equipes/equipes.component').then((m) => m.EquipesComponent),
      },
      {
        path: 'agenda',
        title: 'Agenda · Turmalina',
        loadComponent: () => import('./features/agenda/agenda/agenda.component').then((m) => m.AgendaComponent),
      },
      {
        path: 'mural',
        title: 'Mural · Turmalina',
        loadComponent: () => import('./features/mural/mural/mural.component').then((m) => m.MuralComponent),
      },
    ],
  },
  {
    path: 'professores',
    title: 'Professores · Turmalina',
    canActivate: rotaEquipe('professores'),
    loadComponent: () =>
      import('./features/professor/professores/professores.component').then((m) => m.ProfessoresComponent),
  },
  {
    path: 'alunos',
    title: 'Alunos — Turmalina',
    canActivate: rotaEquipe('alunos'),
    loadComponent: () => import('./features/aluno/alunos/alunos.component').then((m) => m.AlunosComponent),
  },
  {
    path: 'frequencia',
    title: 'Frequência · Turmalina',
    canActivate: rotaEquipe('frequencia'),
    loadComponent: () => import('./features/frequencia/frequencias/frequencias.component').then((m) => m.FrequenciasComponent),
  },
  {
    path: 'avaliacoes',
    title: 'Avaliações e notas · Turmalina',
    canActivate: rotaEquipe('avaliacoes'),
    loadComponent: () => import('./features/avaliacao/avaliacoes/avaliacoes.component').then((m) => m.AvaliacoesComponent),
  },
  {
    path: 'mural',
    title: 'Mural e recados · Turmalina',
    canActivate: rotaEquipe('mural'),
    loadComponent: () => import('./features/mural/mural/mural.component').then((m) => m.MuralComponent),
  },
  {
    path: 'agenda',
    title: 'Agenda · Turmalina',
    canActivate: rotaEquipe('agenda'),
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
    canActivate: rotaAdmin('instituicao'),
    loadComponent: () =>
      import('./features/periodo-letivo/instituicao/instituicao.component').then((m) => m.InstituicaoComponent),
  },
  {
    path: 'periodos-letivos',
    title: 'Períodos letivos · Turmalina',
    canActivate: rotaAdmin('periodos-letivos'),
    loadComponent: () =>
      import('./features/periodo-letivo/periodos-letivos/periodos-letivos.component').then(
        (m) => m.PeriodosLetivosComponent,
      ),
  },
  {
    path: 'disciplinas',
    title: 'Disciplinas · Turmalina',
    canActivate: rotaAdmin('disciplinas'),
    loadComponent: () =>
      import('./features/disciplina/disciplinas/disciplinas.component').then((m) => m.DisciplinasComponent),
  },
  {
    path: 'relatorios',
    title: 'Relatórios · Turmalina',
    canActivate: rotaAdmin('relatorios'),
    loadComponent: () =>
      import('./features/relatorios/relatorios/relatorios.component').then((m) => m.RelatoriosComponent),
  },
  {
    path: 'auditoria',
    title: 'Auditoria · Turmalina',
    canActivate: rotaAdmin('auditoria'),
    loadComponent: () => import('./features/admin/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
  },
  {
    path: 'aluno/gamificacao',
    title: 'Meu XP · Turmalina',
    canActivate: [autenticacaoGuard, papelGuard('aluno')],
    loadComponent: () =>
      import('./features/aluno/gamificacao/gamificacao-aluno.component').then((m) => m.GamificacaoAlunoComponent),
  },
  {
    path: 'gamificacao/pontuar',
    title: 'Pontuar · Turmalina',
    canActivate: rotaEquipe('gamificacao.pontuar'),
    loadComponent: () =>
      import('./features/gamificacao/pontuar/pontuar.component').then((m) => m.PontuarComponent),
  },
  {
    path: 'gamificacao/acoes',
    title: 'Ações de XP · Turmalina',
    canActivate: rotaEquipe('gamificacao.acoes'),
    loadComponent: () =>
      import('./features/gamificacao/acoes-gamificacao/acoes-gamificacao.component').then(
        (m) => m.AcoesGamificacaoComponent,
      ),
  },
  {
    path: 'gamificacao/conquistas',
    title: 'Conquistas · Turmalina',
    canActivate: rotaEquipe('gamificacao.conquistas'),
    loadComponent: () =>
      import('./features/gamificacao/conquistas/conquistas.component').then(
        (m) => m.ConquistasComponent,
      ),
  },
  {
    path: 'gamificacao/equipes',
    title: 'Equipes · Turmalina',
    canActivate: rotaEquipe('gamificacao.equipes'),
    loadComponent: () =>
      import('./features/gamificacao/equipes/equipes.component').then((m) => m.EquipesComponent),
  },
  {
    path: 'gamificacao/moedas',
    title: 'Loja de moedas · Turmalina',
    canActivate: rotaEquipe('gamificacao.moedas'),
    loadComponent: () =>
      import('./features/gamificacao/moedas/moedas.component').then((m) => m.MoedasComponent),
  },
  {
    path: 'aluno/moedas',
    title: 'Minhas moedas · Turmalina',
    canActivate: [autenticacaoGuard, papelGuard('aluno')],
    loadComponent: () =>
      import('./features/aluno/moedas/moedas-aluno.component').then((m) => m.MoedasAlunoComponent),
  },
  {
    path: 'aluno/conquistas',
    title: 'Meu álbum · Turmalina',
    canActivate: [autenticacaoGuard, papelGuard('aluno')],
    loadComponent: () =>
      import('./features/aluno/conquistas/album-aluno.component').then((m) => m.AlbumAlunoComponent),
  },
  {
    path: 'admin',
    title: 'Administração · Turmalina',
    canActivate: [autenticacaoGuard, superAdminGuard],
    loadComponent: () =>
      import('./features/admin-saas/layout/admin-saas-layout.component').then(
        (m) => m.AdminSaasLayoutComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'escolas' },
      {
        path: 'escolas',
        title: 'Escolas · Turmalina',
        loadComponent: () =>
          import('./features/admin-saas/escolas/escolas-saas.component').then(
            (m) => m.EscolasSaasComponent,
          ),
      },
      {
        path: 'planos',
        title: 'Planos · Turmalina',
        loadComponent: () =>
          import('./features/admin-saas/planos/planos-saas.component').then(
            (m) => m.PlanosSaasComponent,
          ),
      },
      {
        path: 'permissoes',
        title: 'Permissões · Turmalina',
        loadComponent: () =>
          import('./features/admin-saas/permissoes/permissoes-saas.component').then(
            (m) => m.PermissoesSaasComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];