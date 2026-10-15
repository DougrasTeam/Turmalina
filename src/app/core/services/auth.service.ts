import { Injectable, computed, inject, signal } from '@angular/core';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { Credenciais } from '../models/credenciais.model';
import { Papel } from '../models/papel.model';
import { Sessao } from '../models/sessao.model';
import { Usuario } from '../models/usuario.model';

/**
 * Serviço de autenticação e sessão.
 * Usa contratos (AuthRepository) para permitir trocar entre mock e implementação real.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly repositorio = inject(AuthRepository);

  private readonly _sessao = signal<Sessao | null>(null);
  private readonly _carregando = signal(true);
  private restauracaoEmAndamento: Promise<void> | null = null;

  readonly sessao = this._sessao.asReadonly();
  readonly usuario = computed(() => this._sessao()?.usuario ?? null);
  readonly papel = computed(() => this._sessao()?.usuario.papel ?? null);
  readonly autenticado = computed(() => this._sessao() !== null);
  readonly carregando = this._carregando.asReadonly();

  async garantirSessaoCarregada(): Promise<void> {
    if (!this.restauracaoEmAndamento) {
      this.restauracaoEmAndamento = this.restaurar();
    }
    await this.restauracaoEmAndamento;
  }

  private async restaurar(): Promise<void> {
    try {
      const sessao = await this.repositorio.restaurarSessao();
      this._sessao.set(sessao);
    } finally {
      this._carregando.set(false);
    }
  }

  async entrar(credenciais: Credenciais): Promise<Usuario> {
    try {
      const sessao = await this.repositorio.autenticar(credenciais);
      this._sessao.set(sessao);
      return sessao.usuario;
    } finally {
      this._carregando.set(false);
    }
  }

  async sair(): Promise<void> {
    await this.repositorio.encerrarSessao();
    this._sessao.set(null);
  }

  temPapel(...papeis: readonly Papel[]): boolean {
    const papel = this.papel();
    if (papel === null) {
      return false;
    }
    return papeis.includes(papel);
  }
}
