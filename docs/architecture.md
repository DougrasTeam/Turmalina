# Arquitetura — Turmalina (sistema de gestão escolar turmaLina)

Documento de arquitetura técnica. Reflete **o que está implementado** e o que
está planejado. Para requisitos completos, ver
`docs/especificacao-turmalina-gestao-escolar.md`.

## Visão geral

- **Stack:** Angular 20 (standalone), TypeScript `strict`, SSR habilitado com
  renderização **no cliente** para todas as rotas (`src/app/app.routes.server.ts`).
- **Reatividade:** Signals (`signal`, `computed`, `effect`) e `inject()`.
- **Formulários:** formulários reativos para casos com validação (ex.: login);
  template-driven/signals nos formulários simples existentes.
- **Sem backend conectado:** dados e autenticação são **mock plugável**.

## Estrutura atual

```text
src/app/
  core/
    auth/
      data-access/        AuthRepository (contrato) + MockAuthRepository
      guards/             autenticacaoGuard, papelGuard(...)
      rota-inicial.ts     Rota inicial por papel
    models/               Modelos de domínio (única pasta models do app)
    services/             Serviços (única pasta services do app)
    data/                 Repository<T> (contrato), LocalStorageRepository, RepositoryFactory
  features/
    auth/login/           Tela de login
    dashboard/dashboard/  Painel
    turma/turmas/         Lista de turmas
    turma/turma-form/     Formulário de turma
    turma/turma-detalhe/  Detalhe da turma
    professor/professores/  Cadastro de professores
    aluno/alunos/         Lista de alunos
    aluno/aluno-form/     Formulário de aluno
    aluno/aluno-import/   Importação de alunos (CSV)
    aluno/inicio/         Área do aluno (placeholder explícito)
    periodo-letivo/instituicao/         Dados da instituição
    periodo-letivo/periodos-letivos/    Lista de períodos letivos
    periodo-letivo/periodo-letivo-form/ Formulário de período letivo
  shared/
    modal/                Componente de modal reutilizável
  app.ts / app.html / app.scss   Shell (sidebar, topbar, bottom-nav, toasts)
  app.routes.ts           Rotas com guards
  app.config.ts           Providers (inclui a troca do AuthRepository)
```

## Camadas e separação de responsabilidades

- **Apresentação (componentes/páginas):** interface e coordenação de interações.
- **Serviços de aplicação (`core/services`):** estado e orquestração.
- **Acesso a dados (`core/data`, `core/auth/data-access`):** contratos de
  repositório; implementações trocáveis.
- **Domínio (`core/models`):** contratos e conceitos.

Componentes não fazem acesso a dados direto: dependem de serviços/contratos.

## Fluxo de autenticação e autorização

1. `AuthService.garantirSessaoCarregada()` restaura a sessão (uma vez).
2. `autenticacaoGuard` bloqueia rotas internas sem sessão → redireciona a `/login`.
3. `papelGuard('administrador', 'professor')` restringe rotas da equipe docente;
   `papelGuard('aluno')` restringe a área do aluno.
4. Login (`LoginComponent`) usa formulário reativo, trata erro de credenciais e
   redireciona conforme o papel (`rotaInicialPorPapel`).
5. O shell (`App`) exibe/oculta a navegação conforme o papel e oferece logout.

> Autorização é **conveniência de UX**. A autorização real deve ser revalidada
> no backend/banco.

## Configuração acadêmica (RF-002)

- Páginas `Instituição` e `Períodos letivos` acessíveis apenas ao papel
  **administrador** (`papelGuard('administrador')`).
- `PeriodosLetivosService` garante **um único período ativo**; ativar outro
  encerra o anterior. Períodos `encerrado`/`ativo` não podem ser excluídos
  (preservação de histórico); apenas `planejado` pode ser removido.
- `validarPeriodoLetivo` centraliza as regras: datas válidas, sem sobreposição
  entre períodos e etapas contidas e não sobrepostas.
- Operações críticas (criar/atualizar/ativar/encerrar/reabrir/excluir período e
  salvar instituição) registram evento em `AuditoriaService` (`turmalina.auditoria`).

## Ponto de troca de backend

- **Dados:** `core/data/repository.factory.ts`.
- **Autenticação:** `app.config.ts` → `{ provide: AuthRepository, useClass: ... }`.

## Comandos

```bash
npm start                 # servidor de desenvolvimento
npm run build             # build de produção
npm test                  # testes unitários (Karma/Jasmine)
```

Em ambiente sem Google Chrome, aponte o binário para o Microsoft Edge
(Chromium):

```powershell
$env:CHROME_BIN = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
npm test -- --watch=false --browsers=ChromeHeadless
```

## Limitações conhecidas

- Autenticação e dados são **mock de demonstração** (sem segurança real).
- UI Kit ainda **não** é uma biblioteca separada (ver ADR 0004).
- `Repository<T>` é genérico e síncrono por natureza do mock; operações
  atômicas/transacionais (moedas, resgates) não existem ainda.
- Módulos acadêmicos e de gamificação em grande parte **pendentes** (ver
  `docs/backlog.md`).
