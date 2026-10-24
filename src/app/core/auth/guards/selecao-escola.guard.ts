import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { rotaInicialPorPapel } from '../rota-inicial';

/**
 * Protege `/selecionar-escola`.
 *
 * Permite a escolha apenas para usuários autenticados que realmente precisam
 * escolher (mais de uma escola e nenhuma ativa). Quem já tem escola selecionada
 * volta para a rota inicial do seu papel.
 */
export const selecaoEscolaGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.garantirSessaoCarregada();

  if (!auth.autenticado()) {
    return router.createUrlTree(['/login']);
  }

  if (auth.precisaSelecionarEscola()) {
    return true;
  }

  const papel = auth.papel();
  return papel
    ? router.createUrlTree([rotaInicialPorPapel(papel)])
    : router.createUrlTree(['/login']);
};
