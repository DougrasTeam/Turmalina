import { Injectable } from '@angular/core';

export const DELIMITADOR_CSV = ';';

/**
 * Caracteres que, no início de um campo, podem ser interpretados como fórmula
 * por planilhas (CSV injection). Campos assim recebem um apóstrofo de proteção.
 */
const CARACTERES_INICIAIS_PERIGOSOS = ['=', '+', '-', '@', '\t', '\r'];

function formatarCampoCsv(valor: string | number | null | undefined, delimitador: string): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'number') return String(valor);

  const comProtecao = CARACTERES_INICIAIS_PERIGOSOS.includes(valor.charAt(0)) ? `'${valor}` : valor;
  const precisaAspas =
    comProtecao.includes(delimitador) ||
    comProtecao.includes('"') ||
    comProtecao.includes('\n') ||
    comProtecao.includes('\r');

  return precisaAspas ? `"${comProtecao.replace(/"/g, '""')}"` : comProtecao;
}

/**
 * Serializa cabeçalho e linhas em CSV, aplicando escaping e proteção contra
 * injeção de fórmulas (RF-014 / RF-025).
 */
export function serializarCsv(
  cabecalhos: readonly string[],
  linhas: readonly (string | number | null)[][],
  delimitador: string = DELIMITADOR_CSV,
): string {
  const todasAsLinhas: (string | number | null)[][] = [[...cabecalhos], ...linhas];
  return todasAsLinhas
    .map((linha) => linha.map((valor) => formatarCampoCsv(valor, delimitador)).join(delimitador))
    .join('\r\n');
}

/**
 * Exportação de dados tabulares em CSV (RF-014 / RF-025).
 * Gera o arquivo no navegador com BOM UTF-8 (acentos corretos no Excel) e
 * proteção contra CSV injection.
 */
@Injectable({ providedIn: 'root' })
export class ExportacaoService {
  exportarCsv(
    nomeArquivo: string,
    cabecalhos: readonly string[],
    linhas: readonly (string | number | null)[][],
  ): void {
    const conteudo = `\uFEFF${serializarCsv(cabecalhos, linhas)}`;
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }
}
