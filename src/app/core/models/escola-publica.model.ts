import { StatusInstituicao } from './instituicao.model';

/**
 * Escola resolvida por um link público (`/e/:slug`), antes do login.
 * Expõe apenas dados não sensíveis usados para identificar a escola.
 */
export interface EscolaPublica {
  institutionId: string;
  nome: string;
  slug: string;
  status: StatusInstituicao;
}
