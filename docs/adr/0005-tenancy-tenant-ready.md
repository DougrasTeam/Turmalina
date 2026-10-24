# ADR 0005 — Tenancy "tenant-ready" na camada de dados

- **Status:** Aceito (complementado pelo ADR 0006)
- **Data:** 2026-10-15

## Contexto

O produto será um **SaaS vendido a várias escolas**. Ainda não há backend real
(auth e dados são mock — ADR 0001/0002), mas retrofitar o isolamento por
instituição **depois** de existirem dados gera órfãos, migrações e mudanças em
todo o modelo. O ADR 0003 já previa `institution_id` nos modelos.

## Decisão

Ativar o isolamento por instituição **já na camada de dados**, sem tocar na UI,
mantendo o mock local como demonstração:

1. `BaseEntity` passa a incluir **`institutionId`** — toda entidade persistida
   carrega o tenant.
2. `TenantService` (`core/services/tenant.service.ts`) expõe a instituição ativa
   (`institutionId`). Hoje retorna uma instituição padrão
   (`INSTITUICAO_PADRAO_ID`); no futuro será resolvida pela sessão autenticada.
- `RepositoryFactory` injeta o `TenantService` em cada `LocalStorageRepository`.
- O repositório **preenche** `institutionId` no `create`, **filtra** leituras por
  instituição e restringe `update`/`remove` ao tenant ativo (escrita preserva os
  dados das demais instituições).
- Registros legados (sem `institutionId`) são **migrados** para o tenant ativo na
  primeira leitura.

## Adiado na época

- Autenticação real multi-escola, `RLS` no Supabase e roteamento por escola.
  Esses itens foram implementados posteriormente, conforme ADR 0006.
- Convite de escola e cobrança/planos continuam fora do escopo deste ADR.

## Consequências

- Isolamento por tenant já existe no mock (mesmo padrão da futura `RLS`).
- A UI e os serviços de domínio **não** mudam ao ativar o backend real.
- A separação efetiva de dados entre escolas é garantida no backend pelo RLS,
  não pelo frontend.
