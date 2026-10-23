import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { rotaInicialPorPapel } from '../rota-inicial';

/**
 * Restringe a rota ao administrador global do SaaS (`super_admin`).
 * Qualquer outro usuário autenticado é devolvido à sua rota inicial.
 */
export const superAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.garantirSessaoCarregada();

  if (!auth.autenticado()) {
    return router.createUrlTree(['/login']);
  }

  if (auth.papel() === 'super_admin') {
    return true;
  }

  const papel = auth.papel();
  return papel
    ? router.createUrlTree([rotaInicialPorPapel(papel)])
    : router.createUrlTree(['/login']);
};
