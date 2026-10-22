# Matriz de permissões (estado atual e alvo)

> **Importante:** as permissões abaixo são, hoje, aplicadas apenas no
> **frontend** por conveniência de UX. A autorização real deve ser verificada no
> backend/banco, por registro e operação (ver especificação §3 e §13).

## Papéis

- `administrador` — administrador da instituição.
- `professor` — professor vinculado a turmas/disciplinas.
- `aluno` — aluno (acesso apenas aos próprios dados).

## Implementado nesta fase

| Área / Rota        | Administrador | Professor | Aluno |
| ------------------ | ------------- | --------- | ----- |
| `/login`           | público       | público   | público |
| `/dashboard`       | sim           | sim       | não (redireciona) |
| ↳ painel do professor | não        | sim       | não |
| `/turmas`, `/turmas/:id` | sim     | sim       | não |
| `/professores`     | sim           | sim       | não |
| `/alunos`          | sim           | sim       | não |
| `/frequencia`      | sim           | sim       | não |
| `/avaliacoes`      | sim           | sim       | não |
| `/boletim/:alunoId`| sim           | sim       | não |
| `/mural`           | sim           | sim       | não |
| `/agenda`          | sim           | sim       | não |
| `/pontuar`         | sim           | sim       | não |
| `/aluno/inicio`    | não           | não       | sim |
| `/aluno/boletim`   | não           | não       | sim |
| `/aluno/mural`     | não           | não       | sim |
| `/aluno/agenda`    | não           | não       | sim |
| `/aluno/gamificacao`| não          | não       | sim |
| `/instituicao`     | sim           | não       | não |
| `/periodos-letivos`| sim           | não       | não |
| `/disciplinas`     | sim           | não       | não |
| `/gamificacao/acoes`| sim          | não       | não |
| `/relatorios`      | sim           | não       | não |
| `/reset-dados`     | sim           | não       | não |

Regras aplicadas:

- Sem sessão → qualquer rota interna redireciona para `/login`.
- Papel sem permissão na rota → redireciona para a rota inicial do papel
  (`rotaInicialPorPapel`).
- Instituição, períodos letivos e disciplinas são restritos ao administrador;
  ativar, encerrar e reabrir período registram evento de auditoria.
- Professores vinculados a turmas/disciplinas são adicionados pelo administrador
  na tela da turma (equipe docente); o vínculo alimenta o painel docente futuro.
- Matrículas de alunos (matricular/transferir/desmatricular) são operadas pelo
  administrador/professor na tela da turma ou no cadastro do aluno; o histórico
  fica visível na lista de alunos. O aluno vê apenas o próprio contexto.
- Registro de frequência é operado pelo administrador/professor; o aluno verá
  apenas a própria frequência (área do aluno, fase futura).
- Avaliações e lançamento de notas são operados pelo administrador/professor; o
  aluno consulta apenas as próprias notas/boletim (fase futura).
- O boletim é gerado a partir das notas e frequências já registradas: a equipe
  acessa por aluno (`/boletim/:alunoId`) e o aluno acessa **apenas o próprio**
  (`/aluno/boletim`, resolvido pelo e-mail da sessão).
- Relatórios agregados (`/relatorios`) são restritos ao **administrador**.
- Mural e recados (`/mural`) são operados pelo administrador/professor:
  publicações coletivas (turma ou instituição) e comunicados individuais
  (**recado** ao aluno e **observação** privada). O administrador publica para
  qualquer turma ou para **toda a instituição** e vê todos os feeds; o professor
  publica apenas para as suas turmas, edita/arquiva as próprias publicações e
  envia recados aos alunos das suas turmas. O detalhe da turma também traz o
  **mural da turma** (destino fixo na turma). O aluno acessa
  `/aluno/mural` e vê apenas as publicações vigentes da sua turma (mais as
  institucionais) e os **próprios recados** — nunca observações privadas nem
  publicações de outras turmas. Sem envio de mensagem aluno→aluno. No Supabase, o
  escopo é reforçado por RLS (migração `0004`). As **fotos** do mural ficam no
  bucket `mural-publicacoes` do Storage: leitura pública (para o feed), mas
  **envio/remoção apenas pela equipe** (política na migração `0005`, via
  `public.eh_equipe()`).
- Agenda (`/agenda`) é operada pelo administrador/professor: criam, editam e
  removem eventos escolares para uma turma específica ou para **toda a
  instituição** (`turmaId` nulo). O aluno acessa `/aluno/agenda` e vê apenas os
  eventos da sua turma e os da escola. No Supabase, o escopo é reforçado por RLS
  (migração `0006`).
