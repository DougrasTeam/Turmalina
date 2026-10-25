import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { TemaVisualService } from '../../../core/services/tema-visual.service';

interface ItemNavSaas {
  path: string;
  label: string;
  icon: string;
}

const NAV_SAAS: ItemNavSaas[] = [
  { path: '/admin/escolas', label: 'Escolas', icon: 'apartment' },
  { path: '/admin/planos', label: 'Planos', icon: 'sell' },
  { path: '/admin/permissoes', label: 'Permissões', icon: 'admin_panel_settings' },
];

/** Layout do painel do SaaS, exclusivo do super_admin. */
@Component({
  selector: 'app-admin-saas-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-saas-layout.component.html',
  styleUrl: './admin-saas-layout.component.scss',
})
export class AdminSaasLayoutComponent {
  protected readonly auth = inject(AuthService);
  protected readonly temaVisual = inject(TemaVisualService);
  protected readonly itens = NAV_SAAS;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  protected readonly sidebarOpen = signal(false);
  protected readonly temaEscuro = signal(this.carregarPreferenciaTemaEscuro());

  protected toggleSidebar(): void {
    this.sidebarOpen.update((aberto) => !aberto);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected alternarTemaVisual(): void {
    this.temaVisual.alternar();
  }

  protected alternarTemaEscuro(): void {
    const ativarTemaEscuro = !this.temaEscuro();
    const elementoHtml = document.documentElement;

    if (ativarTemaEscuro) {
      elementoHtml.setAttribute('data-tl-theme', 'dark');
    } else {
      elementoHtml.removeAttribute('data-tl-theme');
    }

    localStorage.setItem('tl-theme', ativarTemaEscuro ? 'dark' : 'light');
    this.temaEscuro.set(ativarTemaEscuro);
  }

  async sair(): Promise<void> {
    await this.auth.sair();
    await this.router.navigateByUrl('/login');
  }

  private carregarPreferenciaTemaEscuro(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return document.documentElement.getAttribute('data-tl-theme') === 'dark';
  }
}
