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
    disciplina/disciplinas/             Catálogo de disciplinas (admin)
    disciplina/disciplina-form/         Formulário de disciplina (modal)
    boletim/boletim/                    Boletim (equipe e aluno)
    relatorios/relatorios/              Relatórios institucionais (admin)
    mural/mural/                        Mural e recados (equipe)
    mural/publicacao-form/              Formulário de publicação (modal)
    mural/comunicado-form/              Formulário de recado/observação (modal)
    aluno/mural/                        Mural/recados do aluno
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

## Disciplinas e vínculos (RF-007)

- Catálogo de disciplinas em `core/models/disciplina.model.ts` +
  `DisciplinasService` (`turmalina.disciplinas`), restrito ao administrador em
  `/disciplinas`. O código é gerado das iniciais do nome (`gerarCodigoDisciplina`)
  e não pode repetir; nome e código são únicos (`validarDisciplina`).
- Ao abrir o serviço sem dados, disciplinas padrão são semeadas para demonstração.
- A turma guarda `disciplinaIds` (disciplinas ofertadas); a tela da turma permite
  selecioná-las e manter a **equipe docente** (`VinculoDocente` em
  `core/services/vinculos-docentes.service.ts`, chave `turmalina.vinculos-docentes`),
  associando professor à turma à disciplina sem repetição.
- Criar/atualizar/ativar/desativar/excluir disciplina e criar/remover vínculo
  geram eventos de auditoria.

## Matrículas (RF-005)

- `Matricula` (`core/models/matricula.model.ts`): aluno/turma/período,
  vigência (`inicioEm`, `fimEm`), `status` (`ativa|transferida|encerrada`) e
  `motivoSaida`; validação impede duplicidade de matrícula ativa no mesmo
  contexto; **histórico preservado** (transferência/desmatriculação encerra
  matrículas existentes, nunca apaga). RN-003.
- `MatriculasService` (`core/services/matriculas.service.ts`): `matricular`,
  `transferir` (arquiva + cria nova), `desmatricular` (encerra ativas), mantém
  histórico e audita operações.

## Exclusão em massa (Zona de perigo)

- `DadosService` (`core/services/dados.service.ts`) centraliza a limpeza em
  cascata dos dados de demonstração: cada tela de cadastro expõe "Excluir todos"
  e a página `features/admin/reset-dados/` (`/reset-dados`, admin) permite apagar
  por grupo ou tudo. O componente compartilhado `ConfirmarTextoComponent`
  (`shared/confirmar-texto/`) exige digitar `EXCLUIR` para confirmar.
- Serviços de domínio ganharam operações `removerTodos`/`removeTodos` e limpezas
  de referência (`TurmasService.limparProfessores/limparDisciplinas`,
  `AlunosService.limparTurmas`). `DisciplinasService` grava um marcador
  (`turmalina.disciplinas.inicializado`) para **não** reseedar as disciplinas
  padrão após uma exclusão em massa.

## Frequência (RF-010)

- `Frequencia` (`core/models/frequencia.model.ts`): turma, período letivo,
  disciplina opcional (`null` = frequência geral) e `data`; `registros`
  (`{ alunoId, status, justificativa }`) com `status` em
  `presente|falta|falta_justificada`. `calcularResumoFrequencia` aplica a
  configuração institucional (`frequenciaMinima`, `faltaJustificadaAbona`);
  `validarFrequencia` garante turma/data e impede duplicidade de chamada.
- `FrequenciasService` (`core/services/frequencias.service.ts`, chave
  `turmalina.frequencias`): `salvar` (upsert por turma/data/disciplina, auditado),
  `remover`, `removerTodas`, `removerPorTurma`, `resumoTurma`, `resumoAluno` e
  `abaixoDoLimite`. A tela `features/frequencia/frequencias/` (`/frequencia`,
  admin/professor) lista chamadas, filtra por turma e destaca alunos abaixo do
  limite.
- A instituição (`InstituicaoService`) passou a guardar `frequenciaMinima`
  (padrão 75%) e `faltaJustificadaAbona`, editáveis em `/instituicao`.

## Avaliações e notas (RF-011)

