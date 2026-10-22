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
    mural/feed-publicacoes/             Feed de publicações reutilizável (cartões)
    mural/publicacao-form/              Formulário de publicação (modal)
    mural/comunicado-form/              Formulário de recado/observação (modal)
    aluno/mural/                        Feed/recados do aluno
    agenda/agenda/                      Agenda escolar (equipe)
    agenda/lista-eventos/               Lista de eventos reutilizável
    agenda/evento-form/                 Formulário de evento (modal)
    aluno/agenda/                       Agenda do aluno
    gamificacao/acoes-gamificacao/      Catálogo de ações de XP (admin)
    gamificacao/pontuar/                Pontuar alunos (equipe)
    aluno/gamificacao/                  XP/nível/histórico do aluno
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

- `Publicacao` (`core/models/publicacao.model.ts`): título, conteúdo,
  `imagemUrl` (foto opcional), `turmaId` (`null` = toda a instituição),
  `publicadaEm` (timestamp ISO), `expiraEm` (`yyyy-mm-dd` opcional), `status`
  (`publicada|arquivada`) e autoria (`autorId`/`autorNome`). Helpers
  `validarPublicacao`, `alcancePublicacao` (destino alcança uma turma?) e
  `publicacaoVigente` (publicada e não expirada). Para as fotos: `validarImagemPublicacao`
  (tipo/tamanho) e `imagemPublicacaoValida` (data URL ou http).
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
- **Feed reutilizável** `features/mural/feed-publicacoes/`
  (`FeedPublicacoesComponent`): recebe a lista já autorizada e mostra os cartões
  (autor, destino, conteúdo, validade) com ações conforme a autoria
  (`gerenciarTudo` ou `autorIdAtual`); emite `editar/arquivar/restaurar/excluir`.
  É usado na equipe, no aluno e no detalhe da turma.
- `aplicarFiltroPublicacoes` (`core/models/filtro-publicacoes.model.ts`) filtra o
  feed por escopo (`tudo|escola|turma`), turma e autoria ("meus posts").
- **Fotos do mural:** `MidiaService` (`core/services/midia.service.ts`) compacta a
  imagem no navegador (redimensiona para no máximo 1280 px e converte em JPEG ~0,8)
  e envia ao bucket público `mural-publicacoes` do **Supabase Storage**
  (`cliente.storage`), devolvendo a URL pública guardada em `Publicacao.imagemUrl`.
  No modo local a imagem compactada vira data URL. Remover/recolocar a foto (ou
  excluir a publicação) apaga o objeto do Storage (best effort). `repository.factory.ts`
  trata `imagem_url` como coluna nulável.
- Página `features/mural/mural/` (`/mural`, admin/professor) com abas **Feed** e
  **Recados**: o feed tem filtro por escopo (tudo / escola toda / turma) e "meus
  posts", e o formulário de publicação (`permitirInstitucional` libera o destino
  "toda a instituição", só para admin); admin vê tudo, professor vê as
  publicações institucionais e das suas turmas, e os alunos das suas turmas. O
  detalhe da turma (`features/turma/turma-detalhe/`) embute o **mural da turma**
  com feed e publicação já destinada à turma (`turmaFixa`). A visão do aluno
  (`features/aluno/mural/`, `/aluno/mural`) usa o mesmo feed filtrando entre
  "Minha turma" e "Escola toda", e mostra os próprios recados. Sem chat em tempo
  real e sem mensagem aluno→aluno.
- No Supabase, as leituras são restritas por RLS
  (`supabase/migrations/0004_mural_comunicados.sql`): equipe lê tudo; aluno lê
  publicações publicadas do seu escopo (turma ou instituição) e não expiradas, e
  apenas os recados endereçados a ele. A migração
  `supabase/migrations/0005_mural_imagens.sql` adiciona a coluna `imagem_url` e o
  bucket `mural-publicacoes` (público para leitura; escrita apenas para a equipe
  via `public.eh_equipe()`).

## Agenda (RF-023)

