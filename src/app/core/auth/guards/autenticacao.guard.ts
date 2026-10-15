import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

/**
 * Bloqueia o acesso quando não há sessão válida.
 * Aguarda a restauração da sessão antes de decidir, para não redirecionar
 * um usuário autenticado indevidamente ao recarregar a página.
 */
export const autenticacaoGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.garantirSessaoCarregada();

  if (auth.autenticado()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
