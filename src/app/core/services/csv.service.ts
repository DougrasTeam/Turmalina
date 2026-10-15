import { Injectable } from '@angular/core';

export interface ResultadoCsv {
  cabecalho: string[];
  linhas: string[][];
  delimitador: string;
}

/**
 * Parser de CSV/TSV simples com suporte a aspas, quebra de linha dentro de
 * campos e detec\u00e7\u00e3o autom\u00e1tica de delimitador (, ; \t |).
 */
@Injectable({ providedIn: 'root' })
export class CsvService {
  parse(texto: string): ResultadoCsv {
    const limpo = texto.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
    if (!limpo) return { cabecalho: [], linhas: [], delimitador: ',' };

    const delimitador = this.detectarDelimitador(limpo);
    const matriz = this.dividir(limpo, delimitador);
    const [cabecalho = [], ...linhas] = matriz;

    return {
      cabecalho: cabecalho.map((c) => c.trim()),
      linhas: linhas.filter((linha) => linha.some((c) => c.trim() !== '')),
      delimitador,
    };
  }

  private detectarDelimitador(texto: string): string {
    const candidatos = [',', ';', '\t', '|'];
    const primeiraLinha = texto.split('\n')[0] ?? '';
    let melhor = ',';
    let melhorContagem = -1;
    for (const cand of candidatos) {
      const contagem = this.dividir(primeiraLinha, cand)[0].length;
      if (contagem > melhorContagem) {
        melhorContagem = contagem;
        melhor = cand;
      }
    }
    return melhor;
  }

  private dividir(texto: string, delimitador: string): string[][] {
    const linhas: string[][] = [];
    let campo = '';
    let linha: string[] = [];
    let dentroDeAspas = false;

    for (let i = 0; i < texto.length; i++) {
      const char = texto[i];

      if (dentroDeAspas) {
        if (char === '"') {
          if (texto[i + 1] === '"') {
            campo += '"';
            i++;
          } else {
            dentroDeAspas = false;
          }
        } else {
          campo += char;
        }
        continue;
      }

      if (char === '"') {
        dentroDeAspas = true;
      } else if (char === delimitador) {
        linha.push(campo);
        campo = '';
      } else if (char === '\n') {
        linha.push(campo);
        linhas.push(linha);
        linha = [];
        campo = '';
      } else {
        campo += char;
      }
    }

    linha.push(campo);
    linhas.push(linha);
    return linhas;
  }
}
