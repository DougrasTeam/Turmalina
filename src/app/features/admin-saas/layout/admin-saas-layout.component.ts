import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

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
  protected readonly itens = NAV_SAAS;

  private readonly router = inject(Router);

  protected readonly sidebarOpen = signal(false);

  protected toggleSidebar(): void {
    this.sidebarOpen.update((aberto) => !aberto);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  async sair(): Promise<void> {
    await this.auth.sair();
    await this.router.navigateByUrl('/login');
  }
}
