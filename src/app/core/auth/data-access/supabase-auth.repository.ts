import { Injectable, inject } from '@angular/core';
import type { AuthError } from '@supabase/supabase-js';

import { AutenticacaoErro, MotivoFalhaAutenticacao } from '../../models/autenticacao-erro';
import { Credenciais } from '../../models/credenciais.model';
import { Perfil } from '../../models/perfil.model';
import { Sessao } from '../../models/sessao.model';
import { SupabaseService } from '../../services/supabase.service';
import { AuthRepository, ProvedorOAuth } from './auth.repository';
import { aplicarPerfilSupabase, LinhaPerfil, mapearPerfilSupabase } from './mapear-perfil-supabase';
import { mapearSessaoSupabase } from './mapear-usuario-supabase';

/**
 * Autenticação real via Supabase Auth.
 *
 * O login atual é por e-mail e senha. O fluxo OAuth (Google) já está
 * implementado e é acionado por `entrarComProvedor` quando a interface for
 * habilitada.
 */
@Injectable()
export class SupabaseAuthRepository extends AuthRepository {
  private readonly supabase = inject(SupabaseService);

  suportaOAuth(): boolean {
    return true;
  }

  async autenticar(credenciais: Credenciais): Promise<Sessao> {
    if (!this.supabase.disponivel) {
      throw new AutenticacaoErro('falha-desconhecida');
    }

    const cliente = await this.supabase.obterCliente();
    const { data, error } = await cliente.auth.signInWithPassword({
      email: credenciais.email.trim().toLowerCase(),
      password: credenciais.senha,
    });

    if (error || !data.session) {
      throw new AutenticacaoErro(motivoDoErro(error));
    }

    const perfil = await this.buscarPerfil(data.session.user.id);
    if (perfil.encontrado && !perfil.perfil?.ativo) {
      await this.encerrarSessao();
      throw new AutenticacaoErro('usuario-inativo');
    }

    return this.comPerfilMapeado(mapearSessaoSupabase(data.session), perfil.perfil);
  }

  async restaurarSessao(): Promise<Sessao | null> {
    if (!this.supabase.disponivel) {
      return null;
    }

    const cliente = await this.supabase.obterCliente();
    const { data, error } = await cliente.auth.getSession();

    if (error || !data.session) {
      return null;
    }

    const perfil = await this.buscarPerfil(data.session.user.id);
    // Só encerra a sessão quando a consulta funcionou e comprovou que o perfil
    // não existe mais ou está inativo. Uma falha transitória na consulta não
    // pode deslogar o usuário.
    if (perfil.encontrado && (!perfil.perfil || !perfil.perfil.ativo)) {
      await this.encerrarSessao();
      return null;
    }

    return this.comPerfilMapeado(mapearSessaoSupabase(data.session), perfil.perfil);
  }

  async encerrarSessao(): Promise<void> {
    if (!this.supabase.disponivel) {
      return;
    }

    const cliente = await this.supabase.obterCliente();
    await cliente.auth.signOut();
  }

  async alterarSenha(novaSenha: string): Promise<void> {
    if (!this.supabase.disponivel) {
      throw new AutenticacaoErro('falha-desconhecida');
    }

    const cliente = await this.supabase.obterCliente();
    const { error } = await cliente.auth.updateUser({ password: novaSenha });

    if (error) {
      throw new AutenticacaoErro(motivoDoErro(error));
    }
  }

  async concluirPrimeiroAcesso(): Promise<void> {
    if (!this.supabase.disponivel) {
      return;
    }

    const cliente = await this.supabase.obterCliente();
    const { error } = await cliente.rpc('concluir_primeiro_acesso');

    if (error) {
      throw new AutenticacaoErro('falha-desconhecida');
    }
  }

  async entrarComProvedor(provedor: ProvedorOAuth): Promise<void> {
    if (!this.supabase.disponivel) {
      throw new AutenticacaoErro('falha-desconhecida');
    }

    const urlRetorno = typeof window !== 'undefined' ? window.location.origin : undefined;
    const cliente = await this.supabase.obterCliente();

    const { error } = await cliente.auth.signInWithOAuth({
      provider: provedor,
      options: { redirectTo: urlRetorno },
    });

    if (error) {
      throw new AutenticacaoErro('falha-desconhecida');
    }
  }

  /**
   * Enriquecer a sessão com o perfil de `public.perfis`, que é a fonte
   * autoritativa do papel e da flag de primeiro acesso. Se não houver perfil,
   * mantém o papel obtido dos metadados do Auth.
   */
  private comPerfilMapeado(sessao: Sessao, perfil: Perfil | null): Sessao {
    return { ...sessao, usuario: aplicarPerfilSupabase(sessao.usuario, perfil) };
  }

  private async buscarPerfil(userId: string): Promise<ResultadoPerfil> {
    const cliente = await this.supabase.obterCliente();
    const { data, error } = await cliente
      .from('perfis')
      .select('user_id, institution_id, papel, nome, ativo, precisa_trocar_senha')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { encontrado: false, perfil: null };
    }

    if (!data) {
      return { encontrado: true, perfil: null };
    }

    return { encontrado: true, perfil: mapearPerfilSupabase(data as unknown as LinhaPerfil) };
  }
}

interface ResultadoPerfil {
  /** `true` quando a consulta foi concluída (mesmo que sem linha). */
  encontrado: boolean;
  perfil: Perfil | null;
}

function motivoDoErro(erro: AuthError | null): MotivoFalhaAutenticacao {
  if (!erro) {
    return 'falha-desconhecida';
  }

  if (erro.code === 'email_not_confirmed') {
    return 'email-nao-confirmado';
  }

  if (erro.code === 'invalid_credentials' || erro.status === 400) {
    return 'credenciais-invalidas';
  }

  return 'falha-desconhecida';
}
