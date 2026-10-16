import { BaseEntity } from './index';

/**
 * Comunicado individual (RF-022).
 * - `recado`: mensagem privada visível ao aluno destinatário.
 * - `observacao`: anotação interna, não visível ao aluno.
 */
export type TipoComunicado = 'recado' | 'observacao';

export interface Comunicado extends BaseEntity {
  tipo: TipoComunicado;
  alunoId: string;
  titulo: string;
  conteudo: string;
  autorId: string;
  autorNome: string;
}

export interface DadosComunicado {
  tipo: TipoComunicado;
  alunoId: string;
  titulo: string;
  conteudo: string;
}

export const TITULO_COMUNICADO_MAX = 120;
export const CONTEUDO_COMUNICADO_MAX = 2000;

export interface TipoComunicadoOpcao {
  value: TipoComunicado;
  label: string;
  descricao: string;
  icone: string;
  classe: string;
}

export const TIPOS_COMUNICADO: readonly TipoComunicadoOpcao[] = [
  {
    value: 'recado',
    label: 'Recado ao aluno',
    descricao: 'Mensagem individual que o aluno pode ler.',
    icone: 'mark_email_read',
    classe: 'badge-primary',
  },
  {
    value: 'observacao',
    label: 'Observação privada',
    descricao: 'Anotação interna que o aluno não vê.',
    icone: 'visibility_off',
    classe: 'badge-warning',
  },
];

export function rotuloTipoComunicado(tipo: TipoComunicado): string {
  return TIPOS_COMUNICADO.find((opcao) => opcao.value === tipo)?.label ?? tipo;
}

export function classeTipoComunicado(tipo: TipoComunicado): string {
  return TIPOS_COMUNICADO.find((opcao) => opcao.value === tipo)?.classe ?? 'badge-neutral';
}

export function validarComunicado(dados: DadosComunicado): string[] {
  const erros: string[] = [];
  const titulo = dados.titulo.trim();
  const conteudo = dados.conteudo.trim();

  if (!dados.alunoId) erros.push('Selecione o aluno destinatário.');
  if (!titulo) erros.push('Informe o título do comunicado.');
  if (titulo.length > TITULO_COMUNICADO_MAX) {
    erros.push(`O título deve ter até ${TITULO_COMUNICADO_MAX} caracteres.`);
  }
  if (!conteudo) erros.push('Escreva o conteúdo do comunicado.');
  if (conteudo.length > CONTEUDO_COMUNICADO_MAX) {
    erros.push(`O conteúdo deve ter até ${CONTEUDO_COMUNICADO_MAX} caracteres.`);
  }

  return erros;
}
