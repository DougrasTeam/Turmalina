import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';

import { primeiroAcessoGuard } from './primeiro-acesso.guard';
import { AuthService } from '../../services/auth.service';

interface EstadoAuth {
  autenticado: boolean;
  precisaTrocarSenha: boolean;
  papel: 'administrador' | 'professor' | 'aluno' | null;
}

async function executarGuard(estado: EstadoAuth): Promise<boolean | UrlTree> {
  const auth = {
    garantirSessaoCarregada: () => Promise.resolve(),
    autenticado: () => estado.autenticado,
    precisaTrocarSenha: () => estado.precisaTrocarSenha,
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
    () => primeiroAcessoGuard({} as never, {} as never) as Promise<boolean | UrlTree>,
  );
}

describe('primeiroAcessoGuard', () => {
  it('libera o acesso quando a senha precisa ser trocada', async () => {
    const resultado = await executarGuard({
      autenticado: true,
      precisaTrocarSenha: true,
      papel: 'aluno',
    });

    expect(resultado).toBeTrue();
  });

  it('envia ao login quando não há sessão', async () => {
    const resultado = await executarGuard({
      autenticado: false,
      precisaTrocarSenha: false,
      papel: null,
    });

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(String(resultado)).toBe('/login');
  });

  it('envia à rota inicial do professor quando a senha já foi definida', async () => {
    const resultado = await executarGuard({
      autenticado: true,
      precisaTrocarSenha: false,
      papel: 'professor',
    });

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(String(resultado)).toBe('/dashboard');
  });

  it('envia à área do aluno quando a senha já foi definida', async () => {
    const resultado = await executarGuard({
      autenticado: true,
      precisaTrocarSenha: false,
      papel: 'aluno',
    });

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(String(resultado)).toBe('/aluno/inicio');
  });
});
