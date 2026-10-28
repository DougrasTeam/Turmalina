import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from './core/services/auth.service';
import { FuncionalidadesService } from './core/services/funcionalidades.service';
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
import { MetasService } from './core/services/metas.service';
import { MissoesService } from './core/services/missoes.service';
import { ProfessoresService } from './core/services/professores.service';
import { ToastService } from './core/services/toast.service';
import { TurmasService } from './core/services/turmas.service';
import { VinculosDocentesService } from './core/services/vinculos-docentes.service';
import { InstituicaoService } from './core/services/instituicao.service';
import { PeriodosLetivosService } from './core/services/periodos-letivos.service';
import { AuditoriaService } from './core/services/auditoria.service';
import { TemaVisualService } from './core/services/tema-visual.service';

interface ItemNav {
  path: string;
  label: string;
  icon: string;
  /** Chave de funcionalidade que libera o item (ver catálogo do SaaS). */
  funcionalidade: string;
}

interface SecaoNav {
  titulo: string;
  itens: ItemNav[];
}

const NAV_EQUIPE_PRINCIPAL: ItemNav[] = [
  { path: '/dashboard', label: 'Painel', icon: 'dashboard', funcionalidade: 'dashboard' },
  { path: '/turmas', label: 'Turmas', icon: 'school', funcionalidade: 'turmas' },
  { path: '/mural', label: 'Mural e recados', icon: 'campaign', funcionalidade: 'mural' },
];

const NAV_GAMIFICACAO: ItemNav[] = [
  { path: '/gamificacao/pontuar', label: 'Pontuar', icon: 'stars', funcionalidade: 'gamificacao.pontuar' },
  { path: '/gamificacao/equipes', label: 'Equipes', icon: 'diversity_3', funcionalidade: 'gamificacao.equipes' },
  { path: '/gamificacao/acoes', label: 'Ações de XP', icon: 'military_tech', funcionalidade: 'gamificacao.acoes' },
  {
    path: '/gamificacao/conquistas',
    label: 'Conquistas',
    icon: 'workspace_premium',
    funcionalidade: 'gamificacao.conquistas',
  },
  {
    path: '/gamificacao/moedas',
    label: 'Loja de moedas',
    icon: 'monetization_on',
    funcionalidade: 'gamificacao.moedas',
  },
  {
    path: '/gamificacao/metas',
    label: 'Metas',
    icon: 'track_changes',
    funcionalidade: 'gamificacao.metas',
  },
  {
    path: '/gamificacao/missoes',
    label: 'Missões',
    icon: 'map',
    funcionalidade: 'gamificacao.missoes',
  },
];

const NAV_CONSULTA: ItemNav[] = [
  { path: '/alunos', label: 'Alunos', icon: 'groups', funcionalidade: 'alunos' },
  { path: '/professores', label: 'Professores', icon: 'co_present', funcionalidade: 'professores' },
];

const NAV_EQUIPE_MOBILE: ItemNav[] = [
  { path: '/dashboard', label: 'Painel', icon: 'dashboard', funcionalidade: 'dashboard' },
  { path: '/turmas', label: 'Turmas', icon: 'school', funcionalidade: 'turmas' },
  { path: '/gamificacao/pontuar', label: 'Pontuar', icon: 'stars', funcionalidade: 'gamificacao.pontuar' },
];

const NAV_ADMIN: ItemNav[] = [
  { path: '/instituicao', label: 'Instituição', icon: 'account_balance', funcionalidade: 'instituicao' },
  {
    path: '/horarios',
    label: 'Horários',
    icon: 'calendar_view_week',
    funcionalidade: 'horarios',
  },
  {
    path: '/periodos-letivos',
    label: 'Períodos letivos',
    icon: 'calendar_month',
    funcionalidade: 'periodos-letivos',
  },
  { path: '/disciplinas', label: 'Disciplinas', icon: 'menu_book', funcionalidade: 'disciplinas' },
  { path: '/frequencia', label: 'Frequência', icon: 'fact_check', funcionalidade: 'frequencia' },
  { path: '/avaliacoes', label: 'Avaliações', icon: 'grading', funcionalidade: 'avaliacoes' },
  { path: '/agenda', label: 'Agenda', icon: 'event', funcionalidade: 'agenda' },
  { path: '/relatorios', label: 'Relatórios', icon: 'insights', funcionalidade: 'relatorios' },
  { path: '/auditoria', label: 'Auditoria', icon: 'history', funcionalidade: 'auditoria' },
];

