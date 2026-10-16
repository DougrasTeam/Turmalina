/**
 * Conversão entre os nomes do domínio (camelCase no TypeScript) e as colunas do
 * banco (snake_case no PostgreSQL), usada pela camada de dados do Supabase.
 */

export type Linha = Record<string, unknown>;

export function nomeColuna(propriedade: string): string {
  return propriedade.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);
}

export function nomePropriedade(coluna: string): string {
  return coluna.replace(/_([a-z0-9])/g, (_, letra: string) => letra.toUpperCase());
}

export function paraSnakeCase(entidade: object): Linha {
  const linha: Linha = {};
  for (const [chave, valor] of Object.entries(entidade)) {
    linha[nomeColuna(chave)] = valor instanceof Date ? valor.toISOString() : valor;
  }
  return linha;
}

export function paraCamelCase<T>(linha: Linha): T {
  const entidade: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(linha)) {
    entidade[nomePropriedade(chave)] = valor;
  }
  return entidade as T;
}

export function paraCamelCaseLista<T>(linhas: Linha[] | null): T[] {
  return (linhas ?? []).map((linha) => paraCamelCase<T>(linha));
}
