import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // App de gestão com dados locais: renderiza no cliente (CSR).
    path: '**',
    renderMode: RenderMode.Client,
  },
];
