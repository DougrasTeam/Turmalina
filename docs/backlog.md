# Backlog, estado, riscos e limitações

> **Documento-fonte do estado do projeto.** Manter atualizado a cada feature
> implementada. Comece a leitura por "Roadmap / Próxima etapa".

## Roadmap / Próxima etapa

- **Fase atual:** Fase 2 **concluída** (tema claro/escuro — RF-026 — e auditoria
  — RF-027); **Fase 3 — Gamificação em andamento** com **RF-015 — Ações e XP**,
  **RF-016 — Moedas virtuais**, **RF-020 — Conquistas e álbum** e **RF-017 —
  Equipes** implementadas. Refinamentos de acessibilidade contínuos.
- **Features recém-concluídas:** **RF-023 — Agenda** (US-014), **RF-027 —
  Auditoria**, **RF-015 — Ações e XP**, **RF-016 — Moedas virtuais**,
  **RF-020 — Conquistas e álbum** e **RF-017 — Equipes**. A RF-016 mantém o saldo de moedas como soma de
  um **ledger imutável** de movimentações (`/gamificacao/moedas` para o
  administrador ajustar/estornar; `/aluno/moedas` mostra saldo e extrato do
  aluno), com **estorno auditado** em vez de exclusão. A RF-020 permite
  configurar conquistas (`/gamificacao/conquistas`), **desbloquear** por aluno
  com bônus de XP idempotente e **reverter** por auditoria; o aluno acompanha o
  **álbum** pessoal em `/aluno/conquistas` com percentual de completude. A RF-015
  permite ao administrador definir **ações de gamificação** (nome, ícone, valor
  de XP, indicador e status), ao professor **pontuar** um ou mais alunos de uma
  turma com preview de quantos/total de XP e registro **idempotente** (sem XP
  duplicado por duplo clique/reenvio), **histórico** por aluno/turma com
  **estorno auditado**. XP **nunca** cria/altera nota, frequência ou aprovação.
- **Próxima feature:** **RF-018 — Indicadores e metas** (continuação da Fase 3).
- **Fase 3:** gamificação — RF-018 (indicadores/metas), RF-019 (missões),
  RF-021 (loja) e RF-009. RF-017 (equipes) concluída. RF-012 (pontos extras).
- **Fase 4:** gestão avançada, tela de projeção, performance/PWA.
- **Transversal:** extrair o UI Kit como biblioteca Angular (ADR 0004).

## Implementado

- Shell responsivo (sidebar desktop, bottom-nav + drawer no mobile), toasts.
- Cadastros: turmas (lista, formulário, detalhe com membros), professores,
  alunos (cadastro, formulário, importação CSV com mapeamento de colunas).
- Painel com indicadores básicos de cadastro.
- **Autenticação e autorização reais (RF-001):** Supabase Auth (e-mail/senha;
  Google preparado), sessão restaurável, papéis a partir da tabela `perfis`
  (fonte autoritativa), guards de autenticação, de papel e de primeiro acesso,
  shell por papel e área do aluno. Sem senha/segredo no frontend.
- **Primeiro acesso e gestão de contas:** criação automática da conta Auth ao
  cadastrar professor/aluno via **Edge Function `admin-usuarios`** (usa
  `service_role` no servidor, com rollback), senha provisória exibida uma única
  vez ao administrador, **troca obrigatória de senha** em `/primeiro-acesso`
  (RPC `security definer`) e **redefinição de senha** na edição do professor.
- **Backend real (ADR 0001): Supabase (Auth + Postgres).** Camada de dados com
  repositórios genéricos e de relacionamentos; `supabase/migrations/0001`
  (esquema + RLS), `0002` (dados iniciais), `0003` (primeiro acesso), `0004`
  (mural/comunicados), `0005` (fotos do mural no Storage), `0006` (agenda) e
  `0007` (gamificação: ações de XP e eventos de XP); flag
  `usarSupabaseDados` (fallback mock/localStorage). RLS por instituição ainda
  precisa de verificação com dados reais (ver Riscos).
- **Instituição e período letivo (RF-002):** dados da instituição, períodos com
  um único ativo, etapas de avaliação, validações de data/sobreposição e
  auditoria de operações críticas.
