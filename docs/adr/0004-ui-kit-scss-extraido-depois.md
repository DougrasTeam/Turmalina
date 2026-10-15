# ADR 0004 — UI Kit em SCSS, biblioteca separada depois

- **Status:** Aceito
- **Data:** 2026-10-14

## Contexto

A especificação torna obrigatório um UI Kit como biblioteca Angular separada
(`turma-lina-ui`), independente das regras do produto. Já existe um conjunto de
estilos compartilhados (`src/styles/turmalina-ui-kit.scss` e
`src/styles/_pages.scss`) com tokens e classes no padrão `tl-`/Bootstrap-like.

## Decisão

- **Nesta fase**, manter os estilos compartilhados em SCSS e seguir as classes
  existentes, sem criar o projeto de biblioteca Angular.
- Extrair `turma-lina-ui` como biblioteca separada em fase posterior, migrando
  tokens e componentes mínimos do MVP (`TlButton`, `TlCard`, `TlDialog`,
  `TlToast`, etc.).

## Consequências

- Velocidade no produto agora.
- Débito técnico consciente: até a extração, o UI Kit **não** cumpre o critério
  de aceite de compilar isoladamente. Registrado no backlog.
- Novos estilos devem continuar usando tokens/classes existentes para facilitar
  a extração futura.
