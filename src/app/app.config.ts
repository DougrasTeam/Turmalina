import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { AuthRepository } from './core/auth/data-access/auth.repository';
import { SupabaseAuthRepository } from './core/auth/data-access/supabase-auth.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    // Autenticação via Supabase Auth (login por e-mail/senha; OAuth pronto).
    // Para voltar ao mock local, troque por MockAuthRepository.
    { provide: AuthRepository, useClass: SupabaseAuthRepository },
  ],
};
