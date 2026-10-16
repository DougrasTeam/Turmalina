/**
 * Regras compartilhadas para textos livres digitados pelos usuários
 * (publicações do mural, recados e observações).
 *
 * A renderização em Angular já escapa HTML por interpolação — nunca usamos
 * `innerHTML` —, então a sanitização aqui serve apenas para remover caracteres
 * de controle e uniformizar quebras de linha, mantendo o conteúdo consistente.
 */

export function sanitizarConteudo(texto: string): string {
  return texto
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
