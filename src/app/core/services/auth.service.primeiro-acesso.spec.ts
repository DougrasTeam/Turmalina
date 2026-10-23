import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { AuthRepository } from '../auth/data-access/auth.repository';
import { Credenciais } from '../models/credenciais.model';
import { Sessao } from '../models/sessao.model';
import { Usuario } from '../models/usuario.model';
import { TenantService } from './tenant.service';

class AuthRepositoryStub extends AuthRepository {
  senhaAlterada: string | null = null;
  primeiroAcessoConcluido = false;

  async autenticar(_credenciais: Credenciais): Promise<Sessao> {
    return this.criarSessao();
  }

  async restaurarSessao(): Promise<Sessao | null> {
    return null;
  }

  async encerrarSessao(): Promise<void> {
    // Sem efeito.
  }

  suportaOAuth(): boolean {
    return false;
  }

  async entrarComProvedor(): Promise<void> {
    // Sem efeito.
  }

  async alterarSenha(novaSenha: string): Promise<void> {
    this.senhaAlterada = novaSenha;
  }

  async concluirPrimeiroAcesso(): Promise<void> {
    this.primeiroAcessoConcluido = true;
  }

  private criarSessao(): Sessao {
    const usuario: Usuario = {
      id: 'user-1',
      nome: 'Bruno Professor',
      email: 'bruno@turmalina.com',
      papel: 'professor',
      ativo: true,
      institutionId: 'escola-nova',
      precisaTrocarSenha: true,
    };

    return {
      token: 'token-1',
      usuario,
      expiraEm: new Date(Date.now() + 60_000).toISOString(),
    };
  }
}

describe('AuthService — primeiro acesso', () => {
  let servico: AuthService;
  let repositorio: AuthRepositoryStub;

  beforeEach(() => {
    repositorio = new AuthRepositoryStub();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuthService,
        { provide: AuthRepository, useValue: repositorio },
      ],
    });
    servico = TestBed.inject(AuthService);
  });

  it('sinaliza que a senha precisa ser trocada', async () => {
    await servico.entrar({ email: 'bruno@turmalina.com', senha: 'provisoria' });

    expect(servico.precisaTrocarSenha()).toBeTrue();
  });

  it('aplica a instituição da sessão no contexto de tenancy', async () => {
    await servico.entrar({ email: 'bruno@turmalina.com', senha: 'provisoria' });

    expect(TestBed.inject(TenantService).atual()).toBe('escola-nova');
  });

  it('altera a senha, conclui o primeiro acesso e limpa a flag', async () => {
    await servico.entrar({ email: 'bruno@turmalina.com', senha: 'provisoria' });

    await servico.alterarSenhaPrimeiroAcesso('nova-senha-123');

    expect(repositorio.senhaAlterada).toBe('nova-senha-123');
    expect(repositorio.primeiroAcessoConcluido).toBeTrue();
    expect(servico.precisaTrocarSenha()).toBeFalse();
  });

  it('não quebra o acesso quando não há sessão', () => {
    expect(servico.precisaTrocarSenha()).toBeFalse();
  });
});
