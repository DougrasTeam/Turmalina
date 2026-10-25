import { BaseEntity } from './index';

/** Publicação do mural coletivo (RF-022). */
export type StatusPublicacao = 'publicada' | 'arquivada';

export interface Publicacao extends BaseEntity {
  titulo: string;
  conteudo: string;
  /** URL da foto anexada (Storage, http ou data URL) ou `null` sem imagem. */
  imagemUrl: string | null;
  /** Turma destinatária; `null` indica publicação para toda a instituição. */
  turmaId: string | null;
  /** Disciplina destinatária; `null` indica publicação geral para a turma. */
  disciplinaId: string | null;
  autorId: string;
  autorNome: string;
  /** Data e hora de publicação em ISO 8601. */
  publicadaEm: string;
  /** Data de expiração (yyyy-mm-dd) ou `null` quando a publicação não expira. */
  expiraEm: string | null;
  status: StatusPublicacao;
}

export interface DadosPublicacao {
  titulo: string;
  conteudo: string;
  imagemUrl: string | null;
  turmaId: string | null;
  disciplinaId: string | null;
  publicadaEm: string;
  expiraEm: string | null;
}

export const TITULO_PUBLICACAO_MAX = 120;
export const CONTEUDO_PUBLICACAO_MAX = 4000;

/** Tipos de imagem aceitos no anexo de publicações. */
export const IMAGEM_PUBLICACAO_TIPOS: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/** Tamanho máximo do anexo de imagem (5 MB). */
export const IMAGEM_PUBLICACAO_TAMANHO_MAX = 5 * 1024 * 1024;

/** Valida o arquivo de imagem informado; devolve a mensagem de erro ou `null`. */
export function validarImagemPublicacao(arquivo: { type: string; size: number }): string | null {
  if (!IMAGEM_PUBLICACAO_TIPOS.includes(arquivo.type)) {
    return 'Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF.';
  }
  if (arquivo.size > IMAGEM_PUBLICACAO_TAMANHO_MAX) {
    return 'A imagem deve ter no máximo 5 MB.';
  }
  return null;
}

/** Indica se a URL da imagem pode ser exibida com segurança (data URL ou http). */
export function imagemPublicacaoValida(url: string | null): boolean {
  if (!url) return false;
  return url.startsWith('data:image/') || /^https?:\/\//i.test(url);
}

export interface StatusPublicacaoOpcao {
  value: StatusPublicacao;
  label: string;
  classe: string;
}

export const STATUS_PUBLICACAO: readonly StatusPublicacaoOpcao[] = [
  { value: 'publicada', label: 'Publicada', classe: 'badge-success' },
  { value: 'arquivada', label: 'Arquivada', classe: 'badge-neutral' },
];

export function rotuloStatusPublicacao(status: StatusPublicacao): string {
  return STATUS_PUBLICACAO.find((opcao) => opcao.value === status)?.label ?? status;
}

export function classeStatusPublicacao(status: StatusPublicacao): string {
  return STATUS_PUBLICACAO.find((opcao) => opcao.value === status)?.classe ?? 'badge-neutral';
}

export function validarPublicacao(dados: DadosPublicacao): string[] {
  const erros: string[] = [];
  const titulo = dados.titulo.trim();
  const conteudo = dados.conteudo.trim();

  if (!titulo) erros.push('Informe o título da publicação.');
  if (titulo.length > TITULO_PUBLICACAO_MAX) {
    erros.push(`O título deve ter até ${TITULO_PUBLICACAO_MAX} caracteres.`);
  }
  if (!conteudo) erros.push('Escreva o conteúdo da publicação.');
  if (conteudo.length > CONTEUDO_PUBLICACAO_MAX) {
    erros.push(`O conteúdo deve ter até ${CONTEUDO_PUBLICACAO_MAX} caracteres.`);
  }
  if (dados.disciplinaId && !dados.turmaId) {
    erros.push('Uma publicação disciplinar precisa estar vinculada a uma turma.');
  }
  if (dados.publicadaEm && dados.expiraEm && dados.expiraEm < dados.publicadaEm.slice(0, 10)) {
    erros.push('A data de expiração não pode ser anterior à data de publicação.');
  }

  return erros;
}

/** Indica se a publicação alcança a turma informada (`null` = todas as turmas). */
export function alcancePublicacao(
  publicacao: Publicacao,
  turmaId: string | null,
  disciplinaId?: string | null,
): boolean {
  if (publicacao.turmaId === null) return true;
  if (publicacao.turmaId !== turmaId) return false;
  if (disciplinaId === undefined) return true;
  return !publicacao.disciplinaId || publicacao.disciplinaId === disciplinaId;
}

/** Uma publicação está vigente quando está publicada e dentro da validade. */
export function publicacaoVigente(publicacao: Publicacao, referencia: Date = new Date()): boolean {
  if (publicacao.status !== 'publicada') return false;
  if (!publicacao.expiraEm) return true;
  return publicacao.expiraEm >= referencia.toISOString().slice(0, 10);
}
