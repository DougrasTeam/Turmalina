import { BaseEntity } from './index';

/**
 * Equipes de gamificação (RF-017).
 *
 * Uma equipe é criada dentro de um contexto de turma e período letivo. Os alunos
 * são associados às equipes por um vínculo com vigência: ao transferir um aluno,
 * o vínculo anterior é encerrado e um novo é aberto, preservando o histórico.
 * O placar soma o XP dos membros conforme o critério configurado.
 *
 * A cor é apenas um reforço visual — o nome e o emoji sempre identificam a
 * equipe, garantindo acessibilidade sem depender só da cor.
 */

/** Tamanho máximo do nome da equipe. */
export const NOME_EQUIPE_MAXIMO = 40;

/** Máximo de equipes sugerido por turma/período. */
export const MAXIMO_EQUIPES_POR_TURMA = 20;

/** Cores sugeridas para as equipes (hexadecimais com bom contraste sobre branco). */
export const CORES_EQUIPE: string[] = [
  '#2563EB',
  '#16A34A',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#0891B2',
  '#DB2777',
  '#65A30D',
];

export const EMOJIS_EQUIPE: string[] = [
  '🦁',
  '🐯',
  '🦅',
  '🐬',
  '🐺',
  '🦊',
  '🐲',
  '🦄',
  '🐝',
  '🦉',
];

/** Critérios possíveis para o cálculo do placar das equipes. */
export const CRITERIOS_PLACAR = ['xp_acumulado', 'xp_periodo'] as const;
export type CriterioPlacar = (typeof CRITERIOS_PLACAR)[number];

export const ROTULOS_CRITERIO_PLACAR: Record<CriterioPlacar, string> = {
  xp_acumulado: 'XP acumulado (todo o histórico)',
  xp_periodo: 'XP do período letivo ativo',
};

export function rotuloCriterioPlacar(criterio: CriterioPlacar): string {
  return ROTULOS_CRITERIO_PLACAR[criterio] ?? criterio;
}

export interface Equipe extends BaseEntity {
  nome: string;
  /** Emoji da equipe (ex.: 🦁). */
  emoji: string;
  /** Cor em hexadecimal usada como reforço visual. */
  cor: string;
  ativa: boolean;
  /** Contexto da equipe: turma e período letivo. */
  turmaId: string;
  periodoLetivoId: string | null;
}

export interface DadosEquipe {
  nome: string;
  emoji: string;
  cor: string;
  ativa: boolean;
  turmaId: string;
  periodoLetivoId: string | null;
}

/**
 * Vínculo de um aluno com uma equipe, com vigência.
 *
 * Quando `ativa` é falsa, o vínculo foi encerrado (transferência) e serve apenas
 * como histórico — o XP registrado na vigência permanece contabilizado.
 */
export interface EquipeMembro extends BaseEntity {
  equipeId: string;
  equipeNome: string;
  alunoId: string;
  alunoNome: string;
  turmaId: string;
  periodoLetivoId: string | null;
  ativa: boolean;
  inicioEm: string;
  fimEm: string | null;
  /** Autor da associação/transferência. */
  autorId: string | null;
  autorNome: string;
}

export interface DadosEquipeMembro {
  equipeId: string;
  alunoId: string;
}

/** Linha do placar de uma equipe. */
export interface LinhaPlacarEquipe {
  equipe: Equipe;
  quantidadeMembros: number;
  xpTotal: number;
  xpMedio: number;
  /** Posição no placar (1 = primeiro lugar). */
  posicao: number;
}

export function validarEquipe(
  dados: DadosEquipe,
  existentes: Equipe[],
  idAtual?: string,
): string[] {
  const erros: string[] = [];
  const nome = dados.nome.trim();

  if (!nome) erros.push('Informe o nome da equipe.');
  if (nome.length > NOME_EQUIPE_MAXIMO) {
    erros.push(`O nome da equipe deve ter no máximo ${NOME_EQUIPE_MAXIMO} caracteres.`);
  }
  if (!dados.emoji.trim()) erros.push('Escolha um emoji para a equipe.');
  if (!dados.turmaId.trim()) erros.push('Selecione a turma da equipe.');
  if (!/^#[0-9a-fA-F]{6}$/.test(dados.cor.trim())) {
    erros.push('Escolha uma cor válida para a equipe.');
  }

  const nomeDuplicado = existentes.some(
    (equipe) =>
      equipe.id !== idAtual &&
      equipe.turmaId === dados.turmaId &&
      equipe.periodoLetivoId === dados.periodoLetivoId &&
      equipe.nome.trim().toLowerCase() === nome.toLowerCase(),
  );
  if (nome && nomeDuplicado) {
    erros.push('Já existe uma equipe com este nome nesta turma/período.');
  }

  return erros;
}

/** Indica se o vínculo estava ativo na data de referência. */
export function vinculoVigenteNaData(membro: EquipeMembro, referencia: Date): boolean {
  const inicio = new Date(membro.inicioEm).getTime();
  const fim = membro.fimEm ? new Date(membro.fimEm).getTime() : Number.POSITIVE_INFINITY;
  const instante = referencia.getTime();
  return inicio <= instante && instante < fim;
}

/**
 * Seleciona os vínculos de uma equipe que contam para o placar.
 *
 * No critério `xp_acumulado`, todos os vínculos (inclusive históricos) entram no
 * total. No critério `xp_periodo`, apenas os vínculos do período informado.
 */
export function membrosParaPlacar(
  membros: EquipeMembro[],
  equipeId: string,
  criterio: CriterioPlacar,
  periodoLetivoId: string | null,
): EquipeMembro[] {
  return membros.filter((membro) => {
    if (membro.equipeId !== equipeId) return false;
    if (criterio === 'xp_periodo') {
      return membro.periodoLetivoId !== null && membro.periodoLetivoId === periodoLetivoId;
    }
    return true;
  });
}

/** Calcula o total e a média de XP de um conjunto de vínculos ativos. */
export function pontuarEquipe(
  membros: EquipeMembro[],
  xpPorAluno: Map<string, number>,
): { xpTotal: number; quantidadeMembros: number; xpMedio: number } {
  const alunosUnicos = new Set(membros.map((membro) => membro.alunoId));
  let xpTotal = 0;
  for (const alunoId of alunosUnicos) {
    xpTotal += xpPorAluno.get(alunoId) ?? 0;
  }
  const quantidadeMembros = alunosUnicos.size;
  const xpMedio = quantidadeMembros ? Math.round(xpTotal / quantidadeMembros) : 0;
  return { xpTotal, quantidadeMembros, xpMedio };
}
