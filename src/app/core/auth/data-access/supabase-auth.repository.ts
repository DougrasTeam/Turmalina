import { Injectable, inject } from '@angular/core';
import type { AuthError } from '@supabase/supabase-js';

import { AcessoEscola } from '../../models/acesso-escola.model';
import { AutenticacaoErro, MotivoFalhaAutenticacao } from '../../models/autenticacao-erro';
import { Credenciais } from '../../models/credenciais.model';
import { Papel, PAPEIS } from '../../models/papel.model';
import { Perfil } from '../../models/perfil.model';
import { Sessao } from '../../models/sessao.model';
import { Usuario } from '../../models/usuario.model';
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
 *
 * Multi-escola: a lista de vínculos vem da RPC `minhas_instituicoes` e a escola
 * ativa de `instituicoes_ativas` (selecionada após o login). Sem seleção e com
 * mais de uma escola, a sessão fica sem `institutionId` e a UI pede a escolha.
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

    const sessaoBase = mapearSessaoSupabase(data.session);
    const acessos = await this.carregarAcessos();

    if (!acessos.consultado) {
      return this.autenticarComPerfilLegado(sessaoBase, data.session.user.id);
    }

    try {
      return await this.resolverSessao(sessaoBase, acessos.lista);
    } catch (erro) {
      await this.encerrarSessao();
      throw erro;
    }
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

    const sessaoBase = mapearSessaoSupabase(data.session);
    const acessos = await this.carregarAcessos();

    if (!acessos.consultado) {
      return this.restaurarComPerfilLegado(sessaoBase, data.session.user.id);
    }

    try {
      return await this.resolverSessao(sessaoBase, acessos.lista);
    } catch {
      await this.encerrarSessao();
      return null;
    }
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

  async selecionarInstituicao(institutionId: string): Promise<void> {
    if (!this.supabase.disponivel) {
      throw new AutenticacaoErro('falha-desconhecida');
    }

    const cliente = await this.supabase.obterCliente();
    const { error } = await cliente.rpc('selecionar_instituicao', {
      p_institution_id: institutionId,
    });

    if (error) {
      if (error.message.toLowerCase().includes('inativa')) {
        throw new AutenticacaoErro('escola-inativa');
      }
      throw new AutenticacaoErro('sem-acesso-escola');
    }
  }

  async limparInstituicaoSelecionada(): Promise<void> {
    if (!this.supabase.disponivel) {
      return;
    }

    const cliente = await this.supabase.obterCliente();
    const { error } = await cliente.rpc('limpar_instituicao_ativa');

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
   * Combina a sessão do Auth com os vínculos do usuário.
   *
   * - super_admin: membresia sintética global (`saas`), sem escola;
   * - uma escola ativa: seleciona automaticamente (inclusive grava a escolha);
   * - várias escolas ativas: usa a seleção salva ou devolve a sessão sem
   *   `institutionId`, sinalizando que a UI deve pedir a escolha;
   * - nenhuma escola ativa: bloqueia com `escola-inativa`.
   */
  private async resolverSessao(sessaoBase: Sessao, acessos: readonly AcessoEscola[]): Promise<Sessao> {
    if (!acessos.length) {
      throw new AutenticacaoErro('sem-acesso-escola');
    }

    const superAdmin = acessos.find((acesso) => acesso.papel === 'super_admin');
    if (superAdmin) {
      return {
        ...sessaoBase,
        usuario: this.usuarioDoAcesso(sessaoBase.usuario, superAdmin),
        instituicoes: acessos,
      };
    }

    const escolasAtivas = acessos.filter((acesso) => acesso.status === 'ativa');
    if (!escolasAtivas.length) {
      throw new AutenticacaoErro('escola-inativa');
    }

    const escolaSelecionada = escolasAtivas.find((acesso) => acesso.selecionada) ?? null;
    const escolaUnica = escolasAtivas.length === 1 ? escolasAtivas[0] : null;
    const escolaAtiva = escolaSelecionada ?? escolaUnica;

    if (!escolaAtiva) {
      return {
        ...sessaoBase,
        usuario: {
          ...sessaoBase.usuario,
          papel: escolasAtivas[0].papel,
          institutionId: '',
          ativo: true,
          precisaTrocarSenha: escolasAtivas.some((acesso) => acesso.precisaTrocarSenha),
        },
        instituicoes: acessos,
      };
    }

    if (!escolaAtiva.selecionada) {
      await this.selecionarInstituicao(escolaAtiva.institutionId);
    }

    return {
      ...sessaoBase,
      usuario: this.usuarioDoAcesso(sessaoBase.usuario, escolaAtiva),
      instituicoes: acessos,
    };
  }

  private usuarioDoAcesso(usuario: Usuario, acesso: AcessoEscola): Usuario {
    const institutionId = acesso.papel === 'super_admin' ? 'saas' : acesso.institutionId;

    return {
      ...usuario,
      papel: acesso.papel,
      nome: acesso.nomeUsuario.trim() !== '' ? acesso.nomeUsuario : usuario.nome,
      ativo: true,
      institutionId,
      precisaTrocarSenha: acesso.precisaTrocarSenha,
    };
  }

  private async carregarAcessos(): Promise<ResultadoAcessos> {
    const cliente = await this.supabase.obterCliente();
    const { data, error } = await cliente.rpc('minhas_instituicoes');

    if (error) {
      return { consultado: false, lista: [] };
    }

    const linhas = (data ?? []) as unknown as LinhaAcessoRpc[];
    return { consultado: true, lista: linhas.map(mapearAcesso) };
  }

  /** Compatibilidade com bancos que ainda não aplicaram a 0019. */
  private async autenticarComPerfilLegado(sessaoBase: Sessao, userId: string): Promise<Sessao> {
    const perfil = await this.buscarPerfil(userId);
    const motivo = await this.validarAcessoDoPerfil(perfil);
    if (motivo) {
      await this.encerrarSessao();
      throw new AutenticacaoErro(motivo);
    }

    return {
      ...sessaoBase,
      usuario: aplicarPerfilSupabase(sessaoBase.usuario, perfil.perfil),
      instituicoes: [],
    };
  }

  /** Compatibilidade com bancos que ainda não aplicaram a 0019. */
  private async restaurarComPerfilLegado(sessaoBase: Sessao, userId: string): Promise<Sessao | null> {
    const perfil = await this.buscarPerfil(userId);
    const motivo = await this.validarAcessoDoPerfil(perfil);
    if (motivo) {
      await this.encerrarSessao();
      return null;
    }

    return {
      ...sessaoBase,
      usuario: aplicarPerfilSupabase(sessaoBase.usuario, perfil.perfil),
      instituicoes: [],
    };
  }

  /**
   * Enriquecer a sessão com o perfil de `public.perfis`, que é a fonte
   * autoritativa do papel e da flag de primeiro acesso. Se não houver perfil,
   * mantém o papel obtido dos metadados do Auth.
   */
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

  /**
   * Bloqueia o acesso quando o perfil está inativo ou a escola foi inativada
   * pelo painel do SaaS. O `super_admin` é global e não pertence a uma escola.
   */
  private async validarAcessoDoPerfil(
    resultado: ResultadoPerfil,
  ): Promise<MotivoFalhaAutenticacao | null> {
    if (!resultado.encontrado) {
      return 'falha-desconhecida';
    }

    if (!resultado.perfil) {
      return 'sem-acesso-escola';
    }

    const perfil = resultado.perfil;
    if (!perfil.ativo) {
      return 'usuario-inativo';
    }

    if (perfil.papel === 'super_admin') {
      return null;
    }

    return (await this.instituicaoEstaAtiva(perfil.institutionId)) ? null : 'escola-inativa';
  }

  private async instituicaoEstaAtiva(institutionId: string): Promise<boolean> {
    const cliente = await this.supabase.obterCliente();
    const { data, error } = await cliente
      .from('instituicoes')
      .select('status')
      .eq('institution_id', institutionId)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return data.status === 'ativa';
  }
}

