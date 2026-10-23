import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { FuncionalidadesService } from '../../services/funcionalidades.service';
import { rotaInicialPorPapel } from '../rota-inicial';

/**
 * Autoriza a rota apenas quando a funcionalidade informada está liberada para o
 * usuário atual (matriz do papel combinada com as flags da escola).
 *
 * É conveniência de UX: a autorização real é revalidada no banco via RLS.
 * O `super_admin` é tratado como acesso total pelo `FuncionalidadesService`.
 */
export function funcionalidadeGuard(chave: string): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const funcionalidades = inject(FuncionalidadesService);
    const router = inject(Router);

    await auth.garantirSessaoCarregada();
    await funcionalidades.load();

    if (funcionalidades.possui(chave)) {
      return true;
    }

    const papel = auth.papel();
    return papel
      ? router.createUrlTree([rotaInicialPorPapel(papel)])
      : router.createUrlTree(['/login']);
  };
}