- Modelo `Evento` (`core/models/evento.model.ts`) com `titulo`, `descricao`,
  `tipo` (`aula|avaliacao|entrega|atividade|aviso`), `inicioEm` (ISO),
  `turmaId` (opcional; `null` = escola toda), `autorId` e `autorNome`. Helpers de
  domínio: `validarEvento`, `eventoDuplicado`, `ordenarEventosPorInicio`,
  `eventoPassado`, `alcanceEvento` e formatação de data-hora no fuso local
  (`formatarInicioEvento`, `paraValorInputDataHora`/`deValorInputDataHora`).
- `EventosService` (`turmalina.eventos`) expõe `ordenados`, `proximos`,
  `eventosParaTurma`, `encontrarDuplicado` e `criar`/`atualizar`/`remover`/
  `removerTodas`/`removerVinculadasATurmas` (todas auditadas). Valida os campos e
  bloqueia eventos duplicados (mesmo título/tipo/data).
- **Lista reutilizável** `features/agenda/lista-eventos/` e **formulário modal**
  `features/agenda/evento-form/`. Página `features/agenda/agenda/` (`/agenda`,
  admin/professor) com filtros por escopo (tudo / escola toda / turma) e por
  período (próximos / semana / mês / todos) via `aplicarFiltroEventos`
  (`core/models/filtro-eventos.model.ts`); eventos passados ficam disponíveis no
  histórico. `features/aluno/agenda/` (`/aluno/agenda`) mostra ao aluno os eventos
  da própria turma e os da escola.
- No Supabase, a tabela `eventos` (`supabase/migrations/0006_agenda.sql`) usa RLS:
  equipe lê/escreve tudo; aluno lê eventos da sua turma e os da escola
  (`public.auth_turma_id()` / `public.eh_equipe()`). A exclusão em massa
  (`DadosService`, grupo `agenda`) e a cascata de exclusão de turmas também
  removem os eventos relacionados.

## Ações e XP (RF-015)

- Modelo `core/models/gamificacao.model.ts`: `AcaoGamificacao` (nome, ícone,
  valor de XP, indicador, status) e `EventoXp` (aluno, turma, ação, delta,
  origem, autor, `idempotencyKey` e data). Constantes `XP_POR_NIVEL`,
  `VALOR_XP_MAXIMO`, `VALOR_XP_NEGATIVO_MAXIMO`, `ICONES_ACAO` e
  `ACOES_GAMIFICACAO_PADRAO` (sementes). Helpers puros: `validarAcaoGamificacao`,
  `nivelPorXp`, `xpNoNivelAtual`, `xpParaProximoNivel`, `progressoNivel`,
  `formatarDeltaXp` e `criarChaveIdempotencia` (crypto com fallback).
- `GamificacaoService` (`turmalina.acoes-gamificacao` / `turmalina.eventos-xp`)
  expõe signals/computeds e as operações: CRUD de ações (auditado:
  `acao.criada/atualizada/ativada/desativada/excluida`), `registrarPontuacao`
  (idempotente por `${chaveLote}:${alunoId}`, rejeita ação inativa, soma XP no
  aluno com piso 0, auditoria `xp.concedido`), `estornar` que cria um evento
  negado (`origem: estorno`, chave `estorno:<id>`, `estornoDe`) com guarda de
  estorno duplo e de estorno-de-estorno, consultas `eventosDoAluno`/
  `eventosDaTurma`/`estaEstornado` e utilitários de reset/recálculo
  (`recalcularXpDosAlunos`, `removerEventosDeTurmas`, `removerTodosEventos`,
  `removerTodasAcoes`, `removerTudo`).
- Telas: `features/gamificacao/acoes-gamificacao/` (`/gamificacao/acoes`, admin)
  com tabela/CRUD e erros de validação; `features/gamificacao/pontuar/`
  (`/pontuar`, equipe) com seleção de turma/ação, multi-seleção de alunos,
  preview de quantidade/total de XP, registro idempotente e histórico com estorno;
  `features/aluno/gamificacao/` (`/aluno/gamificacao`) mostra XP, nível, barra de
  progresso e histórico do próprio aluno (resolvido pelo e-mail da sessão).
