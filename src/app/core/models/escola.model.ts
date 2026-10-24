import { StatusInstituicao } from './instituicao.model';

/**
 * Visão de escola usada pelo painel do SaaS: a instituição com os dados do
 * plano e contagens resumidas. É um modelo de leitura, não persistido.
 */
export interface EscolaResumo {
  id: string;
  nome: string;
  /** Slug público usado no link de acesso `/e/:slug`. */
  slug: string | null;
  status: StatusInstituicao;
  fusoHorario: string;
  planoId: string | null;
  criadoEm: string;
}

export function escolaEstaAtiva(escola: EscolaResumo): boolean {
  return escola.status === 'ativa';
}

export function contarEscolasAtivas(escolas: readonly EscolaResumo[]): number {
  return escolas.filter(escolaEstaAtiva).length;
}