- **Disciplinas e vínculos (RF-007):** catálogo de disciplinas (código
  automático, cor, carga horária, ativação) com sementes padrão; disciplinas
  ofertadas por turma e vínculos professor × turma × disciplina (equipe docente);
  página `Disciplinas` restrita ao administrador.
- **Matrículas (RF-005):** matrícula de aluno com vigência e histórico
  (`ativa|transferida|encerrada`), transferência entre turmas sem perder o
  passado, bloqueio de duplicidade ativa, integração com a tela da turma e
  cadastro do aluno, e histórico visível na lista de alunos.
- **Frequência (RF-010):** chamada por turma/data com disciplina opcional,
  estados `presente|falta|falta_justificada`, cálculo de percentual por aluno
  respeitando a frequência mínima e a bonificação de falta justificada
  (configuráveis em Instituição), filtro por turma e alerta de alunos abaixo do
  limite (`/frequencia`, admin/professor).
- **Avaliações e notas (RF-011):** avaliações por turma/disciplina/período com
  nota máxima, peso, etapa/data e status (`rascunho|publicada|arquivada`);
  lançamento de notas em lote (nota em branco = "não lançada"), validação de
  intervalo, média ponderada/aritmética conforme os pesos, resumo de
  lançadas/pendentes, média por aluno com alerta abaixo da média (configurável
  em Instituição) e bloqueio de edição em período encerrado
  (`/avaliacoes`, admin/professor).
- **Boletim (RF-013):** consolidação por disciplina e período (média, frequência
  e situação), situação `aprovado|recuperacao|reprovado|sem_dados` conforme os
  mínimos da instituição, "não lançado"/"sem registros" tratados como tais,
  cabeçalho com aluno/turma/instituição/período/data de emissão, impressão em A4
  sem cortar tabelas e sem observações privadas. Rotas `/boletim/:alunoId`
  (equipe) e `/aluno/boletim` (o próprio aluno).
- **Painel do professor (RF-008):** `/dashboard` sensível ao papel — o professor
  vê indicadores da própria turma/período (alunos ativos, frequência média,
  média de desempenho, alunos em atenção, avaliações sem lançamento/próximas,
  atividades recentes), com definição de cada cálculo, estados vazios e atalhos
  para chamada, notas e alunos.
- **Relatórios (RF-014):** página `/relatorios` (admin) com KPIs institucionais
  do período (turmas/alunos ativos, frequência média, média geral, alunos abaixo
  do limite/da média, avaliações com pendência) e três relatórios por turma +
  período: **Frequência** (aulas, presenças, faltas, justificadas, % e alerta
  abaixo do limite), **Desempenho** (média por disciplina e geral, alerta abaixo
  da média) e **Avaliações pendentes** (lançadas/pendentes/status). Reaproveita
  as fórmulas de frequência/média dos models, mostra data de geração e a regra
  de cálculo, permite exportar CSV (delimitador `;`, BOM UTF-8 e proteção contra
  CSV injection).
- **Exportação CSV/PDF (RF-025):** central de exportação reutilizável
  (`ExportacaoService`, helpers de nome/campos por formato) com delimitador `;`,
  BOM UTF-8 e proteção contra CSV injection; exportação CSV no **boletim** e nas
  listas de **alunos**, **turmas** e **professores**; **impressão/PDF** do
  boletim e dos relatórios (layout A4, ocultando navegação e controles) e
  **auditoria** de toda exportação de dados sensíveis.
