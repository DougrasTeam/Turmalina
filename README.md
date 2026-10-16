# Turmalina

Sistema de gestão escolar gamificado (turmaLina), construído com
[Angular CLI](https://github.com/angular/angular-cli) v20.

- **Especificação/requisitos:** `docs/especificacao-turmalina-gestao-escolar.md`
- **Arquitetura:** `docs/architecture.md`
- **Permissões:** `docs/permissions.md`
- **Regras de negócio:** `docs/business-rules.md`
- **Backlog e riscos:** `docs/backlog.md`
- **Decisões de arquitetura (ADRs):** `docs/adr/`
- **Regras de desenvolvimento:** `AGENTS.md`

## Estado atual

- Shell responsivo + cadastros (turmas, professores, alunos, importação CSV) e painel.
- Instituição e períodos letivos (com um único período ativo e etapas de avaliação).
- **Autenticação/sessão/autorização são mock de demonstração** (ver ADR 0002).
  Não usar com dados reais.

### Contas de demonstração (senha `turmalina`)

| E-mail                     | Papel         |
| -------------------------- | ------------- |
| `admin@turmalina.demo`     | Administrador |
| `professor@turmalina.demo` | Professor     |
| `aluno@turmalina.demo`     | Aluno         |

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

If Google Chrome is not installed, point `CHROME_BIN` to a Chromium-based
browser (e.g. Microsoft Edge) and run headless:

```powershell
$env:CHROME_BIN = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
npm test -- --watch=false --browsers=ChromeHeadless
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