interface ResultadoPerfil {
  /** `true` quando a consulta foi concluída (mesmo que sem linha). */
  encontrado: boolean;
  perfil: Perfil | null;
}

interface ResultadoAcessos {
  /** `true` quando a RPC multi-escola está disponível e respondeu. */
  consultado: boolean;
  lista: AcessoEscola[];
}

interface LinhaAcessoRpc {
  institution_id: string;
  nome_instituicao: string | null;
  slug: string | null;
  papel: string;
  nome_usuario: string | null;
  status_instituicao: string | null;
  selecionada: boolean | null;
  precisa_trocar_senha: boolean | null;
}

function mapearAcesso(linha: LinhaAcessoRpc): AcessoEscola {
  return {
    institutionId: linha.institution_id,
    nome: linha.nome_instituicao ?? 'Escola',
    slug: linha.slug,
    papel: normalizarPapel(linha.papel),
    nomeUsuario: linha.nome_usuario ?? '',
    status: linha.status_instituicao === 'inativa' ? 'inativa' : 'ativa',
    selecionada: linha.selecionada ?? false,
    precisaTrocarSenha: linha.precisa_trocar_senha ?? false,
  };
}

function normalizarPapel(papel: string): Papel {
  return (PAPEIS as readonly string[]).includes(papel) ? (papel as Papel) : 'aluno';
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
