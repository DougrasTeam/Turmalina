# ADR 0003 — Tenancy: uma instituição por implantação no MVP

- **Status:** Aceito (revisado por [ADR 0005](0005-tenancy-tenant-ready.md))
- **Data:** 2026-10-14

## Contexto

A especificação exige isolamento por instituição/tenant. Multi-tenant desde o
início adiciona complexidade de modelo, autorização e testes.

## Decisão

- No MVP, adotar **single-tenant**: uma instituição por implantação.
- Ainda assim, **prever `institution_id`** nos modelos de domínio e nos
  contratos de repositório, para viabilizar migração futura para multi-tenant
  sem reescrita da UI.

## Consequências

- Autorização simplificada nesta fase (papel + escopo).
- Toda consulta futura ao backend deverá aplicar o filtro de instituição; quando
  o multi-tenant for ativado, as políticas de acesso precisam ser revistas e
  testadas.
