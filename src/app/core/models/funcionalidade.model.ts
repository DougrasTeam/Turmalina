/**
 * Grupo visual de uma funcionalidade no catálogo e na matriz de permissões.
 * Agrupa itens relacionados para facilitar a organização na UI.
 */
export type GrupoFuncionalidade =
  | 'principal'
  | 'consulta'
  | 'academico'
  | 'gamificacao'
  | 'administracao'
  | 'aluno'
  | 'geral';

/**
 * Funcionalidade do sistema: unidade de controle de acesso.
 *
 * A `chave` é o identificador estável usado no menu, nas rotas e nas feature
 * flags. Nunca deve ser renomeada sem uma migração explícita, pois é referência
 * entre o catálogo, as permissões e as flags das escolas.
 */
export interface Funcionalidade {
  chave: string;
  nome: string;
  descricao: string;
  grupo: GrupoFuncionalidade;
  ordem: number;
  criadoEm: string;
  atualizadoEm: string;
}

export const GRUPOS_FUNCIONALIDADE: readonly { value: GrupoFuncionalidade; label: string }[] = [
  { value: 'principal', label: 'Principal' },
  { value: 'consulta', label: 'Consulta' },
  { value: 'academico', label: 'Acadêmico' },
  { value: 'gamificacao', label: 'Gamificação' },
  { value: 'administracao', label: 'Administração' },
  { value: 'aluno', label: 'Portal do aluno' },
  { value: 'geral', label: 'Geral' },
];

export function rotuloGrupoFuncionalidade(grupo: GrupoFuncionalidade): string {
  return GRUPOS_FUNCIONALIDADE.find((opcao) => opcao.value === grupo)?.label ?? grupo;
}

/**
 * Agrupa um conjunto de funcionalidades por grupo, preservando a ordem definida
 * em cada item. Retorna os grupos na ordem canônica de `GRUPOS_FUNCIONALIDADE`.
 */
export function agruparFuncionalidades(
  funcionalidades: readonly Funcionalidade[],
): { grupo: GrupoFuncionalidade; label: string; itens: Funcionalidade[] }[] {
  return GRUPOS_FUNCIONALIDADE.map((opcao) => ({
    grupo: opcao.value,
    label: opcao.label,
    itens: funcionalidades
      .filter((funcionalidade) => funcionalidade.grupo === opcao.value)
      .sort((a, b) => a.ordem - b.ordem),
  })).filter((grupo) => grupo.itens.length > 0);
}