- No Supabase, `supabase/migrations/0007_gamificacao.sql` cria
  `acoes_gamificacao` e `eventos_xp` (chaves únicas, checks, índices e trigger de
  `atualizado_em`) com RLS: ações lidas pela equipe e escritas pelo admin; eventos
  de XP lidos pela equipe ou pelo próprio aluno, inseridos pela equipe e
  removidos apenas pelo admin (**append-only**). Uma política e o trigger
  `proteger_alunos_exceto_xp` permitem à equipe atualizar **somente** `xp`/`moedas`
  no aluno. A gamificação participa do reset (`DadosService`, grupo
  `gamificacao`) e das cascatas de exclusão (alunos, turmas, tudo).

## Moedas virtuais (RF-016)

- Modelo `core/models/moedas.model.ts`: `MovimentacaoMoeda` (aluno, turma, delta,
  origem, descrição, autor, `idempotencyKey`, `estornoDe`, `referenciaId`) e
  `DadosMovimentacaoMoeda`; constante `MOEDAS_POR_NIVEL`, `ORIGENS_MOEDA` com
  `ROTULOS_ORIGEM_MOEDA`. Helpers puros: `saldoDeMovimentacoes` (soma com piso
  0), `formatarDeltaMoedas`, `rotuloOrigemMoeda` e `validarMovimentacaoMoeda`.
- `MoedasService` (`turmalina.moedas`) expõe `movimentacoes`/`total` (signals) e
  as operações: `ajustar` (valida, cria movimentação e materializa o saldo no
  aluno, auditoria `moedas.movimentadas`), `estornar` (cria a movimentação
  inversa com `origem: estorno`, guarda de estorno duplo/de-estorno, auditoria
  `moedas.estornadas`), `concederPorNivel` (idempotente por
  `nivel:${alunoId}:${nivel}`), `saldoDoAluno`/`movimentacoesDoAluno`/
  `estaEstornada`, `reconstruirSaldos`/`recalcularSaldosDosAlunos` e utilitários
  de reset (`removerDeTurmas`, `removerTodas`, `limparMovimentacoes`).
- Telas: `features/gamificacao/moedas/` (`/gamificacao/moedas`, admin) com
  filtro por origem, formulário de ajuste e extrato com estorno;
  `features/aluno/moedas/` (`/aluno/moedas`) mostra saldo e extrato do próprio
  aluno (resolvido pelo e-mail da sessão).
- No Supabase, `supabase/migrations/0008_moedas_conquistas.sql` cria
  `movimentacoes_moedas` (**append-only**, chave única e checks) com RLS análoga
  à da gamificação; o saldo do aluno é materializado a partir do ledger.

## Conquistas e álbum (RF-020)

- Modelo `core/models/conquistas.model.ts`: `Conquista` (nome, emoji, descrição,
  bônus de XP, status) e `ConquistaAluno` (registro de desbloqueio com
  `idempotencyKey` e `estornoDe`); constantes `EMOJIS_CONQUISTA`,
  `BONUS_XP_CONQUISTA_MAXIMO` e `CONQUISTAS_PADRAO` (sementes). Helpers puros:
  `validarConquista` e `percentualAlbum`.
- `ConquistasService` (`turmalina.conquistas` / `turmalina.conquistas-aluno`)
  expõe `conquistas`/`desbloqueios` (signals) e as operações: CRUD de conquistas
  (auditado: `conquista.criada/atualizada/ativada/desativada/excluida`),
  `desbloquear` (idempotente por `${chaveLote}:${alunoId}`, rejeita conquista
  desativada, concede bônus de XP pelo histórico, auditoria
  `conquista.desbloqueada`), `reverter` (remove o desbloqueio e estorna o XP,
  preservando a história), `alunoTemConquista`/`desbloqueiosDoAluno`/
  `quantidadeDeAlunos` e utilitários de reset (`removerTodasConquistas`,
  `removerTudo`). Ao remover uma conquista, o XP dos alunos afetados é
  recalculado.
- Telas: `features/gamificacao/conquistas/` (`/gamificacao/conquistas`,
  admin/professor) com tabela/CRUD, modal de desbloqueio por aluno e reversão;
  `features/aluno/conquistas/` (`/aluno/conquistas`) mostra o **álbum** pessoal
  com emoji, status ganho/não-ganho e percentual de completude.
