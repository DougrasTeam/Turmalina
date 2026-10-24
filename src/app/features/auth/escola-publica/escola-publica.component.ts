import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { rotaInicialPorPapel } from '../../../core/auth/rota-inicial';
import { EscolaPublica } from '../../../core/models/escola-publica.model';
import { AuthService } from '../../../core/services/auth.service';
import { ContextoEscolaService } from '../../../core/services/contexto-escola.service';
import { EscolaPublicaService } from '../../../core/services/escola-publica.service';

/**
 * Entrada por link da escola (`/e/:slug`).
 *
 * Resolve a escola, guarda o contexto para o login e, se o usuário já estiver
 * autenticado e for membro, seleciona a escola e segue para a área inicial.
 */
@Component({
  selector: 'app-escola-publica',
  imports: [RouterLink],
  templateUrl: './escola-publica.component.html',
  styleUrl: './escola-publica.component.scss',
})
export class EscolaPublicaComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly escolas = inject(EscolaPublicaService);
  private readonly contexto = inject(ContextoEscolaService);
  private readonly auth = inject(AuthService);

  protected readonly carregando = signal(true);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly escola = signal<EscolaPublica | null>(null);
  protected readonly precisaTrocarConta = signal(false);

  constructor() {
    void this.carregar();
  }

  protected async sairEEntrarComOutraConta(): Promise<void> {
    await this.auth.sair();
    await this.router.navigateByUrl('/login');
  }

  private async carregar(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('slug')?.trim() ?? '';

    if (!slug) {
      this.mensagemErro.set('Link de escola inválido.');
      this.carregando.set(false);
      return;
    }

    try {
      const escola = await this.escolas.buscarPorSlug(slug);

      if (!escola) {
        this.mensagemErro.set('Escola não encontrada. Confira o link recebido.');
        return;
      }

      this.escola.set(escola);

      if (escola.status !== 'ativa') {
        this.mensagemErro.set('Esta escola está inativa. Procure a administração.');
        return;
      }

      this.contexto.definir(escola);
      await this.entrarNaEscola(escola);
    } catch {
      this.mensagemErro.set('Não foi possível carregar a escola. Tente novamente.');
    } finally {
      this.carregando.set(false);
    }
  }

  private async entrarNaEscola(escola: EscolaPublica): Promise<void> {
    await this.auth.garantirSessaoCarregada();

    if (!this.auth.autenticado()) {
      await this.router.navigateByUrl('/login');
      return;
    }

    if (this.auth.papel() === 'super_admin') {
      await this.router.navigateByUrl('/admin/escolas');
      return;
    }

    const acesso = this.auth
      .instituicoes()
      .find((vinculo) => vinculo.institutionId === escola.institutionId);

    if (!acesso) {
      this.precisaTrocarConta.set(true);
      this.mensagemErro.set('Sua conta não tem acesso a esta escola.');
      return;
    }

    if (acesso.status !== 'ativa') {
      this.mensagemErro.set('Esta escola está inativa. Procure a administração.');
      return;
    }

    await this.auth.selecionarEscola(escola.institutionId);
    this.contexto.limpar();

    const papel = this.auth.papel() ?? acesso.papel;
    const destino = this.auth.precisaTrocarSenha()
      ? '/primeiro-acesso'
      : rotaInicialPorPapel(papel);
    await this.router.navigateByUrl(destino);
  }
}
