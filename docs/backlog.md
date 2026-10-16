# Backlog, estado, riscos e limitações

> **Documento-fonte do estado do projeto.** Manter atualizado a cada feature
> implementada. Comece a leitura por "Roadmap / Próxima etapa".

## Roadmap / Próxima etapa

- **Fase atual:** Fase 1 (MVP acadêmico essencial) **concluída**; **Fase 2 —
  Relatórios e comunicação** em andamento.
- **Feature recém-concluída:** **RF-022 — Mural/recados** (US-012/US-013):
  feed de publicações no estilo rede social (reutilizável em equipe, turma e
  aluno), com **foto opcional** por publicação (compactada antes do envio para o
  Supabase Storage), publicações coletivas por turma ou instituição, recados
  individuais (visíveis ao aluno) e observações privadas (só a equipe), com
  sanitização de conteúdo, arquivamento com autoria, filtros de visualização e
  leitura restrita por turma/aluno.
- **Próxima feature:** **RF-023 — Agenda**, depois RF-026
  (preferências/acessibilidade).
- **Fase 3:** gamificação — RF-015…RF-021 e RF-009 (XP, moedas, equipes,
  indicadores/metas, missões, conquistas, loja). RF-012 (pontos extras).
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
  repositórios genéricos e de relacionamentos;   `supabase/migrations/0001`
  (esquema + RLS), `0002` (dados iniciais), `0003` (primeiro acesso), `0004`
  (mural/comunicados) e `0005` (fotos do mural no Storage); flag
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
- **Auditoria (RF-027):** `AuditoriaService` registra eventos críticos (período,
  instituição, disciplina, vínculo, matrícula, frequência, avaliação/nota,
  conta de acesso) e há tela de consulta `/auditoria` (admin).
- **Tenant-ready (ADR 0005):** `institutionId` em toda entidade, `TenantService`
  e isolamento por instituição na camada de dados, com migração de dados legados.
- **Exclusão em massa (Zona de perigo):** botão "Excluir todos" nas telas de
  cadastro, com confirmação por digitação (`EXCLUIR`); página admin
  `/reset-dados` para apagar por grupo ou tudo, sempre em cascata (`DadosService`).
- Documentação: ADRs 0001–0005, arquitetura, permissões, regras de negócio.
- Testes: **205 testes passando** (serviços de domínio, mapeadores Supabase,
  repositórios/tenancy, guards, componentes-chave e validações de período,
  disciplina, matrícula, frequência, avaliação/nota, situação do boletim,
  primeiro acesso, agregação de relatórios, serialização/exportação CSV e
  publicações/comunicados do mural, incluindo helpers de nome de arquivo,
  formatação de campos e validação de imagem das publicações).

## Pendente (próximas fases — ver especificação §16)

- **Fase 2 (em andamento):** RF-023 agenda, RF-026
  preferências/acessibilidade.
- **Fase 3:** gamificação — RF-015 (ações/XP), RF-016 (moedas), RF-017 (equipes),
  RF-018 (indicadores/metas), RF-019 (missões), RF-020 (conquistas/álbum),
  RF-021 (loja e resgates transacionais) e RF-009 (placar/perfil individual);
  RF-012 (pontos extras acadêmicos).
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