- No Supabase, `conquistas`/`conquistas_aluno` (`0008_moedas_conquistas.sql`)
  seguem o mesmo padrão de RLS e cascatas da gamificação.

## Equipes (RF-017)

- Modelo `core/models/equipes.model.ts`: `Equipe` (nome, emoji, cor, status,
  `turmaId`, `periodoLetivoId`), `EquipeMembro` (vínculo do aluno com
  `equipeId`/`equipeNome`, vigência `inicioEm`/`fimEm`/`ativa` e
  `autorId`/`autorNome`) e `LinhaPlacarEquipe`. Constantes `CORES_EQUIPE`,
  `EMOJIS_EQUIPE`, `NOME_EQUIPE_MAXIMO`, `MAXIMO_EQUIPES_POR_TURMA`,
  `MAXIMO_NOMES_INTEGRANTES` e `CRITERIOS_PLACAR` (`xp_acumulado` |
  `xp_periodo`) com `ROTULOS_CRITERIO_PLACAR`. Helpers puros: `validarEquipe`,
  `vinculoVigenteNaData`, `membrosParaPlacar`, `pontuarEquipe`,
  `resumirNomesMembros` (resumo curto dos nomes exibido na lista de equipes) e
  `sortearAlunosNasEquipes` (distribuição aleatória equilibrada, com fonte de
  aleatoriedade injetável para testes).
- `EquipesService` (`turmalina.equipes` / `turmalina.equipe-membros`) expõe
  `equipes`/`membros`/`criterioPlacar` (signals) e as operações: CRUD de equipes
  (auditado: `equipe.criada/atualizada/ativada/desativada/excluida`),
  `associarAluno` (valida turma e status, **transfere** encerrando o vínculo
  anterior com auditoria `equipe.associado`/`equipe.transferido`),
  `desassociarAluno`, `sortearAlunos` (sorteia apenas alunos sem equipe entre as
  equipes ativas, equilibrando tamanhos, e grava todos os vínculos em um único
  lote, com auditoria `equipe.sorteio`),
  `placar(turmaId, periodo)` (ordena por XP total, desempate
  por nome), `equipesDaTurma`/`membrosDaEquipe`/`equipeAtivaDoAluno`/
  `historicoDoAluno`, `definirCriterioPlacar` e utilitários de reset
  (`removerDeTurmas`, `removerTodos`, `removerTodosMembros`, usando exclusão em
  lote). No critério
  `xp_periodo`, o XP é somado a partir dos eventos de XP dentro do período.
- Tela `features/gamificacao/equipes/` (`/gamificacao/equipes` e
  `/turmas/:id/disciplina/:disciplinaId/equipes`, admin/professor) com toolbar
  de critério do placar. No contexto da turma, o seletor de turma fica
  desabilitado (fixo pela rota); no acesso pelo menu, a turma é escolhida. O
  seletor de período letivo permanece apenas informativo (sempre o ativo e
  desabilitado). Placar em tabela (posição/medalha) e coluna **Integrantes** mostrando a quantidade e os
  nomes de quem está atualmente em cada equipe (`integrantesAtivosPorEquipe`,
  em ordem alfabética, resumidos por `resumirNomesMembros`). O modal de
  integrantes permite associar e desassociar alunos, listando no seletor apenas
  alunos ativos da turma; a remoção é imediata (com toast e `aria-label` no
  botão), e a exclusão de equipes é individual ou em massa por confirmação
  digitada. A cor da equipe é escolhida no seletor nativo
  (  `<input type="color">`), com a paleta `CORES_EQUIPE` disponível como
  atalhos. O botão **Sortear alunos** abre uma confirmação e distribui
  aleatoriamente os alunos ativos sem equipe entre as equipes ativas, mantendo
  os tamanhos equilibrados e sem alterar quem já está vinculado. A equipe
  **não** altera a matrícula do aluno e o XP conquistado é
  preservado ao encerrar vínculos.
