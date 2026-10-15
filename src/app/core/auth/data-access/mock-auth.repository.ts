import { Injectable, inject } from '@angular/core';

import { StorageService } from '../../services/storage.service';
import { AutenticacaoErro } from '../../models/autenticacao-erro';
import { Credenciais } from '../../models/credenciais.model';
import { Sessao } from '../../models/sessao.model';
import { Usuario } from '../../models/usuario.model';
import { AuthRepository } from './auth.repository';

interface UsuarioDemo extends Usuario {
  senha: string;
}

const CHAVE_SESSAO = 'turmalina.sessao';
const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000;

/**
 * Contas de demonstração (dados sintéticos).
 * NÃO são credenciais reais e NÃO devem existir em produção.
 */
const USUARIOS_DEMO: readonly UsuarioDemo[] = [
  {
    id: 'usuario-admin',
    nome: 'Ana Administradora',
    email: 'admin@turmalina.demo',
    papel: 'administrador',
    ativo: true,
    senha: 'turmalina',
  },
  {
    id: 'usuario-professor',
    nome: 'Bruno Professor',
    email: 'professor@turmalina.demo',
    papel: 'professor',
    ativo: true,
    senha: 'turmalina',
  },
  {
    id: 'usuario-aluno',
    nome: 'Carla Aluna',
    email: 'aluno@turmalina.demo',
    papel: 'aluno',
    ativo: true,
    senha: 'turmalina',
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

  private criarSessao(usuarioDemo: UsuarioDemo): Sessao {
    return {
      token: `demo-${usuarioDemo.id}-${Date.now().toString(36)}`,
      usuario: {
        id: usuarioDemo.id,
        nome: usuarioDemo.nome,
        email: usuarioDemo.email,
        papel: usuarioDemo.papel,
        ativo: usuarioDemo.ativo,
      },
      expiraEm: new Date(Date.now() + DURACAO_SESSAO_MS).toISOString(),
    };
  }
}