- **Mural/recados (RF-022):** **feed de publicações em estilo rede social**
  (`FeedPublicacoesComponent` reutilizável) com cartões de autor, destino,
  conteúdo e validade, e ações editar/arquivar/republicar/excluir conforme a
  autoria. Página `/mural` (admin/professor) com abas **Feed** e **Recados**:
  no feed há filtro por escopo (tudo / escola toda / turma) e "meus posts", além
  do formulário de publicação para uma turma ou (admin) toda a instituição
  (título, texto, **foto opcional**, data de publicação e expiração,
  `publicada|arquivada`); a aba
  de recados lista **comunicados** do aluno — **recados** (visíveis ao próprio
  aluno) e **observações** (privadas, só a equipe). O detalhe da turma
  (`/turmas/:id`) traz o **mural da turma** com feed e publicação já destinada à
  turma. Aluno acessa `/aluno/mural` com o mesmo feed, filtrando entre "Minha
  turma" e "Escola toda", e vê apenas publicações vigentes e os próprios
  recados. Conteúdo é sanitizado (`sanitizarConteudo`) e renderizado apenas por
  interpolação (sem `innerHTML`, sem HTML/script); edição/arquivamento com
  autoria e auditoria. As **fotos** (`MidiaService`) são compactadas no navegador
  (redimensionadas e convertidas em JPEG) e enviadas ao bucket público
  `mural-publicacoes` do Supabase Storage (escrita restrita à equipe); no modo
  local viram data URL. Sem chat em tempo real e sem mensagem aluno→aluno.
- **Agenda (RF-023):** eventos escolares por tipo (aula, avaliação, entrega,
  atividade, aviso) com título, descrição, data-hora e turma-alvo (ou escola toda
  quando sem turma), autor e auditoria; página `/agenda` (admin/professor) com
  filtros por escopo/turma e por período (próximos, semana, mês, todos), lista
  reutilizável (`ListaEventos`) em ordem cronológica, distinção entre próximos e
  históricos (passados consultáveis), bloqueio de eventos duplicados (mesmo
  título/tipo/data) e data-hora exibida no fuso local. Aluno acessa
  `/aluno/agenda` e vê os eventos da própria turma e os da escola. A agenda entra
  na exclusão em massa (`DadosService`, grupo `agenda`) e em cascata ao excluir
  turmas.
- **Auditoria (RF-027):** `AuditoriaService` registra eventos críticos (período,
  instituição, disciplina, vínculo, matrícula, frequência, avaliação/nota,
  publicação/comunicado, importação/exportação) com ator, ação, entidade,
  identificador, data/hora e metadados mínimos, e há tela de consulta
  `/auditoria` (admin). Os registros são append-only na aplicação; a remoção só
  ocorre no reset administrativo total. Concessão/estorno de pontos e moedas,
  resgates de recompensas e alterações de papel serão cobertos quando as
  features correspondentes existirem.
- **Ações e XP (RF-015):** o administrador define **ações de gamificação**
  (nome, ícone/emoji, valor de XP, indicador associado e status) em
  `/gamificacao/acoes`, com cinco ações positivas semeadas por padrão e
  validação (`validarAcaoGamificacao`) de nome, valor (positivo até o máximo;
  negativo até o limite negativo) e indicador. O professor abre `/pontuar`,
  escolhe turma e ação, seleciona **um ou mais alunos**, vê o **preview** de
  quantos serão afetados e o total de XP, confirma e o sistema registra o evento
  de pontuação de forma **idempotente** (`criarChaveIdempotencia`) — duplo
  clique/reenvio/rede instável não concedem XP duplicado. O **nível** é derivado
  de fórmula configurável (`nivelPorXp`/`progressoNivel` com `XP_POR_NIVEL`), a
  ação inativa é rejeitada e o XP do aluno nunca fica negativo. Correções são
  feitas por **estorno auditado** (`origem: estorno`, sem exclusão silenciosa),
  com bloqueio de estorno duplo e de estorno-de-estorno; cada operação gera
  auditoria (`acao.*`, `xp.concedido`, `xp.estornado`). Aluno vê nível, XP,
  progresso e histórico em `/aluno/gamificacao`. No Supabase, as tabelas
  `acoes_gamificacao`/`eventos_xp` (`supabase/migrations/0007_gamificacao.sql`)
  usam RLS (leitura pela equipe ou pelo próprio aluno; escrita de XP apenas pela
  equipe; exclusão apenas pelo admin) e uma política/trigger permite à equipe
  atualizar **somente** `xp`/`moedas` no aluno. A gamificação entra na exclusão
  em massa (`DadosService`, grupo `gamificacao`) e nas cascatas de exclusão.