- No Supabase, `equipes`/`equipe_membros` (`0009_equipes.sql`) usam FKs em
  cascata/set-null, índice parcial de vínculo ativo único por (instituição,
  turma, período, aluno) e o mesmo padrão de RLS da gamificação. A escrita em
  `equipes` e em `equipe_membros` é liberada à equipe docente
  (administrador/professor) — `0011_equipes_permitir_professor.sql` e
  `0013_equipes_membros_permitir_professor.sql` — para que o professor
  associe, transfira e desassocie alunos das equipes que administra.

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
- `Repository<T>` oferece `createMany`/`removeMany` para escritas em lote; no
  Supabase elas viram um único `insert`/`delete ... in (...)`.

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
- Módulos acadêmicos concluídos; gamificação em andamento (RF-015, RF-016,
  RF-017 e RF-020 prontas; RF-018, RF-019, RF-021 e RF-009 pendentes — ver
  `docs/backlog.md`).



---

## ADENDO ARQUITETURAL — Contexto de turma e disciplina do professor

Este adendo registra a decisão de UX: o professor abre a turma primeiro em **Visão geral** e depois entra em uma disciplina. Ele complementa as seções existentes de RF-007/RF-008.

### Separação de conceitos
- `Turma`: grupo de alunos no período letivo.
- `Matricula`: vínculo do aluno com turma/período.
- `Disciplina`: catálogo de matéria.
- Oferta de disciplina na turma: associação que indica quais matérias aquela turma possui.
- `VinculoDocente`: associação explícita entre `professorId`, `turmaId` e `disciplinaId`, com status/vigência quando suportados. Deve ser a fonte para descobrir as turmas e disciplinas do professor.

Não duplicar `professorIds` ou listas de disciplinas como fonte paralela de autorização se o repositório já possui entidade de vínculo. Inspecionar o modelo atual e definir uma fonte de verdade.

### Composição de telas
- **Painel do professor:** turmas vinculadas, disciplina(s) de cada turma e pendências calculadas a partir de dados reais.
- **Detalhe da turma:** inicia na visão geral, com informações coletivas permitidas, equipe docente, alunos, disciplinas ofertadas e indicadores agregados permitidos.
- **Lista de disciplinas da turma:** apresenta as disciplinas ofertadas e sinaliza quais possuem vínculo ativo com o professor atual.
- **Área da disciplina:** recebe contexto de turma + disciplina e concentra operações acadêmicas da combinação autorizada.

A tela pode usar rotas já existentes ou estado de navegação consistente; não criar rotas duplicadas sem necessidade. Seguir o padrão do repositório real. Não introduzir microfrontends, uma nova biblioteca de estado ou uma refatoração global só para implementar esta UX.

### Contratos de autorização
Toda operação sensível deve validar no serviço/backend/banco:
`usuário autenticado + instituição ativa + papel + vínculo docente ativo + turma + disciplina + período letivo + permissão da operação`.

A interface pode ocultar/desabilitar ações, mas isso é apenas UX. RLS/políticas devem impedir leitura ou escrita fora do escopo. Indicadores agregados não podem permitir recuperar notas individuais de outras disciplinas por detalhes, consultas auxiliares ou exportações.

### Estado do contexto
Ao mudar turma, disciplina ou período:
- atualizar cabeçalho/breadcrumb;
- recarregar os dados dependentes;
- invalidar estado/cache incompatível;
- cancelar ou ignorar respostas assíncronas antigas quando necessário;
- validar novamente a autorização antes de gravar.

Não presumir que `BehaviorSubject`, parâmetro de rota, localStorage ou estado do frontend protegem dados. Podem apoiar a navegação, nunca substituir autorização no servidor.

### Frequência e mural
- A frequência segue a política da instituição: geral por aula ou vinculada à disciplina. Não criar chamadas duplicadas.
- Distinguir publicações gerais da turma de publicações disciplinares; aplicar permissões separadas.
- Não alterar esquema/migrações antes de verificar tabelas, vínculos e RLS existentes. Preferir alterações incrementais e compatíveis.

### Testes técnicos mínimos
Cobrir professor autorizado e não autorizado para turma-disciplina; isolamento entre duas disciplinas da mesma turma; troca rápida de contexto; tentativa de escrita adulterando IDs no cliente; ausência de dados; e política de frequência/mural conforme configuração.
