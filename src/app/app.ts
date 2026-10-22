import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from './core/services/auth.service';
import { Papel, rotuloPapel } from './core/models/papel.model';
import { AlunosService } from './core/services/alunos.service';
import { AvaliacoesService } from './core/services/avaliacoes.service';
import { ComunicadosService } from './core/services/comunicados.service';
import { PublicacoesService } from './core/services/publicacoes.service';
import { DisciplinasService } from './core/services/disciplinas.service';
import { EventosService } from './core/services/eventos.service';
import { FrequenciasService } from './core/services/frequencias.service';
import { ConquistasService } from './core/services/conquistas.service';
import { EquipesService } from './core/services/equipes.service';
import { GamificacaoService } from './core/services/gamificacao.service';
import { MatriculasService } from './core/services/matriculas.service';
import { ProfessoresService } from './core/services/professores.service';
import { ToastService } from './core/services/toast.service';
import { TurmasService } from './core/services/turmas.service';
import { VinculosDocentesService } from './core/services/vinculos-docentes.service';
import { InstituicaoService } from './core/services/instituicao.service';
import { PeriodosLetivosService } from './core/services/periodos-letivos.service';
import { DadosDemoService } from './core/services/dados-demo.service';
import { AuditoriaService } from './core/services/auditoria.service';

interface ItemNav {
  path: string;
  label: string;
  icon: string;
}

interface SecaoNav {
  titulo: string;
  itens: ItemNav[];
}

const NAV_EQUIPE_PRINCIPAL: ItemNav[] = [
  { path: '/dashboard', label: 'Painel', icon: 'dashboard' },
  { path: '/turmas', label: 'Turmas', icon: 'school' },
  { path: '/mural', label: 'Mural e recados', icon: 'campaign' },
];

const NAV_GAMIFICACAO: ItemNav[] = [
  { path: '/gamificacao/pontuar', label: 'Pontuar', icon: 'stars' },
  { path: '/gamificacao/equipes', label: 'Equipes', icon: 'diversity_3' },
  { path: '/gamificacao/acoes', label: 'Ações de XP', icon: 'military_tech' },
  { path: '/gamificacao/conquistas', label: 'Conquistas', icon: 'workspace_premium' },
  { path: '/gamificacao/moedas', label: 'Loja de moedas', icon: 'monetization_on' },
];

const NAV_CONSULTA: ItemNav[] = [
  { path: '/alunos', label: 'Alunos', icon: 'groups' },
  { path: '/professores', label: 'Professores', icon: 'co_present' },
];

const NAV_EQUIPE_MOBILE: ItemNav[] = [
  { path: '/dashboard', label: 'Painel', icon: 'dashboard' },
  { path: '/turmas', label: 'Turmas', icon: 'school' },
  { path: '/gamificacao/pontuar', label: 'Pontuar', icon: 'stars' },
];

const NAV_ADMIN: ItemNav[] = [
  { path: '/instituicao', label: 'Instituição', icon: 'account_balance' },
  { path: '/periodos-letivos', label: 'Períodos letivos', icon: 'calendar_month' },
  { path: '/disciplinas', label: 'Disciplinas', icon: 'menu_book' },
  { path: '/frequencia', label: 'Frequência', icon: 'fact_check' },
  { path: '/avaliacoes', label: 'Avaliações', icon: 'grading' },
  { path: '/agenda', label: 'Agenda', icon: 'event' },
  { path: '/relatorios', label: 'Relatórios', icon: 'insights' },
  { path: '/auditoria', label: 'Auditoria', icon: 'history' },
  { path: '/reset-dados', label: 'Zona de perigo', icon: 'delete_forever' },
];

