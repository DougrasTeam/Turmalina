import { BaseEntity } from './index';

export interface Disciplina extends BaseEntity {
  nome: string;
  codigo: string;
  cargaHoraria: number;
  cor: string;
  ativa: boolean;
}

export interface DadosDisciplina {
  nome: string;
  codigo: string;
  cargaHoraria: number;
  cor: string;
  ativa: boolean;
}

export const CORES_DISCIPLINA: string[] = [
  '#2563eb',
  '#16a34a',
  '#db2777',
  '#f59e0b',
  '#7c3aed',
  '#0891b2',
  '#dc2626',
  '#65a30d',
];

const PALAVRAS_IGNORADAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

export function gerarCodigoDisciplina(nome: string, existentes: string[] = []): string {
  const palavras = nome
    .trim()
    .split(/\s+/)
    .filter((palavra) => palavra && !PALAVRAS_IGNORADAS.has(palavra.toLowerCase()));

  let base = '';
  if (palavras.length >= 2) {
    base = palavras.map((palavra) => palavra[0]).join('');
  } else if (palavras.length === 1) {
    base = palavras[0].slice(0, 3);
  }

  const limpo = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 4);

  const codigoBase = limpo || 'DIS';
  const usados = new Set(existentes.map((codigo) => codigo.toUpperCase()));
  if (!usados.has(codigoBase)) return codigoBase;

  let sufixo = 2;
  while (usados.has(`${codigoBase}${sufixo}`)) sufixo++;
  return `${codigoBase}${sufixo}`;
}

export function validarDisciplina(
  dados: DadosDisciplina,
  existentes: Disciplina[],
  idAtual?: string,
): string[] {
  const erros: string[] = [];
  const nome = dados.nome.trim();

  if (!nome) erros.push('Informe o nome da disciplina.');
  if (!dados.codigo.trim()) erros.push('Informe o código da disciplina.');
  if (dados.cargaHoraria < 0) erros.push('A carga horária não pode ser negativa.');

  const nomeDuplicado = existentes.some(
    (disciplina) => disciplina.id !== idAtual && disciplina.nome.trim().toLowerCase() === nome.toLowerCase(),
  );
  if (nome && nomeDuplicado) erros.push('Já existe uma disciplina com este nome.');

  const codigoDuplicado = existentes.some(
    (disciplina) =>
      disciplina.id !== idAtual &&
      disciplina.codigo.trim().toUpperCase() === dados.codigo.trim().toUpperCase(),
  );
  if (dados.codigo.trim() && codigoDuplicado) erros.push('Já existe uma disciplina com este código.');

  return erros;
}
