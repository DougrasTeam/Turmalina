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
  (equipe) e `/aluno/boletim` (o próprio aluno), a partir da lista de alunos e do
  menu do aluno.
- **Painel do professor (RF-008):** `/dashboard` sensível ao papel — o professor
  vê indicadores da própria turma/período (alunos ativos, frequência média,
  média de desempenho, alunos em atenção, avaliações sem lançamento/próximas,
  atividades recentes), com definição de cada cálculo, estados vazios e atalhos
  para chamada, notas e alunos.
- **Tenant-ready (ADR 0005):** `institutionId` em toda entidade, `TenantService`
  e isolamento por instituição na camada de dados (repositório), com migração de
  dados legados. UI intacta; backend real (RLS) fica para a fase de integração.
- **Exclusão em massa (Zona de perigo):** botão "Excluir todos" nas telas de
  alunos, turmas, professores, disciplinas, períodos, frequência e avaliações,
  com confirmação por digitação (`EXCLUIR`); página admin `/reset-dados` para
  apagar por grupo ou tudo, sempre em cascata (`DadosService`).
- Documentação: ADRs 0001–0005, arquitetura, permissões, regras de negócio.
- Testes: `App`, `PainelProfessorComponent`, `AuthService`,
  `PeriodosLetivosService`, `DisciplinasService`, `VinculosDocentesService`,
  `MatriculasService`, `FrequenciasService`, `AvaliacoesService`, `BoletimService`,
  `DadosService`, `LocalStorageRepository` (tenancy) e validações de período,
  disciplina, matrícula, frequência, avaliação/nota e situação do boletim
  (93 testes passando).


## Pendente (próximas fases — ver especificação §16)

- **Fase 1 (MVP acadêmico):** ~~instituição/período letivo~~ (feito),
  ~~disciplinas e vínculos~~ (feito), ~~matrículas~~ (feito),
  ~~frequência~~ (feito), ~~avaliações/notas~~ (feito), ~~boletim~~ (feito),
  ~~painel docente~~ (feito), auditoria (tela de consulta).

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
- **Modelos de domínio** em transição: tipos principais (turma, professor,
  aluno) seguem em `core/models/index.ts`; os modelos mais novos já vivem em
  arquivos próprios (`disciplina.model.ts`, `vinculo-docente.model.ts`,
  `periodo-letivo.model.ts`). Migrar os restantes para o mesmo padrão.
- **`institution_id` já presente** nos modelos e no repositório (ADR 0005); falta
  a aplicação real de RLS/papéis por instituição no backend.
- **UI Kit não extraído:** não cumpre ainda o critério de compilar isoladamente.