- `Avaliacao` (`core/models/avaliacao.model.ts`): nome, turma, disciplina,
  período (`etapaId`/`data` opcionais), `notaMaxima`, `peso`, `status`
  (`rascunho|publicada|arquivada`) e `notas` (registros `{ alunoId, valor,
  atualizadoEm }`, com `valor` nulo = "não lançada"). Helpers:
  `calcularMediaAluno` (ponderada quando há pesos ≠ 1, senão aritmética;
  ignora arquivadas e não lançadas), `mediaDaAvaliacao`, `resumoNotas`,
  `validarAvaliacao` e `validarNota` (rejeita nota acima da máxima/negativa).
- `AvaliacoesService` (`core/services/avaliacoes.service.ts`, chave
  `turmalina.avaliacoes`): `criar`/`atualizar`, `lancarNotas` (lote, auditado),
  `definirStatus`, `remover`, `removerTodas`, `removerPorTurma`, `resumo`,
  `media`, `resultadoAluno` e `abaixoDaMedia`. Bloqueia escrita quando o
  período está **encerrado** (via `PeriodosLetivosService.periodoEncerrado`).
- A tela `features/avaliacao/avaliacoes/` (`/avaliacoes`, admin/professor)
  lista avaliações com filtros de turma/período, resumo de notas
  lançadas/pendentes e uma tabela de média por aluno com alerta abaixo da média.
- A instituição passou a guardar `notaMaxima`, `mediaMinima` e
  `casasDecimaisNota`, editáveis em `/instituicao`.

## Boletim (RF-013)

- `Boletim` (`core/models/boletim.model.ts`): visão consolidada do aluno por
  período, com `BoletimDisciplina[]` (média, frequência, situação, motivo) e os
  totais gerais. `calcularSituacao(media, frequencia, mediaMinima,
  frequenciaMinima)` decide entre `aprovado`, `recuperacao` (média abaixo da
  mínima), `reprovado` (frequência abaixo da mínima) e `sem_dados` (sem notas).
- `BoletimService` (`core/services/boletim.service.ts`): `gerar(alunoId,
  periodoId)` reaproveita `AvaliacoesService` (média via `calcularMediaAluno`),
  `FrequenciasService` (frequência por disciplina/geral), `InstituicaoService`
  (mínimos e casas decimais) e os serviços de turma/aluno/disciplina/período.
  `gerarPorTurma` monta a relação da turma. Chamadas com `disciplinaId` nulo
  entram em todas as disciplinas.
- A tela `features/boletim/boletim/` serve as rotas `/boletim/:alunoId` (equipe)
  e `/aluno/boletim` (o próprio aluno). Tem seletor de período e botão de
  impressão; o cabeçalho traz aluno, matrícula, turma, período e data de emissão.
- Impressão A4: regras `@media print` em `src/styles.scss` escondem o shell
  (sidebar, topbar, bottom nav, toasts e `.no-print`) e o próprio boletim evita
  quebra de linhas da tabela. Observações privadas nunca entram no documento.

## Relatórios (RF-014)

- `core/models/relatorio.model.ts` define os tipos de relatório
  (`TipoRelatorio`, `TIPOS_RELATORIO`), as linhas de frequência
  (`LinhaRelatorioFrequencia`), desempenho (`LinhaRelatorioDesempenho` com
  médias por disciplina), avaliações pendentes
  (`LinhaRelatorioAvaliacaoPendente`) e o `ResumoInstitucional`.
- `RelatoriosService` (`core/services/relatorios.service.ts`) agrega os dados dos
  serviços de domínio: `frequenciaDaTurma`, `desempenhoDaTurma`,
  `avaliacoesPendentes` e `resumoInstitucional`. Reaproveita as mesmas fórmulas
  do restante do app (`calcularResumoFrequencia` e `calcularMediaAluno`) e
  espelha o escopo de período usado no boletim (chamadas sem `periodoLetivoId`
  entram em qualquer período).
- `ExportacaoService` (`core/services/exportacao.service.ts`) centraliza a
  exportação CSV: a função pura `serializarCsv` aplica escaping, delimitador `;`
  e proteção contra CSV injection (campos iniciados por `= + - @ tab CR` recebem
  apóstrofo); `exportarCsv` gera o arquivo no navegador com BOM UTF-8. Helpers de
  módulo (`slugParaArquivo`, `nomeArquivoCsv`, `numeroParaCsv`, `percentualParaCsv`)
  padronizam nome de arquivo e formatação de campos entre as telas (RF-025).
