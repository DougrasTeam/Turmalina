import { BaseEntity } from './index';

/** Publicação do mural coletivo (RF-022). */
export type StatusPublicacao = 'publicada' | 'arquivada';

export interface Publicacao extends BaseEntity {
  titulo: string;
  conteudo: string;
  /** Turma destinatária; `null` indica publicação para toda a instituição. */
  turmaId: string | null;
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
  turmaId: string | null;
  publicadaEm: string;
  expiraEm: string | null;
}

export const TITULO_PUBLICACAO_MAX = 120;
export const CONTEUDO_PUBLICACAO_MAX = 4000;

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
  if (dados.publicadaEm && dados.expiraEm && dados.expiraEm < dados.publicadaEm.slice(0, 10)) {
    erros.push('A data de expiração não pode ser anterior à data de publicação.');
  }

  return erros;
}

/** Indica se a publicação alcança a turma informada (`null` = todas as turmas). */
export function alcancePublicacao(publicacao: Publicacao, turmaId: string | null): boolean {
  if (publicacao.turmaId === null) return true;
  return publicacao.turmaId === turmaId;
}

/** Uma publicação está vigente quando está publicada e dentro da validade. */
export function publicacaoVigente(publicacao: Publicacao, referencia: Date = new Date()): boolean {
  if (publicacao.status !== 'publicada') return false;
  if (!publicacao.expiraEm) return true;
  return publicacao.expiraEm >= referencia.toISOString().slice(0, 10);
}
