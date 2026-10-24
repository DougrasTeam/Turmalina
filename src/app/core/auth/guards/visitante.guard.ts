import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { rotaInicialPorPapel } from '../rota-inicial';

/**
 * Restringe rotas públicas de cadastro a visitantes sem sessão autenticada.
 */
export const visitanteGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.garantirSessaoCarregada();

  if (!auth.autenticado()) {
    return true;
  }

  if (auth.precisaTrocarSenha()) {
    return router.createUrlTree(['/primeiro-acesso']);
  }

  if (auth.precisaSelecionarEscola()) {
    return router.createUrlTree(['/selecionar-escola']);
  }

  const papel = auth.papel();
  return papel
    ? router.createUrlTree([rotaInicialPorPapel(papel)])
    : router.createUrlTree(['/login']);
};
