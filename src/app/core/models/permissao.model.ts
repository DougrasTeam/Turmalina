import { Papel } from './papel.model';

/** Papéis escolares que participam da matriz de permissões (exclui super_admin). */
export type PapelEscolar = Exclude<Papel, 'super_admin'>;

export const PAPEIS_ESCOLARES: readonly PapelEscolar[] = ['administrador', 'professor', 'aluno'];

/** Entrada da matriz de permissões: o que um papel pode acessar. */
export interface PermissaoPapel {
  id: string;
  papel: PapelEscolar;
  funcionalidade: string;
  habilitado: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

/**
 * Origem da flag de funcionalidade de uma escola.
 * `plano` indica que a funcionalidade veio do plano contratado; `manual` indica
 * uma liberação ou bloqueio explícito do super admin.
 */
export type OrigemFuncionalidadeEscola = 'manual' | 'plano';

/** Feature flag: libera ou bloqueia uma funcionalidade para uma escola. */
export interface FuncionalidadeEscola {
  id: string;
  institutionId: string;
  funcionalidade: string;
  habilitado: boolean;
  origem: OrigemFuncionalidadeEscola;
  criadoEm: string;
  atualizadoEm: string;
}
/**
 * Resolve o conjunto de funcionalidades efetivamente disponíveis.
 *
 * Uma funcionalidade está disponível quando:
 *   1. o papel a permite (`permissoes`), e
 *   2. a escola não a bloqueia explicitamente (`flagsEscola`).
 *
 * Quando não há flag para a escola, vale o padrão do papel. A escola só remove
 * acesso: para conceder além do papel seria necessário alterar a matriz.
 */
export function resolverAcessoFuncionalidades(
  permissoesDoPapel: readonly PermissaoPapel[],
  flagsEscola: readonly FuncionalidadeEscola[],
): Set<string> {
  const bloqueiosDaEscola = new Set(
    flagsEscola
      .filter((flag) => !flag.habilitado)
      .map((flag) => flag.funcionalidade),
  );

  return new Set(
    permissoesDoPapel
      .filter((permissao) => permissao.habilitado)
      .map((permissao) => permissao.funcionalidade)
      .filter((chave) => !bloqueiosDaEscola.has(chave)),
  );
}
