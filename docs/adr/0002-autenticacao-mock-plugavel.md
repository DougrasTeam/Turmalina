# ADR 0002 — Autenticação mock plugável

- **Status:** Aceito
- **Data:** 2026-10-14

## Contexto

A especificação exige autenticação real, sessão restaurável e proteção de rotas
(RF-001), mas não há backend. Sem um provedor real, não é possível autenticar de
forma segura.

## Decisão

- Implementar `AuthRepository` como **contrato** e `MockAuthRepository` como
  implementação de demonstração com **contas sintéticas**.
- `AuthService` expõe estado reativo (signals): `usuario`, `papel`,
  `autenticado`, `carregando`.
- `autenticacaoGuard` e `papelGuard(...)` protegem as rotas.
- A sessão do mock é guardada em `turmalina.sessao` apenas para permitir
  restauração ao recarregar a página.

### Contas de demonstração (senha `turmalina`)

| E-mail                  | Papel          |
| ----------------------- | -------------- |
| `admin@turmalina.demo`     | Administrador  |
| `professor@turmalina.demo` | Professor      |
| `aluno@turmalina.demo`     | Aluno          |

## Limitações (explícitas)

- **Não é segurança real.** Papel e sessão vêm do cliente e podem ser
  adulterados; no mock não há verificação de servidor.
- A autorização real deve ser **revalidada no backend/banco**, por registro e
  operação. Guards são apenas conveniência de UX.
- Armazenar sessão no navegador é aceitável **somente** neste mock; a solução
  real deve usar o mecanismo seguro do provedor (ex.: Supabase Auth).

## Consequências

- O fluxo de login, sessão e autorização por papel já existe end-to-end e pode
  ser substituído por Supabase sem tocar em componentes.
