import { BaseEntity } from './index';

/** Faixa de XP necessária para avançar um nível. */
export const XP_POR_NIVEL = 100;

/** Maior valor positivo aceito em uma ação de gamificação. */
export const VALOR_XP_MAXIMO = 100;

/** Maior magnitude aceita em uma ação negativa (desconto de XP). */
export const VALOR_XP_NEGATIVO_MAXIMO = 50;

/** Contexto obrigatório das ações, eventos e recompensas de gamificação. */
export interface ContextoGamificacao {
  turmaId: string;
  disciplinaId: string;
}

export interface AcaoGamificacao extends BaseEntity {
  nome: string;
  icone: string;
  valorXp: number;
  indicador: string;
  ativa: boolean;
  turmaId: string;
  disciplinaId: string;
}

export interface DadosAcaoGamificacao {
  nome: string;
  icone: string;
  valorXp: number;
  indicador: string;
  ativa: boolean;
  turmaId: string;
  disciplinaId: string;
}

/** Modelo de ação padrão sem contexto; o contexto é aplicado ao criar. */
export type DadosAcaoPadrao = Omit<DadosAcaoGamificacao, 'turmaId' | 'disciplinaId'>;

export interface EventoXp extends BaseEntity {
  alunoId: string;
  turmaId: string | null;
  disciplinaId: string | null;
  acaoId: string | null;
  acaoNome: string;
  /** Indicador da ação no momento do lançamento; usado pelas metas. */
  indicador: string;
  deltaXp: number;
  origem: string;
  autorId: string;
  autorNome: string;
  idempotencyKey: string;
  estornoDe: string | null;
}

export interface DadosEventoXp {
  alunoId: string;
  turmaId: string | null;
  disciplinaId: string | null;
  acaoId: string | null;
  acaoNome: string;
  indicador: string;
  deltaXp: number;
  origem: string;
  autorId: string;
  autorNome: string;
  idempotencyKey: string;
  estornoDe: string | null;
}

/** Linha pronta para exibição no histórico de XP. */
export interface LinhaHistoricoXp {
  evento: EventoXp;
  alunoNome: string;
  estornado: boolean;
}

export interface OpcaoIconeAcao {
  valor: string;
  rotulo: string;
}

export const ICONES_ACAO: OpcaoIconeAcao[] = [
  { valor: 'star', rotulo: 'Estrela' },
  { valor: 'emoji_events', rotulo: 'Troféu' },
  { valor: 'workspace_premium', rotulo: 'Medalha' },
  { valor: 'volunteer_activism', rotulo: 'Colaboração' },
  { valor: 'bolt', rotulo: 'Energia' },
  { valor: 'groups', rotulo: 'Equipe' },
  { valor: 'check_circle', rotulo: 'Concluído' },
  { valor: 'psychiatry', rotulo: 'Esforço' },
];

export const ACOES_GAMIFICACAO_PADRAO: DadosAcaoPadrao[] = [
  {
    nome: 'Participação em aula',
    icone: 'star',
    valorXp: 10,
    indicador: 'participacao',
    ativa: true,
  },
  {
    nome: 'Colaboração com a equipe',
    icone: 'groups',
    valorXp: 15,
    indicador: 'colaboracao',
    ativa: true,
  },
  {
    nome: 'Organização e pontualidade',
    icone: 'check_circle',
    valorXp: 10,
    indicador: 'organizacao',
    ativa: true,
  },
  {
    nome: 'Ajuda a um colega',
    icone: 'volunteer_activism',
    valorXp: 20,
    indicador: 'solidariedade',
    ativa: true,
  },
  {
    nome: 'Esforço e superação',
    icone: 'bolt',
    valorXp: 15,
    indicador: 'esforco',
    ativa: true,
  },
];

export function validarAcaoGamificacao(
  dados: DadosAcaoGamificacao,
  existentes: AcaoGamificacao[],
  idAtual?: string,
): string[] {
  const erros: string[] = [];
  const nome = dados.nome.trim();
  const indicador = dados.indicador.trim();
  const valorXp = Number(dados.valorXp);

  if (!dados.turmaId.trim()) erros.push('Selecione a turma da ação.');
  if (!dados.disciplinaId.trim()) erros.push('Selecione a disciplina da ação.');
  if (!nome) erros.push('Informe o nome da ação.');
  if (nome.length > 60) erros.push('O nome da ação deve ter no máximo 60 caracteres.');
  if (!indicador) erros.push('Informe o indicador associado à ação.');
  if (!dados.icone.trim()) erros.push('Escolha um ícone para a ação.');

  if (!Number.isInteger(valorXp)) {
    erros.push('O valor de XP deve ser um número inteiro.');
  } else if (valorXp === 0) {
    erros.push('O valor de XP não pode ser zero.');
  } else if (valorXp > VALOR_XP_MAXIMO) {
    erros.push(`O valor de XP não pode ultrapassar ${VALOR_XP_MAXIMO}.`);
  } else if (valorXp < -VALOR_XP_NEGATIVO_MAXIMO) {
    erros.push(
      `A pontuação negativa não pode ser menor que ${VALOR_XP_NEGATIVO_MAXIMO} em módulo.`,
    );
  }

  const nomeDuplicado = existentes.some(
    (acao) =>
      acao.id !== idAtual &&
      acao.turmaId === dados.turmaId &&
      acao.disciplinaId === dados.disciplinaId &&
      acao.nome.trim().toLowerCase() === nome.toLowerCase(),
  );
  if (nome && nomeDuplicado) {
    erros.push('Já existe uma ação com este nome nesta turma e disciplina.');
  }

  return erros;
}

/** Nível calculado a partir do XP acumulado; todo aluno começa no nível 1. */
export function nivelPorXp(xp: number): number {
  const xpNormalizado = Math.max(0, Math.trunc(xp));
  return Math.floor(xpNormalizado / XP_POR_NIVEL) + 1;
}

/** XP acumulado dentro do nível atual. */
export function xpNoNivelAtual(xp: number): number {
  const xpNormalizado = Math.max(0, Math.trunc(xp));
  return xpNormalizado % XP_POR_NIVEL;
}

/** Quantos pontos faltam para o próximo nível. */
export function xpParaProximoNivel(xp: number): number {
  return XP_POR_NIVEL - xpNoNivelAtual(xp);
}

/** Percentual (0 a 100) de progresso dentro do nível atual. */
export function progressoNivel(xp: number): number {
  return Math.round((xpNoNivelAtual(xp) / XP_POR_NIVEL) * 100);
}

export function formatarDeltaXp(deltaXp: number): string {
  return deltaXp > 0 ? `+${deltaXp}` : `${deltaXp}`;
}

/** Chave usada para impedir lançamentos duplicados por clique/reenvio. */
export function criarChaveIdempotencia(): string {
  const gerador = globalThis.crypto;
  if (gerador?.randomUUID) return gerador.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