- **Moedas virtuais (RF-016):** o saldo é sempre a soma de um **ledger imutável**
  de movimentações; correções acontecem por **estorno auditado**, nunca por
  exclusão, e o saldo nunca fica negativo. O administrador ajusta/estorna em
  `/gamificacao/moedas` (filtro por origem e extrato por aluno); o aluno
  acompanha saldo e extrato em `/aluno/moedas`. Subidas de nível concedem moedas
  de forma idempotente (`GamificacaoService`/`MoedasService`). No Supabase, a
  tabela `movimentacoes_moedas` (`supabase/migrations/0008_moedas_conquistas.sql`)
  segue o mesmo padrão de RLS e cascatas da gamificação.
- **Conquistas e álbum (RF-020):** o administrador/professor configura conquistas
  (nome, emoji, descrição, bônus de XP e status) em `/gamificacao/conquistas`,
  **desbloqueia** por aluno com bônus de XP idempotente e **reverte** por
  auditoria (preserva a história da conquista). O aluno vê o **álbum** pessoal
  em `/aluno/conquistas`, com emoji, status ganho/não-ganho e percentual de
  completude. No Supabase, `conquistas`/`conquistas_aluno` também vivem em
  `supabase/migrations/0008_moedas_conquistas.sql`.
- **Equipes (RF-017):** o administrador/professor cria equipes por turma/período
  (nome, emoji, cor e status) em `/gamificacao/equipes`, associa e transfere
  alunos e acompanha o **placar** por critério (`xp_acumulado` ou `xp_periodo`).
  A associação usa **vínculos com vigência** (`inicioEm`/`fimEm`/`ativa`):
  transferir encerra o vínculo anterior preservando o histórico, e a exclusão de
  equipe remove apenas os vínculos (o XP conquistado é preservado). A cor é
  apenas apoio visual — nome e emoji sempre identificam a equipe. A visão do
  aluno não é alterada (equipe é gamificação, não matrícula). No Supabase,
  `equipes`/`equipe_membros` vivem em `supabase/migrations/0009_equipes.sql`, com
  índice parcial de vínculo ativo único por (instituição, turma, período, aluno).
- **Tenant-ready (ADR 0005):** `institutionId` em toda entidade, `TenantService`
  e isolamento por instituição na camada de dados, com migração de dados legados.
- **Exclusão em massa (Zona de perigo):** botão "Excluir todos" nas telas de
  cadastro, com confirmação por digitação (`EXCLUIR`); página admin
  `/reset-dados` para apagar por grupo ou tudo, sempre em cascata (`DadosService`).
- Documentação: ADRs 0001–0005, arquitetura, permissões, regras de negócio.
- Testes: **257 testes passando** (serviços de domínio, mapeadores Supabase,
  repositórios/tenancy, guards, componentes-chave e validações de período,
  disciplina, matrícula, frequência, avaliação/nota, situação do boletim,
  primeiro acesso, agregação de relatórios, serialização/exportação CSV,
  publicações/comunicados do mural (incluindo helpers de nome de arquivo,
  formatação de campos e validação de imagem), eventos da agenda (validações,
  filtros, duplicidade e ordenação), ações e eventos de XP da gamificação
  (validação, níveis, chave de idempotência, pontuação/estorno e recálculo),
  moedas virtuais (ledger, ajuste, estorno, concessão por nível e recálculo),
  conquistas e álbum (validação, desbloqueio idempotente, reversão, bônus de XP
  e contagem por conquista), equipes (validação, vínculos com vigência,
  transferência, placar por critério e cascatas de exclusão) e catálogo de ações
  de auditoria).

## Pendente (próximas fases — ver especificação §16)

- **Fase 2 (em andamento):** refinamentos de acessibilidade da RF-026
  (navegação por teclado, foco visível, contraste e tema escuro nos componentes).
- **Fase 3:** gamificação — RF-018 (indicadores/metas),
  RF-019 (missões), RF-021 (loja e resgates transacionais) e RF-009
  (placar/perfil individual); RF-012 (pontos extras acadêmicos).
- **Fase 4:** gestão avançada, projeção, performance/PWA.
- **UI Kit:** extrair biblioteca Angular `turmalina-ui` (ADR 0004).
- **Backend:** reforce/verifique RLS e políticas por instituição no Supabase
  contra dados reais; pondere RPCs/views de agregação para relatórios.