const NAV_ALUNO: ItemNav[] = [
  { path: '/aluno/inicio', label: 'Início', icon: 'home' },
  { path: '/aluno/boletim', label: 'Boletim', icon: 'description' },
  { path: '/aluno/mural', label: 'Mural', icon: 'campaign' },
  { path: '/aluno/agenda', label: 'Agenda', icon: 'event' },
  { path: '/aluno/gamificacao', label: 'Meu XP', icon: 'stars' },
  { path: '/aluno/moedas', label: 'Moedas', icon: 'monetization_on' },
  { path: '/aluno/conquistas', label: 'Álbum', icon: 'workspace_premium' },
];

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
  private readonly disciplinas = inject(DisciplinasService);
  private readonly vinculos = inject(VinculosDocentesService);
  private readonly matriculas = inject(MatriculasService);
  private readonly frequencias = inject(FrequenciasService);
  private readonly avaliacoes = inject(AvaliacoesService);
  private readonly publicacoes = inject(PublicacoesService);
  private readonly comunicados = inject(ComunicadosService);
  private readonly eventos = inject(EventosService);
  private readonly gamificacao = inject(GamificacaoService);
  private readonly conquistas = inject(ConquistasService);
  private readonly equipes = inject(EquipesService);
  private readonly instituicao = inject(InstituicaoService);
  private readonly dadosDemo = inject(DadosDemoService);
  private readonly auditoria = inject(AuditoriaService);
  private readonly router = inject(Router);

  private readonly urlAtual = signal(this.router.url);

  readonly primaryNav = computed<ItemNav[]>(() =>
    this.auth.papel() === 'aluno' ? NAV_ALUNO : NAV_EQUIPE_PRINCIPAL,
  );

  /** Seções do menu lateral para a equipe (administrador e professor). */
  readonly secoesNav = computed<SecaoNav[]>(() => {
    if (this.auth.papel() === 'aluno') {
      return [];
    }

    const secoes: SecaoNav[] = [
      { titulo: 'Principal', itens: NAV_EQUIPE_PRINCIPAL },
      { titulo: 'Gerenciar gamificação', itens: NAV_GAMIFICACAO },
      { titulo: 'Consulta', itens: NAV_CONSULTA },
    ];

    if (this.auth.temPapel('administrador')) {
      secoes.push({ titulo: 'Administração', itens: NAV_ADMIN });
    }

    return secoes;
  });

  readonly mobileNav = computed<ItemNav[]>(() =>
    this.auth.papel() === 'aluno' ? NAV_ALUNO : NAV_EQUIPE_MOBILE,
  );

  readonly sidebarOpen = signal(false);

  private readonly titulos: { prefixo: string; titulo: string }[] = [
    { prefixo: '/dashboard', titulo: 'Painel' },
    { prefixo: '/turmas', titulo: 'Turmas' },
    { prefixo: '/professores', titulo: 'Professores' },
    { prefixo: '/alunos', titulo: 'Alunos' },
    { prefixo: '/frequencia', titulo: 'Frequência' },
    { prefixo: '/avaliacoes', titulo: 'Avaliações e notas' },
    { prefixo: '/mural', titulo: 'Mural e recados' },
    { prefixo: '/agenda', titulo: 'Agenda' },
    { prefixo: '/pontuar', titulo: 'Pontuar' },
    { prefixo: '/instituicao', titulo: 'Instituição' },
    { prefixo: '/periodos-letivos', titulo: 'Períodos letivos' },
    { prefixo: '/disciplinas', titulo: 'Disciplinas' },
    { prefixo: '/relatorios', titulo: 'Relatórios' },
    { prefixo: '/gamificacao/acoes', titulo: 'Ações de XP' },
    { prefixo: '/gamificacao/conquistas', titulo: 'Conquistas' },
    { prefixo: '/gamificacao/equipes', titulo: 'Equipes' },
    { prefixo: '/gamificacao/moedas', titulo: 'Moedas virtuais' },
    { prefixo: '/auditoria', titulo: 'Auditoria' },
    { prefixo: '/reset-dados', titulo: 'Zona de perigo' },
    { prefixo: '/boletim', titulo: 'Boletim' },
    { prefixo: '/aluno/boletim', titulo: 'Meu boletim' },
    { prefixo: '/aluno/mural', titulo: 'Meu mural' },
    { prefixo: '/aluno/agenda', titulo: 'Minha agenda' },
    { prefixo: '/aluno/gamificacao', titulo: 'Meu XP' },
    { prefixo: '/aluno/moedas', titulo: 'Minhas moedas' },
    { prefixo: '/aluno/conquistas', titulo: 'Meu álbum' },
    { prefixo: '/aluno', titulo: 'Minha área' },
  ];

  readonly pageTitle = computed(() => {
    const url = this.urlAtual();
    return this.titulos.find((titulo) => url.startsWith(titulo.prefixo))?.titulo ?? 'Turmalina';
  });

  private usuarioCarregadoId: string | null = null;

  constructor() {
    void this.auth.garantirSessaoCarregada();

    // Initialize theme from localStorage
    const html = document.documentElement;
    const storedTheme = localStorage.getItem('tl-theme');
    if (storedTheme === 'dark') {
      html.setAttribute('data-tl-theme', 'dark');
    } else if (storedTheme === 'light') {
      html.removeAttribute('data-tl-theme');
    } else {
      // respect system setting via UI kit
      html.removeAttribute('data-tl-theme');
    }

    effect(() => {
      const usuario = this.auth.usuario();
      if (!usuario) return;
      if (this.usuarioCarregadoId === usuario.id) return;
      void this.carregarDados(usuario.id);
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

  private async carregarDados(usuarioId: string): Promise<void> {
    // Aguarda a sessão do AuthRepository para que a sessão (token) já esteja
    // disponível ao cliente de dados; sem isso, o RLS poderia responder como
    // visitante e as listas chegariam vazias.
    await this.auth.garantirSessaoCarregada();
    this.usuarioCarregadoId = usuarioId;

    await Promise.all([
      this.turmas.load(),
      this.professores.load(),
      this.alunos.recarregar(),
      this.instituicao.load(),
      this.periodos.load(),
      this.disciplinas.load(),
      this.vinculos.load(),
      this.matriculas.load(),
      this.frequencias.load(),
      this.avaliacoes.load(),
      this.publicacoes.load(),
      this.comunicados.load(),
      this.eventos.load(),
      this.gamificacao.load(),
      this.conquistas.load(),
      this.equipes.load(),
      this.auditoria.carregar(),
    ]);
    await this.dadosDemo.garantir();
    await this.garantirAlunoVinculado(usuarioId);
  }

  /**
   * Se o usuário logado é aluno e a lista carregada não contém o seu cadastro,
   * faz uma releitura única. Cobre o caso de a primeira leitura ter acontecido
   * antes de a sessão estar disponível ao cliente de dados (RLS como visitante).
   */
  private async garantirAlunoVinculado(usuarioId: string): Promise<void> {
    if (this.auth.papel() !== 'aluno') return;
    const usuario = this.auth.usuario();
    if (!usuario) return;
    if (this.alunos.encontrarPorUsuario(usuario.id, usuario.email)) return;

    await this.alunos.recarregar();
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

  themeToggle(): void {
    const html = document.documentElement;
    const current = html.getAttribute('data-tl-theme');
    if (current === 'dark') {
      html.removeAttribute('data-tl-theme');
      localStorage.setItem('tl-theme', 'light');
    } else {
      html.setAttribute('data-tl-theme', 'dark');
      localStorage.setItem('tl-theme', 'dark');
    }
  }
}
