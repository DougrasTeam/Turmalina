# Backlog, riscos e limitações

## Implementado

- Shell responsivo (sidebar desktop, bottom-nav + drawer no mobile), toasts.
- Cadastros: turmas (lista, formulário, detalhe com membros), professores,
  alunos (cadastro, formulário, importação CSV com mapeamento de colunas).
- Painel com indicadores básicos de cadastro.
- **Autenticação/sessão/autorização (mock plugável):** login, sessão
  restaurável, guards de autenticação e de papel, shell por papel, área do aluno
  (placeholder explícito).
- **Instituição e período letivo (RF-002):** dados da instituição, períodos com
  um único ativo, etapas de avaliação, validações de data/sobreposição e
  auditoria de operações críticas.
- Documentação: ADRs 0001–0004, arquitetura, permissões, regras de negócio.
- Testes: `App`, `AuthService`, `PeriodosLetivosService` e validação de período
  (18 testes passando).

## Pendente (próximas fases — ver especificação §16)

- **Fase 1 (MVP acadêmico):** ~~instituição/período letivo~~ (feito), disciplinas
  e vínculos, matrículas, painel docente real, frequência, avaliações/notas,
  boletim, auditoria (tela de consulta).
- **Fase 2:** relatórios, mural/recados, agenda, exportação CSV/PDF.
- **Fase 3:** gamificação (ações/XP, moedas, equipes, indicadores/metas,
  missões, conquistas/álbum, loja e resgates transacionais).
- **Fase 4:** gestão avançada, projeção, performance/PWA.
- **UI Kit:** extrair biblioteca Angular `turma-lina-ui` (ADR 0004).
- **Backend real:** Supabase (Auth + Postgres + RLS) ou API própria (ADR 0001).

## Bloqueado

- Integração de backend/autenticação real depende de credenciais e projeto do
  provedor escolhido.

## Riscos e dívidas técnicas

- **Autenticação e dados são mock:** não usar com dados reais. Não é segurança
  real (ver ADR 0002).
- **Sem atomicidade:** `Repository<T>` não oferece transações, necessário para
  moedas/resgates no futuro.
- **Modelos de domínio** ainda concentrados em `core/models/index.ts`; a
  especificação sugere organização por feature — a adotar conforme os módulos
  crescem.
- **`institution_id`** precisa ser introduzido nos modelos antes de ativar
  multi-tenant (ADR 0003).
- **UI Kit não extraído:** não cumpre ainda o critério de compilar isoladamente.
