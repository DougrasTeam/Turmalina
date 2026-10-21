import { BaseEntity } from './index';

/**
 * Conquistas e álbum (RF-020).
 *
 * Uma conquista é um reconhecimento configurável (nome, ícone, descrição e
 * bônus de XP). O desbloqueio é registrado por aluno e é idempotente: o mesmo
 * aluno não desbloqueia a mesma conquista duas vezes. O álbum exibe apenas o
 * progresso pessoal do aluno, sem revelar dados de colegas.
 */

/** Maior bônus de XP aceito ao desbloquear uma conquista. */
export const BONUS_XP_CONQUISTA_MAXIMO = 100;

export interface Conquista extends BaseEntity {
  nome: string;
  /** Emoji exibido no álbum (ex.: 🤝). */
  emoji: string;
  descricao: string;
  bonusXp: number;
  /** Quando falsa, a conquista não é oferecida para desbloqueio. */
  ativa: boolean;
}

export interface DadosConquista {
  nome: string;
  emoji: string;
  descricao: string;
  bonusXp: number;
  ativa: boolean;
}

/** Registro de que um aluno desbloqueou uma conquista. */
export interface ConquistaAluno extends BaseEntity {
  alunoId: string;
  conquistaId: string;
  conquistaNome: string;
  origem: string;
  autorId: string | null;
  autorNome: string;
  idempotencyKey: string;
  estornoDe: string | null;
}

export const EMOJIS_CONQUISTA: string[] = [
  '🤝',
  '🔍',
  '⏰',
  '🎨',
  '👑',
  '💪',
  '🌟',
  '📚',
  '🏅',
  '🚀',
];

export const CONQUISTAS_PADRAO: DadosConquista[] = [
  { nome: 'Ajudante', emoji: '🤝', descricao: 'Ajudou colegas sem ser pedido.', bonusXp: 10, ativa: true },
  { nome: 'Curioso', emoji: '🔍', descricao: 'Fez uma pergunta que fez a turma pensar.', bonusXp: 10, ativa: true },
  { nome: 'Pontual', emoji: '⏰', descricao: 'Chegou e entregou no prazo.', bonusXp: 10, ativa: true },
  { nome: 'Criativo', emoji: '🎨', descricao: 'Resolveu de um jeito diferente.', bonusXp: 10, ativa: true },
  { nome: 'Líder', emoji: '👑', descricao: 'Organizou o grupo.', bonusXp: 15, ativa: true },
  { nome: 'Persistente', emoji: '💪', descricao: 'Não desistiu até conseguir.', bonusXp: 15, ativa: true },
];

export function validarConquista(
  dados: DadosConquista,
  existentes: Conquista[],
  idAtual?: string,
): string[] {
  const erros: string[] = [];
  const nome = dados.nome.trim();
  const bonusXp = Number(dados.bonusXp);

  if (!nome) erros.push('Informe o nome da conquista.');
  if (nome.length > 60) erros.push('O nome da conquista deve ter no máximo 60 caracteres.');
  if (!dados.emoji.trim()) erros.push('Escolha um emoji para a conquista.');
  if (dados.descricao.trim().length > 160) {
    erros.push('A descrição da conquista deve ter no máximo 160 caracteres.');
  }
  if (!Number.isInteger(bonusXp)) {
    erros.push('O bônus de XP deve ser um número inteiro.');
  } else if (bonusXp < 0) {
    erros.push('O bônus de XP não pode ser negativo.');
  } else if (bonusXp > BONUS_XP_CONQUISTA_MAXIMO) {
    erros.push(`O bônus de XP não pode ultrapassar ${BONUS_XP_CONQUISTA_MAXIMO}.`);
  }

  const nomeDuplicado = existentes.some(
    (conquista) =>
      conquista.id !== idAtual &&
      conquista.nome.trim().toLowerCase() === nome.toLowerCase(),
  );
  if (nome && nomeDuplicado) erros.push('Já existe uma conquista com este nome.');

  return erros;
}

/** Percentual (0 a 100) de completude do álbum do aluno. */
export function percentualAlbum(quantidadeGanha: number, totalConquistas: number): number {
  if (totalConquistas <= 0) return 0;
  const limitado = Math.min(Math.max(0, quantidadeGanha), totalConquistas);
  return Math.round((limitado / totalConquistas) * 100);
}
