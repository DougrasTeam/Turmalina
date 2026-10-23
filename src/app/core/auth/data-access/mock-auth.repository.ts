import { Injectable, inject } from '@angular/core';

import { StorageService } from '../../services/storage.service';
import { INSTITUICAO_PADRAO_ID } from '../../services/tenant.service';
import { AutenticacaoErro } from '../../models/autenticacao-erro';
import { Credenciais } from '../../models/credenciais.model';
import { Sessao } from '../../models/sessao.model';
import { Usuario } from '../../models/usuario.model';
import { AuthRepository, ProvedorOAuth } from './auth.repository';
import { EMAIL_ADMIN_DEMO, EMAIL_ALUNO_DEMO, EMAIL_PROFESSOR_DEMO } from '../contas-demo';

interface UsuarioDemo extends Omit<Usuario, 'precisaTrocarSenha'> {
  senha: string;
}

const CHAVE_SESSAO = 'turmalina.sessao';
const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000;
const SENHA_DEMO = 'turmalina';

/**
 * Contas de demonstração (dados sintéticos).
 * NÃO são credenciais reais e NÃO devem existir em produção.
 */
const USUARIOS_DEMO: readonly UsuarioDemo[] = [
  {
    id: 'usuario-admin',
    nome: 'Ana Administradora',
    email: EMAIL_ADMIN_DEMO,
    papel: 'administrador',
    ativo: true,
    institutionId: INSTITUICAO_PADRAO_ID,
    senha: SENHA_DEMO,
  },
  {
    id: 'usuario-professor',
    nome: 'Bruno Professor',
    email: EMAIL_PROFESSOR_DEMO,
    papel: 'professor',
    ativo: true,
    institutionId: INSTITUICAO_PADRAO_ID,
    senha: SENHA_DEMO,
  },
  {
    id: 'usuario-aluno',
    nome: 'Carla Aluna',
    email: EMAIL_ALUNO_DEMO,
    papel: 'aluno',
    ativo: true,
    institutionId: INSTITUICAO_PADRAO_ID,
    senha: SENHA_DEMO,
  },
];

/**
 * Implementação de demonstração do AuthRepository.
 *
 * ATENÇÃO: não há backend de autenticação. As credenciais são sintéticas e
 * servem apenas para desenvolvimento local. A sessão é guardada no
 * armazenamento do navegador apenas para permitir restauração ao recarregar.
 * Substitua por um repositório real antes de qualquer uso com dados reais.
 */
@Injectable()
export class MockAuthRepository extends AuthRepository {
  private readonly storage = inject(StorageService);

  async autenticar(credenciais: Credenciais): Promise<Sessao> {
    const emailNormalizado = credenciais.email.trim().toLowerCase();
    const usuarioDemo = USUARIOS_DEMO.find((usuario) => usuario.email === emailNormalizado);

    if (!usuarioDemo || usuarioDemo.senha !== credenciais.senha) {
      throw new AutenticacaoErro('credenciais-invalidas');
    }

    if (!usuarioDemo.ativo) {
      throw new AutenticacaoErro('usuario-inativo');
    }

    const sessao = this.criarSessao(usuarioDemo);
    this.storage.write(CHAVE_SESSAO, sessao);
    return sessao;
  }

  async restaurarSessao(): Promise<Sessao | null> {
    const sessao = this.storage.read<Sessao | null>(CHAVE_SESSAO, null);

    if (!sessao) {
      return null;
    }

    if (new Date(sessao.expiraEm).getTime() <= Date.now()) {
      this.storage.remove(CHAVE_SESSAO);
      return null;
    }

    return sessao;
  }

  async encerrarSessao(): Promise<void> {
    this.storage.remove(CHAVE_SESSAO);
  }

  suportaOAuth(): boolean {
    return false;
  }

  async entrarComProvedor(_provedor: ProvedorOAuth): Promise<void> {
    throw new AutenticacaoErro('provedor-indisponivel');
  }

  async alterarSenha(_novaSenha: string): Promise<void> {
    // Sem backend de autenticação no modo de demonstração.
  }

  async concluirPrimeiroAcesso(): Promise<void> {
    // Sem backend de autenticação no modo de demonstração.
  }

  private criarSessao(usuarioDemo: UsuarioDemo): Sessao {
    return {
      token: `demo-${usuarioDemo.id}-${Date.now().toString(36)}`,
      usuario: {
        id: usuarioDemo.id,
        nome: usuarioDemo.nome,
        email: usuarioDemo.email,
        papel: usuarioDemo.papel,
        ativo: usuarioDemo.ativo,
        institutionId: INSTITUICAO_PADRAO_ID,
        precisaTrocarSenha: false,
      },
      expiraEm: new Date(Date.now() + DURACAO_SESSAO_MS).toISOString(),
    };
  }
}