## Bloqueado

- **Deploy da Edge Function via CLI:** `supabase functions deploy` retornou
  `403 Missing required permission(s): edge_functions_read` (token/org do CLI).
  Contornado publicando a função pelo **Dashboard** do Supabase.
- **Validação contra Postgres vivo:** sem Docker/`psql` no ambiente; as
  migrações foram validadas apenas por parser SQL e são aplicadas no console.

## Riscos e dívidas técnicas

- **Sem atomicidade:** `Repository<T>` não oferece transações (necessário para
  moedas/resgates e para operações compostas no futuro).
- **Modelos de domínio em transição:** tipos principais (turma, professor,
  aluno) seguem em `core/models/index.ts`; os mais novos já vivem em arquivos
  próprios (`disciplina.model.ts`, `vinculo-docente.model.ts`,
  `periodo-letivo.model.ts`, etc.). Migrar os restantes ao mesmo padrão.
- **RLS por instituição a reforçar:** `institution_id` já existe nos modelos e no
  repositório (ADR 0005), mas as políticas no Supabase precisam ser verificadas
  e ampliadas contra o banco real.
- **Dependência de passos manuais no Supabase:** migrações e deploy da Edge
  Function exigem ações em console/CLI; sem isso, criação de conta/primeiro
  acesso ficam indisponíveis (modo demo continua funcionando).
- **UI Kit não extraído:** não cumpre ainda o critério de compilar isoladamente.
- **Dados de demonstração** sintéticos; não usar com dados reais de pessoas.


---

## Nova tarefa de produto — Navegação docente por turma → visão geral → disciplina

**Objetivo:** ajustar a experiência do professor sem refazer funcionalidades existentes desnecessariamente.

### Escopo
- [ ] Inspecionar telas, rotas, modelos, serviços, vínculos docentes e políticas RLS existentes.
- [ ] Atualizar o painel do professor para listar turmas vinculadas e as disciplinas que ele leciona em cada uma.
- [ ] Fazer o clique na turma abrir a visão geral da turma como padrão.
- [ ] Na visão geral, apresentar dados coletivos autorizados, equipe docente, disciplinas ofertadas e indicadores agregados confiáveis.
- [ ] Criar/ajustar a lista de disciplinas da turma, sinalizando as disciplinas acessíveis ao professor atual.
- [ ] Criar/ajustar a área da disciplina com contexto persistente turma + disciplina e atalhos para funcionalidades já existentes.
- [ ] Filtrar avaliações, notas, conteúdos, mural e frequência pelo contexto e pelas permissões efetivas.
- [ ] Distinguir publicação geral da turma de publicação disciplinar.
- [ ] Confirmar e documentar se a frequência é geral por aula ou por disciplina; respeitar a política atual sem duplicar registros.
- [ ] Garantir autorização no Supabase/RLS para leitura/escrita, sem depender apenas da UI.
- [ ] Implementar estados de carregamento, vazio e erro; nunca inventar métricas.
- [ ] Testar troca de turma/disciplina/período, isolamento de dados e tentativas não autorizadas.
- [ ] Atualizar a documentação técnica e a matriz de permissões após inspecionar o comportamento real.

### Critérios de aceite
1. Turma abre primeiro na visão geral.
2. Professor só opera nas disciplinas vinculadas.
3. Dados de disciplinas diferentes nunca se misturam após troca de contexto.
4. Notas individuais de outras disciplinas não ficam acessíveis por indicadores, API ou exportação sem autorização.
5. Frequência e mural respeitam suas regras de escopo.
6. Mudanças reaproveitam a arquitetura atual e não alteram funcionalidades não relacionadas.
7. Build e testes relevantes passam; falhas preexistentes são documentadas separadamente.

**Instrução ao agente:** antes de codificar, comparar este adendo com o repositório real. Não presumir que a documentação descreve fielmente o estado atual. Apresentar um resumo curto dos componentes/serviços/tabelas/RLS que serão reutilizados; depois implementar em mudanças pequenas. Não fazer refatoração ampla nem criar modelos/tabelas duplicados sem justificativa.