- Gamificação/RF-015: o **administrador** define as ações de gamificação em
  `/gamificacao/acoes` (criar/editar/ativar/desativar/excluir, auditado); o
  **administrador/professor** usa `/pontuar` para conceder XP a um ou mais alunos
  e para **estornar** lançamentos (correção auditada, sem exclusão silenciosa); o
  **aluno** acessa `/aluno/gamificacao` e vê apenas o próprio XP, nível, progresso
  e histórico (resolvido pelo e-mail da sessão). No Supabase, o escopo é reforçado
  por RLS (migração `0007`): leitura pela equipe ou pelo próprio aluno, escrita de
  XP apenas pela equipe e exclusão apenas pelo admin; a equipe só pode atualizar
  `xp`/`moedas` no aluno (política + trigger `proteger_alunos_exceto_xp`).
- Equipes/RF-017: o **administrador/professor** gerencia as equipes por
  turma/período em `/gamificacao/equipes` (CRUD da equipe), associa e remove
  alunos (**vínculos com vigência**, auditados) e vê os integrantes atuais na
  próprio lista de equipes e no modal de integrantes. O professor também pode
  usar o **sorteio automático**, que distribui apenas alunos ativos e sem equipe
  entre as equipes ativas do contexto, equilibrando os tamanhos. A remoção encerra o
  vínculo sem apagar o XP conquistado. A tela opera sempre na turma do contexto
  (quando aberta a partir da turma/disciplina) e no período letivo ativo; o
  seletor do modal lista apenas alunos ativos da turma. O aluno não acessa a
  tela de equipes. No
  Supabase, a leitura e a escrita de `equipes`/`equipe_membros` são reforçadas
  por RLS para o admin e para o professor das turmas que administra
  (migrações `0011_equipes_permitir_professor.sql` e
  `0013_equipes_membros_permitir_professor.sql`).
- Exportação CSV respeita o mesmo escopo de acesso da tela: boletim (equipe e o
  próprio aluno) e listas de alunos/turmas/professores e relatórios (equipe/admin,
  conforme a tela). Toda exportação de dados sensíveis registra evento de
  auditoria.

### Isolamento por instituição (tenant)

Todo registro carrega `institutionId`; as leituras já são filtradas pela
instituição ativa na camada de dados e as escritas não afetam outras
instituições. No mock, o tenant ativo é uma instituição padrão (`TenantService`).
**No backend, esse isolamento deve ser reforçado por RLS** (ver ADR 0005) — não
confiar apenas no frontend.

## Alvo (a implementar)

Conforme a matriz da especificação (autorização no backend):

- Professor acessa **apenas** turmas/disciplinas com vínculo.
- Aluno vê **apenas** os próprios dados (notas, frequência, boletim, agenda,
  recados, missões, conquistas) e resgata recompensas quando elegível.
- Administrador gerencia cadastros, vínculos e relatórios agregados, sem ver
  senhas nem dados de outra instituição.

A implementação real deve incluir testes de isolamento (ver cenários de
segurança da especificação §15.2).


---

## Adendo — Matriz de escopo docente por turma e disciplina

A matriz de rotas por papel existente deve ser complementada por autorização contextual. Ter papel `professor` não concede acesso a todas as turmas ou disciplinas.

| Ação | Escopo | Regra para professor |
|---|---|---|
| Ver painel | Vínculos ativos do próprio professor | Permitido |
| Abrir visão geral da turma | Turma vinculada | Permitido para dados gerais autorizados |
| Ver equipe docente e disciplinas ofertadas | Turma vinculada | Consulta |
| Ver lista de alunos | Turma vinculada | Consulta conforme política escolar |
| Ver indicador agregado de desempenho | Turma/período | Somente se autorizado; sem revelar notas individuais de outras disciplinas |
| Criar/editar avaliação | Turma + disciplina + período | Somente com vínculo docente ativo nessa combinação e período aberto |
| Lançar/alterar notas | Avaliação + turma + disciplina + período | Somente com vínculo ativo e permissão operacional |
| Publicar conteúdo ou mural disciplinar | Turma + disciplina | Somente na disciplina vinculada |
| Publicar comunicado geral da turma | Turma | Exige permissão específica da instituição; não presumir por ser professor |
| Registrar frequência | Aula/turma ou turma + disciplina | Conforme política escolar e vínculo/permissão |
| Gerenciar matrícula, turma ou equipe docente | Instituição/turma | Negado por padrão; reservado à administração ou permissão explícita |
| Consultar notas individuais de outra disciplina | Outra disciplina | Negado, salvo autorização institucional explícita |

### Regras de implementação
- Verificar autorização em todas as operações de leitura e escrita sensíveis, não só no guard/HTML.
- A seleção de contexto no frontend não concede permissão.
- IDs enviados pelo cliente devem ser validados contra instituição, vínculo docente, turma, disciplina e período.
- As políticas RLS devem impedir acesso cruzado entre instituições e entre disciplinas quando aplicável.
- Testar tentativas diretas via API/cliente, além de testar botões e rotas.
