import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  ExportacaoService,
  nomeArquivoCsv,
  numeroParaCsv,
  percentualParaCsv,
  serializarCsv,
  slugParaArquivo,
} from './exportacao.service';

describe('serializarCsv', () => {
  it('junta cabeçalho e linhas com ; e quebra de linha CRLF', () => {
    const csv = serializarCsv(
      ['Nome', 'Nota'],
      [
        ['Ana', 8],
        ['Bia', 7],
      ],
    );
    expect(csv).toBe('Nome;Nota\r\nAna;8\r\nBia;7');
  });

  it('usa vírgula como separador decimal quando o número é formatado antes', () => {
    const csv = serializarCsv(['Aluno', 'Média'], [['Ana', '7,5']]);
    expect(csv).toBe('Aluno;Média\r\nAna;7,5');
  });

  it('coloca aspas em campos que contêm o delimitador, aspas ou quebra de linha', () => {
    const csv = serializarCsv(['Obs'], [['Falta; justificada'], ['Diz "oi"'], ['linha1\nlinha2']]);
    expect(csv).toContain('"Falta; justificada"');
    expect(csv).toContain('"Diz ""oi"""');
    expect(csv).toContain('"linha1\nlinha2"');
  });

  it('protege campos que começam com caracteres de fórmula (CSV injection)', () => {
    const csv = serializarCsv(['Nome'], [['=1+1'], ['+55'], ['-5'], ['@x']]);
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'+55");
    expect(csv).toContain("'-5");
    expect(csv).toContain("'@x");
  });

  it('não protege números negativos (valor numérico, não texto)', () => {
    const csv = serializarCsv(['Saldo'], [[-5]]);
    expect(csv).toBe('Saldo\r\n-5');
  });

  it('trata nulos como campo vazio', () => {
    const csv = serializarCsv(['Nome', 'Valor'], [['Ana', null]]);
    expect(csv).toBe('Nome;Valor\r\nAna;');
  });
});

describe('helpers de exportação', () => {
  it('gera slug sem acentos e sem espaços', () => {
    expect(slugParaArquivo('Turma 1º Ano — A')).toBe('turma-1-ano-a');
  });

  it('compõe nome de arquivo com prefixo e partes, ignorando vazios', () => {
    expect(nomeArquivoCsv('boletim', 'Ana Souza', 'Ano Letivo')).toBe(
      'boletim-ana-souza-ano-letivo',
    );
    expect(nomeArquivoCsv('alunos')).toBe('alunos');
    expect(nomeArquivoCsv('turmas', '')).toBe('turmas');
  });

  it('formata número com casas fixas e vazio para nulo', () => {
    expect(numeroParaCsv(8.5, 1)).toBe('8,5');
    expect(numeroParaCsv(8, 2)).toBe('8,00');
    expect(numeroParaCsv(null, 1)).toBe('');
  });

  it('formata percentual com até uma casa e vazio para nulo', () => {
    expect(percentualParaCsv(100)).toBe('100');
    expect(percentualParaCsv(66.67)).toBe('66,7');
    expect(percentualParaCsv(null)).toBe('');
  });
});

describe('ExportacaoService', () => {
  let servico: ExportacaoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    servico = TestBed.inject(ExportacaoService);
  });

  it('gera um blob CSV e dispara o download com extensão .csv', () => {
    let blobGerado: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
      blobGerado = blob;
      return 'blob:fake';
    });
    const revogar = spyOn(URL, 'revokeObjectURL');
    const clique = spyOn(HTMLAnchorElement.prototype, 'click');

    servico.exportarCsv('relatorio-frequencia', ['Nome'], [['Ana']]);

    expect(blobGerado?.type).toContain('text/csv');
    expect(clique).toHaveBeenCalled();
    expect(revogar).toHaveBeenCalledWith('blob:fake');
  });
});
