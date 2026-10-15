import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from './core/services/auth.service';
import { Papel, rotuloPapel } from './core/models/papel.model';
import { AlunosService } from './core/services/alunos.service';
import { ProfessoresService } from './core/services/professores.service';
import { ToastService } from './core/services/toast.service';
import { TurmasService } from './core/services/turmas.service';
import { InstituicaoService } from './core/services/instituicao.service';
import { PeriodosLetivosService } from './core/services/periodos-letivos.service';

interface ItemNav {
  path: string;
  label: string;
  icon: string;
}

const NAV_EQUIPE_PRINCIPAL: ItemNav[] = [{ path: '/dashboard', label: 'Painel', icon: 'dashboard' }];

const NAV_EQUIPE_CADASTROS: ItemNav[] = [
  { path: '/turmas', label: 'Turmas', icon: 'school' },
  { path: '/professores', label: 'Professores', icon: 'co_present' },
  { path: '/alunos', label: 'Alunos', icon: 'groups' },
];

const NAV_EQUIPE_MOBILE: ItemNav[] = [
  { path: '/dashboard', label: 'Painel', icon: 'dashboard' },
  { path: '/turmas', label: 'Turmas', icon: 'school' },
  { path: '/alunos', label: 'Alunos', icon: 'groups' },
];

const NAV_ADMIN: ItemNav[] = [
  { path: '/instituicao', label: 'Instituição', icon: 'account_balance' },
  { path: '/periodos-letivos', label: 'Períodos letivos', icon: 'calendar_month' },
];

const NAV_ALUNO: ItemNav[] = [{ path: '/aluno/inicio', label: 'Início', icon: 'home' }];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly toasts = inject(ToastService);
  protected readonly auth = inject(AuthService);

  private readonly turmas = inject(TurmasService);
  private readonly professores = inject(ProfessoresService);
  private readonly alunos = inject(AlunosService);
  private readonly periodos = inject(PeriodosLetivosService);
  private readonly instituicao = inject(InstituicaoService);
  private readonly router = inject(Router);

  private readonly urlAtual = signal(this.router.url);

  readonly primaryNav = computed<ItemNav[]>(() =>
    this.auth.papel() === 'aluno' ? NAV_ALUNO : NAV_EQUIPE_PRINCIPAL,
  );

  readonly registerNav = computed<ItemNav[]>(() =>
    this.auth.temPapel('administrador', 'professor') ? NAV_EQUIPE_CADASTROS : [],
  );

  readonly adminNav = computed<ItemNav[]>(() =>
    this.auth.temPapel('administrador') ? NAV_ADMIN : [],
  );

  readonly mobileNav = computed<ItemNav[]>(() =>
    this.auth.papel() === 'aluno' ? NAV_ALUNO : NAV_EQUIPE_MOBILE,
  );

  readonly sidebarOpen = signal(false);

  private readonly titulos: { prefixo: string; titulo: string }[] = [
    { prefixo: '/dashboard', titulo: 'Painel' },
    { prefixo: '/turmas', titulo: 'Turmas' },
    { prefixo: '/professores', titulo: 'Professores' },
    { prefixo: '/alunos', titulo: 'Alunos' },
    { prefixo: '/instituicao', titulo: 'Instituição' },
    { prefixo: '/periodos-letivos', titulo: 'Períodos letivos' },
    { prefixo: '/aluno', titulo: 'Minha área' },
  ];

  readonly pageTitle = computed(() => {
    const url = this.urlAtual();
    return this.titulos.find((titulo) => url.startsWith(titulo.prefixo))?.titulo ?? 'Turmalina';
  });

  constructor() {
    void this.auth.garantirSessaoCarregada();

    effect(() => {
      if (this.auth.autenticado()) {
        void this.turmas.load();
        void this.professores.load();
        void this.alunos.load();
        void this.instituicao.load();
        void this.periodos.load();
      }
    });

    this.router.events
      .pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((evento) => {
        this.urlAtual.set(evento.urlAfterRedirects);
        this.sidebarOpen.set(false);
      });
  }

  iniciais(nome: string): string {
    const partes = nome.trim().split(/\s+/);
    const primeira = partes[0]?.charAt(0) ?? '';
    const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return `${primeira}${ultima}`.toUpperCase();
  }

  rotulo(papel: Papel): string {
    return rotuloPapel(papel);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((aberto) => !aberto);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  async sair(): Promise<void> {
    await this.auth.sair();
    this.closeSidebar();
    await this.router.navigateByUrl('/login');
  }
}
