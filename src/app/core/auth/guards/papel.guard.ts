import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { Papel } from '../../models/papel.model';
import { rotaInicialPorPapel } from '../rota-inicial';

/**
 * Fábrica de guard de papel. Autoriza a rota apenas para os papéis informados.
 *
 * Importante: guard é conveniência de UX. A autorização real deve ser
 * revalidada no backend/banco, conforme a especificação.
 */
export function papelGuard(...papeisPermitidos: readonly Papel[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    await auth.garantirSessaoCarregada();

    if (auth.temPapel(...papeisPermitidos)) {
      return true;
    }

    const papel = auth.papel();
    if (papel) {
      return router.createUrlTree([rotaInicialPorPapel(papel)]);
    }

    return router.createUrlTree(['/login']);
  };
}
