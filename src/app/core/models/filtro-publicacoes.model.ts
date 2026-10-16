import { Publicacao } from './publicacao.model';

/**
 * Filtro de visualização do feed do mural (RF-022).
 *
 * - `tudo`: todas as publicações visíveis ao usuário.
 * - `escola`: apenas as publicações institucionais (`turmaId` nulo).
 * - `turma`: apenas as publicações destinadas à turma de `turmaId`.
 */
export type EscopoFiltroPublicacoes = 'tudo' | 'escola' | 'turma';

export interface FiltroPublicacoes {
  escopo: EscopoFiltroPublicacoes;
  /** Turma considerada quando `escopo` é `'turma'`. */
  turmaId: string;
  /** Restringe o feed às publicações criadas pelo próprio usuário. */
  apenasMeus: boolean;
}

export const FILTRO_PUBLICACOES_PADRAO: FiltroPublicacoes = {
  escopo: 'tudo',
  turmaId: '',
  apenasMeus: false,
};

/**
 * Aplica o filtro de visualização a uma lista de publicações já restrita pelas
 * permissões do usuário. `autorId` é usado apenas quando `apenasMeus` é `true`.
 */
export function aplicarFiltroPublicacoes(
  publicacoes: readonly Publicacao[],
  filtro: FiltroPublicacoes,
  autorId: string | null,
): Publicacao[] {
  return publicacoes.filter((publicacao) => {
    if (filtro.escopo === 'escola' && publicacao.turmaId !== null) return false;
    if (filtro.escopo === 'turma' && publicacao.turmaId !== filtro.turmaId) return false;
    if (filtro.apenasMeus && publicacao.autorId !== autorId) return false;
    return true;
  });
}