const NAV_ALUNO: ItemNav[] = [
  { path: '/aluno/inicio', label: 'Início', icon: 'home', funcionalidade: 'aluno.inicio' },
  { path: '/aluno/boletim', label: 'Boletim', icon: 'description', funcionalidade: 'aluno.boletim' },
  { path: '/aluno/mural', label: 'Mural', icon: 'campaign', funcionalidade: 'aluno.mural' },
  { path: '/aluno/agenda', label: 'Agenda', icon: 'event', funcionalidade: 'aluno.agenda' },
  { path: '/aluno/gamificacao', label: 'Meu XP', icon: 'stars', funcionalidade: 'aluno.gamificacao' },
  { path: '/aluno/moedas', label: 'Moedas', icon: 'monetization_on', funcionalidade: 'aluno.moedas' },
  {
    path: '/aluno/conquistas',
    label: 'Álbum',
    icon: 'workspace_premium',
    funcionalidade: 'aluno.conquistas',
  },
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
  protected readonly temaVisual = inject(TemaVisualService);
  private readonly funcionalidades = inject(FuncionalidadesService);

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
  private readonly metas = inject(MetasService);
  private readonly missoes = inject(MissoesService);
  private readonly instituicao = inject(InstituicaoService);
  private readonly auditoria = inject(AuditoriaService);
  private readonly router = inject(Router);

  private readonly urlAtual = signal(this.router.url);

  /** Filtra os itens de menu pelas funcionalidades liberadas para o usuário. */
  private filtrarItens(itens: readonly ItemNav[]): ItemNav[] {
    return itens.filter((item) => this.funcionalidades.possui(item.funcionalidade));
  }

  readonly primaryNav = computed<ItemNav[]>(() =>
    this.auth.papel() === 'aluno' ? this.filtrarItens(NAV_ALUNO) : this.filtrarItens(NAV_EQUIPE_PRINCIPAL),
  );

  /** Seções do menu lateral para a equipe (administrador e professor). */
  readonly secoesNav = computed<SecaoNav[]>(() => {
    if (this.auth.papel() === 'aluno') {
      return [];
    }

    const secoes: SecaoNav[] = [
      { titulo: 'Principal', itens: this.filtrarItens(NAV_EQUIPE_PRINCIPAL) },
      { titulo: 'Gerenciar gamificação', itens: this.filtrarItens(NAV_GAMIFICACAO) },
      { titulo: 'Consulta', itens: this.filtrarItens(NAV_CONSULTA) },
    ];

    if (this.auth.temPapel('administrador')) {
      secoes.push({ titulo: 'Administração', itens: this.filtrarItens(NAV_ADMIN) });
    }

    return secoes.filter((secao) => secao.itens.length > 0);
  });

  readonly mobileNav = computed<ItemNav[]>(() =>
    this.auth.papel() === 'aluno' ? this.filtrarItens(NAV_ALUNO) : this.filtrarItens(NAV_EQUIPE_MOBILE),
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
    { prefixo: '/horarios', titulo: 'Horários' },
    { prefixo: '/disciplinas', titulo: 'Disciplinas' },
    { prefixo: '/relatorios', titulo: 'Relatórios' },
    { prefixo: '/gamificacao/acoes', titulo: 'Ações de XP' },
    { prefixo: '/gamificacao/conquistas', titulo: 'Conquistas' },
    { prefixo: '/gamificacao/equipes', titulo: 'Equipes' },
    { prefixo: '/gamificacao/moedas', titulo: 'Moedas virtuais' },
    { prefixo: '/gamificacao/metas', titulo: 'Metas' },
    { prefixo: '/gamificacao/missoes', titulo: 'Missões' },
    { prefixo: '/auditoria', titulo: 'Auditoria' },
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

  /**
   * Chave `usuarioId:institutionId` já carregada. Inclui a escola para que a
   * troca de escola recarregue os dados acadêmicos no novo tenant.
   */
  private chaveCarregada: string | null = null;

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
      if (!usuario || this.auth.precisaSelecionarEscola()) {
        this.chaveCarregada = null;
        return;
      }

      const chave = `${usuario.id}:${usuario.institutionId}`;
      if (this.chaveCarregada === chave) return;

      this.chaveCarregada = chave;
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

    // O super_admin administra o SaaS: não carrega os dados acadêmicos de uma
    // escola. O painel /admin carrega apenas o que precisa.
    if (this.auth.papel() === 'super_admin') {
      await this.funcionalidades.load();
      return;
    }

    await Promise.all([
      this.funcionalidades.load(),
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
      this.metas.load(),
      this.missoes.load(),
      this.auditoria.carregar(),
    ]);
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

  /** Remove a seleção atual e leva o usuário à escolha de escola. */
  async trocarEscola(): Promise<void> {
    this.closeSidebar();
    try {
      await this.auth.trocarEscola();
      await this.router.navigateByUrl('/selecionar-escola');
    } catch {
      await this.router.navigateByUrl('/login');
    }
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

  alternarTemaVisual(): void {
    this.temaVisual.alternar();
  }
}
