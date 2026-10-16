import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import {
  EMAIL_ADMIN_DEMO,
  EMAIL_ALUNO_DEMO,
  EMAIL_PROFESSOR_DEMO,
} from '../auth/contas-demo';
import { AutenticacaoErro } from '../models/autenticacao-erro';
import { StorageService } from './storage.service';

const CHAVE_SESSAO = 'turmalina.sessao';

describe('AuthService', () => {
  let servico: AuthService;

  beforeEach(() => {
    localStorage.removeItem(CHAVE_SESSAO);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        AuthService,
        StorageService,
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });
    servico = TestBed.inject(AuthService);
  });

  it('autentica um usuário de demonstração', async () => {
    const usuario = await servico.entrar({ email: EMAIL_ADMIN_DEMO, senha: 'turmalina' });

    expect(usuario.papel).toBe('administrador');
    expect(servico.autenticado()).toBeTrue();
  });

  it('rejeita credenciais inválidas', async () => {
    await expectAsync(
      servico.entrar({ email: 'ninguem@turmalina.com', senha: 'errada' }),
    ).toBeRejectedWithError(AutenticacaoErro);
  });

  it('encerra a sessão', async () => {
    await servico.entrar({ email: EMAIL_PROFESSOR_DEMO, senha: 'turmalina' });

    await servico.sair();

    expect(servico.autenticado()).toBeFalse();
    expect(servico.usuario()).toBeNull();
  });

  it('informa o papel do usuário autenticado', async () => {
    await servico.entrar({ email: EMAIL_ALUNO_DEMO, senha: 'turmalina' });

    expect(servico.temPapel('aluno')).toBeTrue();
    expect(servico.temPapel('administrador')).toBeFalse();
  });
});
