import { BaseEntity } from './index';

/**
 * Indicadores, metas e missões (RF-018 e RF-019).
 *
 * Os indicadores são as categorias já usadas pelas ações de XP (por exemplo,
 * `participacao`). Cada evento de XP guarda o indicador da ação no momento do
 * lançamento, permitindo calcular o progresso de metas mesmo se a ação for
 * editada ou removida depois.
 *
 * Metas são objetivos por turma e disciplina, com alvo de ocorrências do indicador e
 * recompensa em XP/moedas. A concessão é manual (validação docente), idempotente
 * por aluno/meta e reversível por estorno auditado.
 *
 * Missões são desafios por turma e disciplina, individuais ou coletivos, com período de
 * validade e recompensa. A conclusão também é validada pela equipe e idempotente
 * por aluno/missão.
 */

export const QUANTIDADE_META_MAXIMA = 1000;
export const RECOMPENSA_XP_MAXIMA = 100;
export const RECOMPENSA_MOEDAS_MAXIMA = 1000;
export const NOME_META_MAXIMO = 60;
export const DESCRICAO_META_MAXIMA = 160;
export const NOME_MISSAO_MAXIMO = 80;
export const DESCRICAO_MISSAO_MAXIMA = 240;
export const INSTRUCOES_MISSAO_MAXIMAS = 500;

export interface Meta extends BaseEntity {
  nome: string;
  descricao: string;
  turmaId: string;
  disciplinaId: string;
  /** Chave do indicador das ações de XP (ex.: `participacao`). */
  indicador: string;
  /** Quantidade de ocorrências do indicador necessária para concluir a meta. */
  quantidade: number;
  recompensaXp: number;
  recompensaMoedas: number;
  ativa: boolean;
}

export interface DadosMeta {
  nome: string;
  descricao: string;
  turmaId: string;
  disciplinaId: string;
  indicador: string;
  quantidade: number;
  recompensaXp: number;
  recompensaMoedas: number;
  ativa: boolean;
}

/** Concessão de uma meta para um aluno; funciona como comprovante imutável. */
export interface MetaAluno extends BaseEntity {
  metaId: string;
  metaNome: string;
  alunoId: string;
  turmaId: string;
  disciplinaId: string;
  indicador: string;
  quantidade: number;
  recompensaXp: number;
  recompensaMoedas: number;
  autorId: string | null;
  autorNome: string;
  idempotencyKey: string;
}

export type StatusMetaAluno = 'em-andamento' | 'disponivel' | 'concedida';

export interface ProgressoMetaAluno {
  meta: Meta;
  alunoId: string;
  quantidadeAtual: number;
  percentual: number;
  status: StatusMetaAluno;
}

export type TipoMissao = 'individual' | 'turma';
export type StatusMissao = 'rascunho' | 'publicada' | 'encerrada' | 'arquivada';
export type SituacaoMissao = StatusMissao | 'expirada';

export interface Missao extends BaseEntity {
  nome: string;
  descricao: string;
  instrucoes: string;
  tipo: TipoMissao;
  turmaId: string;
  disciplinaId: string;
  /** Indicador que recebe uma ocorrência ao concluir a missão (opcional). */
  indicador: string;
  xpRecompensa: number;
  moedasRecompensa: number;
  status: StatusMissao;
  /** Datas no formato `YYYY-MM-DD`; nulas significam sem limite. */
  inicioEm: string | null;
  fimEm: string | null;
}

export interface DadosMissao {
  nome: string;
  descricao: string;
  instrucoes: string;
  tipo: TipoMissao;
  turmaId: string;
  disciplinaId: string;
  indicador: string;
  xpRecompensa: number;
  moedasRecompensa: number;
  status: StatusMissao;
  inicioEm: string | null;
  fimEm: string | null;
}

/** Conclusão de uma missão por um aluno. */
export interface MissaoAluno extends BaseEntity {
  missaoId: string;
  missaoNome: string;
  alunoId: string;
  turmaId: string;
  disciplinaId: string;
  autorId: string | null;
  autorNome: string;
  idempotencyKey: string;
}

export const TIPOS_MISSAO: { valor: TipoMissao; rotulo: string; descricao: string }[] = [
  {
    valor: 'individual',
    rotulo: 'Individual',
    descricao: 'A equipe marca quem concluiu a missão.',
  },
  {
    valor: 'turma',
    rotulo: 'Coletiva',
    descricao: 'Todos os alunos ativos da turma recebem a recompensa juntos.',
  },
];

export const STATUS_MISSAO: { valor: StatusMissao; rotulo: string }[] = [
  { valor: 'rascunho', rotulo: 'Rascunho' },
  { valor: 'publicada', rotulo: 'Publicada' },
  { valor: 'encerrada', rotulo: 'Encerrada' },
  { valor: 'arquivada', rotulo: 'Arquivada' },
];

