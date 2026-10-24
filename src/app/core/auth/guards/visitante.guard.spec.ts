import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { visitanteGuard } from './visitante.guard';

interface EstadoAuth {
  autenticado: boolean;
  precisaTrocarSenha: boolean;
  precisaSelecionarEscola: boolean;
  papel: 'administrador' | 'professor' | 'aluno' | 'super_admin' | null;
}

async function executarGuard(estado: EstadoAuth): Promise<boolean | UrlTree> {
  const auth = {
    garantirSessaoCarregada: () => Promise.resolve(),
    autenticado: () => estado.autenticado,
    precisaTrocarSenha: () => estado.precisaTrocarSenha,
    precisaSelecionarEscola: () => estado.precisaSelecionarEscola,
    papel: () => estado.papel,
  };

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: AuthService, useValue: auth },
    ],
  });

  return TestBed.runInInjectionContext(
    () => visitanteGuard({} as never, {} as never) as Promise<boolean | UrlTree>,
  );
}

describe('visitanteGuard', () => {
  it('permite o acesso quando não há sessão', async () => {
    const resultado = await executarGuard({
      autenticado: false,
      precisaTrocarSenha: false,
      precisaSelecionarEscola: false,
      papel: null,
    });

    expect(resultado).toBeTrue();
  });

  it('encaminha usuário autenticado para o primeiro acesso quando precisa trocar a senha', async () => {
    const resultado = await executarGuard({
      autenticado: true,
      precisaTrocarSenha: true,
      precisaSelecionarEscola: false,
      papel: 'professor',
    });

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(String(resultado)).toBe('/primeiro-acesso');
  });

  it('encaminha usuário que precisa escolher escola para a seleção', async () => {
    const resultado = await executarGuard({
      autenticado: true,
      precisaTrocarSenha: false,
      precisaSelecionarEscola: true,
      papel: 'professor',
    });

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(String(resultado)).toBe('/selecionar-escola');
  });

  it('encaminha usuário autenticado à rota inicial de seu papel', async () => {
    const resultado = await executarGuard({
      autenticado: true,
      precisaTrocarSenha: false,
      precisaSelecionarEscola: false,
      papel: 'aluno',
    });

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(String(resultado)).toBe('/aluno/inicio');
  });
});
