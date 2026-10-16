import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { rotaInicialPorPapel } from '../rota-inicial';

/**
 * Protege a rota `/primeiro-acesso`.
 *
 * Permite o acesso apenas para usuários autenticados que ainda precisam trocar
 * a senha. Quem já concluiu o primeiro acesso é enviado à rota inicial do seu
 * papel.
 */
export const primeiroAcessoGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.garantirSessaoCarregada();

  if (!auth.autenticado()) {
    return router.createUrlTree(['/login']);
  }

  if (!auth.precisaTrocarSenha()) {
    const papel = auth.papel();
    return router.createUrlTree([papel ? rotaInicialPorPapel(papel) : '/login']);
  }

  return true;
};
