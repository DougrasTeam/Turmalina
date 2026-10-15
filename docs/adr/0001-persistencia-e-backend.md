# ADR 0001 — Persistência e backend

- **Status:** Aceito
- **Data:** 2026-10-14

## Contexto

A especificação (`docs/especificacao-turmalina-gestao-escolar.md`) proíbe usar
`localStorage` como banco de dados das informações escolares e exige uma camada
de acesso a dados abstrata, independente do fornecedor de backend. Ainda não há
backend definido.

## Decisão

1. Toda leitura/gravação de dados passa por **contratos de repositório**
   (`Repository<T>`, `AuthRepository`) e serviços de domínio.
2. No MVP, a implementação é um **mock plugável** (repositório local), marcado
   explicitamente como demonstração, para permitir desenvolvimento sem backend.
3. O **Supabase** é o backend proposto. A troca acontece em um único ponto:
   `src/app/core/data/repository.factory.ts` (dados) e
   `src/app/app.config.ts` (autenticação), registrando implementações reais
   (ex.: `SupabaseAuthRepository`) sem alterar componentes.

## Consequências

- A UI e as regras de negócio não conhecem o backend.
- Dados escolares no mock **não são** persistência de produção: são sintéticos e
  isolados, jamais devem ser usados com dados reais de alunos.
- Migrações de banco, políticas RLS e operações atômicas ficam para a fase de
  integração com o Supabase.