/** Normaliza a chave do indicador para comparação entre ações e metas. */
export function normalizarIndicador(indicador: string): string {
  return indicador.trim().toLowerCase();
}

/** Transforma uma chave de indicador em texto legível quando necessário. */
export function rotuloIndicador(indicador: string): string {
  const texto = indicador.replace(/[_-]+/g, ' ').trim();
  if (!texto) return 'Sem indicador';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function validarMeta(dados: DadosMeta, existentes: Meta[], idAtual?: string): string[] {
  const erros: string[] = [];
  const nome = dados.nome.trim();
  const indicador = normalizarIndicador(dados.indicador);
  const quantidade = Number(dados.quantidade);
  const recompensaXp = Number(dados.recompensaXp);
  const recompensaMoedas = Number(dados.recompensaMoedas);

  if (!dados.turmaId.trim()) erros.push('Selecione a turma da meta.');
  if (!dados.disciplinaId.trim()) erros.push('Selecione a disciplina da meta.');
  if (!nome) erros.push('Informe o nome da meta.');
  if (nome.length > NOME_META_MAXIMO) {
    erros.push(`O nome da meta deve ter no máximo ${NOME_META_MAXIMO} caracteres.`);
  }
  if (!indicador) erros.push('Escolha o indicador da meta.');
  if (indicador.length > 40) {
    erros.push('O indicador da meta deve ter no máximo 40 caracteres.');
  }
  if (dados.descricao.trim().length > DESCRICAO_META_MAXIMA) {
    erros.push(`A descrição da meta deve ter no máximo ${DESCRICAO_META_MAXIMA} caracteres.`);
  }

  if (!Number.isInteger(quantidade) || quantidade < 1) {
    erros.push('A quantidade necessária deve ser um número inteiro maior que zero.');
  } else if (quantidade > QUANTIDADE_META_MAXIMA) {
    erros.push(`A quantidade necessária não pode ultrapassar ${QUANTIDADE_META_MAXIMA}.`);
  }

  if (!Number.isInteger(recompensaXp) || recompensaXp < 0) {
    erros.push('A recompensa em XP deve ser um número inteiro maior ou igual a zero.');
  } else if (recompensaXp > RECOMPENSA_XP_MAXIMA) {
    erros.push(`A recompensa em XP não pode ultrapassar ${RECOMPENSA_XP_MAXIMA}.`);
  }

  if (!Number.isInteger(recompensaMoedas) || recompensaMoedas < 0) {
    erros.push('A recompensa em moedas deve ser um número inteiro maior ou igual a zero.');
  } else if (recompensaMoedas > RECOMPENSA_MOEDAS_MAXIMA) {
    erros.push(`A recompensa em moedas não pode ultrapassar ${RECOMPENSA_MOEDAS_MAXIMA}.`);
  }

  if (recompensaXp === 0 && recompensaMoedas === 0) {
    erros.push('Defina ao menos uma recompensa em XP ou moedas.');
  }

  const nomeDuplicado = existentes.some(
    (meta) =>
      meta.id !== idAtual &&
      meta.turmaId === dados.turmaId &&
      meta.disciplinaId === dados.disciplinaId &&
      meta.nome.trim().toLowerCase() === nome.toLowerCase(),
  );
  if (nome && nomeDuplicado) {
    erros.push('Já existe uma meta com este nome nesta turma e disciplina.');
  }

  return erros;
}

export function validarMissao(
  dados: DadosMissao,
  existentes: Missao[],
  idAtual?: string,
): string[] {
  const erros: string[] = [];
  const nome = dados.nome.trim();
  const xpRecompensa = Number(dados.xpRecompensa);
  const moedasRecompensa = Number(dados.moedasRecompensa);

  if (!dados.turmaId.trim()) erros.push('Selecione a turma da missão.');
  if (!dados.disciplinaId.trim()) erros.push('Selecione a disciplina da missão.');
  if (!nome) erros.push('Informe o nome da missão.');
  if (nome.length > NOME_MISSAO_MAXIMO) {
    erros.push(`O nome da missão deve ter no máximo ${NOME_MISSAO_MAXIMO} caracteres.`);
  }
  if (dados.descricao.trim().length > DESCRICAO_MISSAO_MAXIMA) {
    erros.push(`A descrição da missão deve ter no máximo ${DESCRICAO_MISSAO_MAXIMA} caracteres.`);
  }
  if (dados.instrucoes.trim().length > INSTRUCOES_MISSAO_MAXIMAS) {
    erros.push(`As instruções devem ter no máximo ${INSTRUCOES_MISSAO_MAXIMAS} caracteres.`);
  }
  if (dados.tipo !== 'individual' && dados.tipo !== 'turma') {
    erros.push('Escolha o tipo da missão.');
  }
  if (!STATUS_MISSAO.some((status) => status.valor === dados.status)) {
    erros.push('Escolha um status válido para a missão.');
  }

  if (!Number.isInteger(xpRecompensa) || xpRecompensa < 0) {
    erros.push('A recompensa em XP deve ser um número inteiro maior ou igual a zero.');
  } else if (xpRecompensa > RECOMPENSA_XP_MAXIMA) {
    erros.push(`A recompensa em XP não pode ultrapassar ${RECOMPENSA_XP_MAXIMA}.`);
  }

  if (!Number.isInteger(moedasRecompensa) || moedasRecompensa < 0) {
    erros.push('A recompensa em moedas deve ser um número inteiro maior ou igual a zero.');
  } else if (moedasRecompensa > RECOMPENSA_MOEDAS_MAXIMA) {
    erros.push(`A recompensa em moedas não pode ultrapassar ${RECOMPENSA_MOEDAS_MAXIMA}.`);
  }

  if (xpRecompensa === 0 && moedasRecompensa === 0) {
    erros.push('Defina ao menos uma recompensa em XP ou moedas.');
  }

  if (dados.inicioEm && dados.fimEm && dados.fimEm < dados.inicioEm) {
    erros.push('A data de fim não pode ser anterior à data de início.');
  }

  const nomeDuplicado = existentes.some(
    (missao) =>
      missao.id !== idAtual &&
      missao.turmaId === dados.turmaId &&
      missao.disciplinaId === dados.disciplinaId &&
      missao.nome.trim().toLowerCase() === nome.toLowerCase(),
  );
  if (nome && nomeDuplicado) {
    erros.push('Já existe uma missão com este nome nesta turma e disciplina.');
  }

  return erros;
}

/** Percentual de progresso de uma meta, limitado entre 0 e 100. */
export function percentualMeta(quantidadeAtual: number, quantidadeNecessaria: number): number {
  if (quantidadeNecessaria <= 0) return 0;
  const progresso = Math.round((Math.max(0, quantidadeAtual) / quantidadeNecessaria) * 100);
  return Math.min(100, progresso);
}

export function statusMetaAluno(
  quantidadeAtual: number,
  quantidadeNecessaria: number,
  concedida: boolean,
): StatusMetaAluno {
  if (concedida) return 'concedida';
  if (quantidadeAtual >= quantidadeNecessaria) return 'disponivel';
  return 'em-andamento';
}

export function rotuloStatusMeta(status: StatusMetaAluno): string {
  if (status === 'concedida') return 'Concedida';
  if (status === 'disponivel') return 'Disponível para concessão';
  return 'Em andamento';
}

export function classeStatusMeta(status: StatusMetaAluno): string {
  if (status === 'concedida') return 'badge-success';
  if (status === 'disponivel') return 'badge-warning';
  return 'badge-info';
}

export function dataIsoHoje(agora: Date = new Date()): string {
  const ano = agora.getFullYear();
  const mes = `${agora.getMonth() + 1}`.padStart(2, '0');
  const dia = `${agora.getDate()}`.padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Situação exibida da missão. Uma missão publicada cujo fim já passou é
 * apresentada como expirada, sem alterar o status persistido.
 */
export function situacaoMissao(missao: Missao, hoje: string = dataIsoHoje()): SituacaoMissao {
  if (missao.status !== 'publicada') return missao.status;
  if (missao.inicioEm && hoje < missao.inicioEm) return 'rascunho';
  if (missao.fimEm && hoje > missao.fimEm) return 'expirada';
  return 'publicada';
}

export function rotuloSituacaoMissao(situacao: SituacaoMissao): string {
  if (situacao === 'expirada') return 'Expirada';
  if (situacao === 'rascunho') return 'Rascunho';
  if (situacao === 'encerrada') return 'Encerrada';
  if (situacao === 'arquivada') return 'Arquivada';
  return 'Publicada';
}

export function classeSituacaoMissao(situacao: SituacaoMissao): string {
  if (situacao === 'publicada') return 'badge-success';
  if (situacao === 'expirada') return 'badge-warning';
  if (situacao === 'encerrada' || situacao === 'arquivada') return 'badge-neutral';
  return 'badge-info';
}

export function missaoVisivelParaAluno(missao: Missao, hoje: string = dataIsoHoje()): boolean {
  return situacaoMissao(missao, hoje) === 'publicada';
}

export function missaoPodeReceberConclusao(missao: Missao, hoje: string = dataIsoHoje()): boolean {
  return situacaoMissao(missao, hoje) === 'publicada';
}
