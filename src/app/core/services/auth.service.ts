import { Injectable, computed, inject, signal } from '@angular/core';

import { AuthRepository, ProvedorOAuth } from '../auth/data-access/auth.repository';
import { AcessoEscola } from '../models/acesso-escola.model';
import { AutenticacaoErro } from '../models/autenticacao-erro';
import { Credenciais } from '../models/credenciais.model';
import { Papel } from '../models/papel.model';
import { Sessao } from '../models/sessao.model';
import { Usuario } from '../models/usuario.model';
import { TenantService } from './tenant.service';

/**
 * Serviço de autenticação e sessão.
 * Usa contratos (AuthRepository) para permitir trocar entre mock e implementação real.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly repositorio = inject(AuthRepository);
  private readonly tenant = inject(TenantService);

  private readonly _sessao = signal<Sessao | null>(null);
  private readonly _carregando = signal(true);
  private restauracaoEmAndamento: Promise<void> | null = null;

  readonly sessao = this._sessao.asReadonly();
  readonly usuario = computed(() => this._sessao()?.usuario ?? null);
  readonly papel = computed(() => this._sessao()?.usuario.papel ?? null);
  readonly autenticado = computed(() => this._sessao() !== null);
  readonly precisaTrocarSenha = computed(() => this._sessao()?.usuario.precisaTrocarSenha ?? false);
  readonly carregando = this._carregando.asReadonly();

  /** Escolas vinculadas ao usuário (uma por perfil). */
  readonly instituicoes = computed<readonly AcessoEscola[]>(
    () => this._sessao()?.instituicoes ?? [],
  );

  /** Escola atualmente selecionada, se houver. */
  readonly escolaAtual = computed<AcessoEscola | null>(() => {
    const institutionId = this.usuario()?.institutionId;
    if (!institutionId) return null;
    return this.instituicoes().find((acesso) => acesso.institutionId === institutionId) ?? null;
  });

  /**
   * Verdadeiro quando o usuário possui vínculos, mas ainda não há escola ativa
   * na sessão. A UI deve mostrar a escolha de escola antes do shell.
   */
  readonly precisaSelecionarEscola = computed(() => {
    const usuario = this.usuario();
    if (!usuario || usuario.papel === 'super_admin') return false;
    return this.instituicoes().length > 0 && usuario.institutionId === '';
  });

  async garantirSessaoCarregada(): Promise<void> {
    if (!this.restauracaoEmAndamento) {
      this.restauracaoEmAndamento = this.restaurar();
    }
    await this.restauracaoEmAndamento;
  }

  private async restaurar(): Promise<void> {
    try {
      const sessao = await this.repositorio.restaurarSessao();
      this.aplicarSessao(sessao);
    } finally {
      this._carregando.set(false);
    }
  }

  async entrar(credenciais: Credenciais): Promise<Usuario> {
    try {
      const sessao = await this.repositorio.autenticar(credenciais);
      this.aplicarSessao(sessao);
      return sessao.usuario;
    } finally {
      this._carregando.set(false);
    }
  }

  async sair(): Promise<void> {
    await this.repositorio.encerrarSessao();
    this.aplicarSessao(null);
  }

  /**
   * Mantém o contexto de tenancy alinhado à sessão. É esse valor que os
   * repositórios gravam em `institution_id`; se ele ficar no padrão, o RLS
   * rejeita escritas de escolas criadas fora do seed.
   */
  private aplicarSessao(sessao: Sessao | null): void {
    this._sessao.set(sessao);
    this.tenant.definir(sessao?.usuario.institutionId ?? null);
  }

  /** Define a escola ativa e recarrega a sessão já no novo contexto. */
  async selecionarEscola(institutionId: string): Promise<void> {
    await this.repositorio.selecionarInstituicao(institutionId);
    await this.recarregarSessao();
  }

  /**
   * Remove a seleção atual para que o usuário escolha outra escola.
   * A sessão resultante fica sem `institutionId` até nova escolha.
   */
  async trocarEscola(): Promise<void> {
    await this.repositorio.limparInstituicaoSelecionada();
    await this.recarregarSessao();
  }

  private async recarregarSessao(): Promise<void> {
    const sessao = await this.repositorio.restaurarSessao();
    if (!sessao) {
      this.aplicarSessao(null);
      throw new AutenticacaoErro('sem-acesso-escola');
    }
    this.aplicarSessao(sessao);
  }

  /**
   * Conclui o primeiro acesso: define a nova senha do usuário e limpa a flag
   * `precisaTrocarSenha` no banco e na sessão local.
   */
  async alterarSenhaPrimeiroAcesso(novaSenha: string): Promise<void> {
    await this.repositorio.alterarSenha(novaSenha);
    await this.repositorio.concluirPrimeiroAcesso();
    this._sessao.update((sessao) =>
      sessao ? { ...sessao, usuario: { ...sessao.usuario, precisaTrocarSenha: false } } : sessao,
    );
  }

  /** Indica se o login por provedor externo (ex.: Google) está disponível. */
  podeEntrarComProvedor(): boolean {
    return this.repositorio.suportaOAuth();
  }

  /**
   * Inicia o login por provedor externo. O navegador é redirecionado ao
   * provedor; a sessão é restaurada automaticamente no retorno.
   */
  async entrarComProvedor(provedor: ProvedorOAuth): Promise<void> {
    await this.repositorio.entrarComProvedor(provedor);
  }

  temPapel(...papeis: readonly Papel[]): boolean {
    const papel = this.papel();
    if (papel === null) {
      return false;
    }
    return papeis.includes(papel);
  }
}
