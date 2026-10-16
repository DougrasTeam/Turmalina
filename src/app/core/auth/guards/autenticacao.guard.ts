import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

/**
 * Bloqueia o acesso quando não há sessão válida.
 * Aguarda a restauração da sessão antes de decidir, para não redirecionar
 * um usuário autenticado indevidamente ao recarregar a página.
 *
 * Também força o primeiro acesso: enquanto o usuário precisar trocar a senha,
 * qualquer rota protegida o leva para `/primeiro-acesso`.
 */
export const autenticacaoGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.garantirSessaoCarregada();

  if (!auth.autenticado()) {
    return router.createUrlTree(['/login']);
  }

  if (auth.precisaTrocarSenha() && state.url !== '/primeiro-acesso') {
    return router.createUrlTree(['/primeiro-acesso']);
  }

  return true;
};