- A tela `features/relatorios/relatorios/` serve a rota `/relatorios` (apenas
  **administrador**). Tem seletor de período, KPIs institucionais e abas de tipo
  de relatório (frequência/desempenho/pendentes), com seletor de turma, data de
  geração, explicação da regra de cálculo, botão de exportação CSV e botão de
  impressão/PDF (classes `no-print` + `@media print`).
- A exportação/impressão (RF-025) reaproveita `ExportacaoService` no boletim e
  nas listas de alunos, turmas e professores; cada exportação registra evento via
  `AuditoriaService`. O boletim e os relatórios usam `window.print()` sobre um
  layout A4 definido em `src/styles.scss`.

## Mural e recados (RF-022)

- `Publicacao` (`core/models/publicacao.model.ts`): título, conteúdo, `turmaId`
  (`null` = toda a instituição), `publicadaEm` (timestamp ISO), `expiraEm`
  (`yyyy-mm-dd` opcional), `status` (`publicada|arquivada`) e autoria
  (`autorId`/`autorNome`). Helpers `validarPublicacao`, `alcancePublicacao`
  (destino alcança uma turma?) e `publicacaoVigente` (publicada e não expirada).
- `Comunicado` (`core/models/comunicado.model.ts`): mensagem **individual**
  (`alunoId`) com `tipo` `recado` (visível ao próprio aluno) ou `observacao`
  (privada, só a equipe), mais autoria.
- `sanitizarConteudo` (`core/models/conteudo.model.ts`) normaliza o texto (CRLF,
  caracteres de controle, excesso de quebras) e o conteúdo é exibido apenas por
  interpolação Angular — **nunca** via `innerHTML` —, impedindo HTML/script
  (RN). O texto preserva quebras com `white-space: pre-wrap`.
- `PublicacoesService` (`turmalina.publicacoes`) expõe `ordenadas`,
  `vigentesParaTurma` e operações `criar/atualizar/arquivar/restaurar/remover`
  (todas auditadas). `ComunicadosService` (`turmalina.comunicados`) expõe
  `porAluno`, `recadosDoAluno` e `criar/remover` (auditados).
- Página `features/mural/mural/` (`/mural`, admin/professor) com abas Mural e
  Recados; admin vê tudo, professor vê as publicações institucionais e das suas
  turmas, e os alunos das suas turmas. A visão do aluno
  (`features/aluno/mural/`, `/aluno/mural`) mostra somente as publicações
  vigentes da sua turma (mais institucionais) e os próprios recados. Sem chat em
  tempo real e sem mensagem aluno→aluno.
- No Supabase, as leituras são restritas por RLS
  (`supabase/migrations/0004_mural_comunicados.sql`): equipe lê tudo; aluno lê
  publicações publicadas do seu escopo (turma ou instituição) e não expiradas, e
  apenas os recados endereçados a ele.

## Painel do professor (RF-008)

- A rota `/dashboard` (`DashboardComponent`) escolhe o conteúdo pelo papel: o
  administrador mantém a visão geral e o professor vê o `PainelProfessorComponent`
  (`features/professor/painel/`).
- O painel descobre as turmas do professor por `Turma.professorIds` e pelos
  vínculos (`VinculosDocentesService.porProfessor`), com seletores de turma e
  período. Os indicadores são `computed` sobre os serviços existentes: alunos
  ativos, frequência média do período (via `calcularResumoFrequencia`), média de
  desempenho (média das médias de `BoletimService.gerarPorTurma`), alunos em
  atenção, avaliações sem lançamento/próximas e atividades recentes.
- Sem dados, mostra estado vazio (nunca números artificiais); cada indicador
  exibe a definição do cálculo e atalhos para chamada, notas e alunos.

## Tenancy (isolamento por instituição)

- `BaseEntity` carrega `institutionId`. O **tenant ativo** é resolvido por
  `TenantService` (`core/services/tenant.service.ts`): hoje a instituição padrão;
  com o backend real, a instituição da sessão autenticada.
- `RepositoryFactory` injeta o tenant em cada `LocalStorageRepository`, que
  preenche `institutionId` na criação, **filtra** leituras por instituição e
  limita `update`/`remove` ao tenant ativo (sem afetar as demais). Dados legados
  (sem `institutionId`) são migrados na primeira leitura.
- A UI e os serviços de domínio **não conhecem** o tenant: ativar multi-tenant
  (RLS no Supabase) não altera componentes (ADR 0005).

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

