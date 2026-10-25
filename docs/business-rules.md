# Regras de negócio

Documento de regras de negócio. Distingue regras **já implementadas** de regras
**transversais obrigatórias** a seguir nas próximas fases.

## Implementado

- **Sessão (mock):** sessão tem tempo de expiração (8h); sessão expirada é
  descartada ao restaurar. Contas e credenciais são sintéticas (ver ADR 0002).
- **Autorização por papel (UX):** rotas internas exigem sessão; rotas da equipe
  docente e da área do aluno são separadas por papel.
- **Rota inicial por papel:** administrador/professor → `/dashboard`; aluno →
  `/aluno/inicio`.
- **Importação de alunos:** mapeamento de colunas, com criação automática de
  turmas conforme implementado em `alunos/`; cada importação registra evento de
  auditoria (`aluno.importado`) com a quantidade de alunos e turmas criados.
- **Instituição e período letivo (RF-002):** dados básicos da instituição e fuso
  horário; períodos com nome, datas e status. Um **único período ativo**
  (ativar outro encerra o anterior). Datas inválidas e **sobreposição** entre
  períodos são bloqueadas. Etapas (bimestre/trimestre/semestre/etapa) devem
  ficar dentro do período e não se sobrepor. Períodos `ativo`/`encerrado` não
  podem ser excluídos — preservação de histórico. Alterações críticas geram
  **auditoria** (ator, ação, entidade, referência, timestamp).
- **Disciplinas e vínculos (RF-007):** disciplina tem nome único, código único
  (gerado a partir do nome quando não informado), cor e carga horária não
  negativa; pode ser ativada/inativada. A turma oferta um conjunto de
  disciplinas. O vínculo docente associa **professor × turma × disciplina**, é
  único (sem repetição da mesma combinação) e auditado ao criar/remover.
- **RF-005 (matrículas):** cada matrícula identifica `alunoId`, `turmaId`,
  `periodoLetivoId`, `status` (`ativa|transferida|encerrada`), `inicioEm`,
  `fimEm` e `motivoSaida`; não permite duplicação de matrícula **ativa** no
  mesmo aluno/turma; transferência arquiva a vigente (status `transferida`,
  `fimEm` e motivo) e cria nova ativa (mantém **histórico completo**);
  desmatriculação encerra matrículas ativas com `fimEm` e motivo, sempre
  preservando o passado (RN-003 — nunca excluir fisicamente).
- **Isolamento por instituição (tenant-ready):** todo dado carrega
  `institutionId`; leituras são filtradas pela instituição ativa e escritas não
  afetam outras instituições. Um usuário pode ter vínculos em **várias escolas**;
  a escola ativa é escolhida no login (`/selecionar-escola`) ou trocada no shell,
  e as funções `auth_*` no banco resolvem a escola ativa (migrations `0019` e
  `0020`). O login e a seleção recusam escolas inativas; o RLS também bloqueia
  seus dados para sessões já abertas. Sem escola ativa, com mais de um vínculo,
  a RLS bloqueia os dados. Links públicos usam `/e/:slug`; o slug identifica o
  contexto da escola, não autentica o usuário (ADR 0006).
- **Contratação pública de plano:** em `/contratar`, a pessoa escolhe um plano
  ativo e informa os dados da escola e do primeiro administrador. A Edge
  Function valida o plano, cria escola, conta de Auth, vínculo de administrador
  e funcionalidades associadas ao plano; em caso de erro, tenta remover os
  registros criados. O fluxo não processa nem confirma pagamento.
- **RF-010 (frequência):** cada nova chamada registra turma, data e disciplina
  da aula. Chamadas gerais antigas (disciplina nula) são preservadas. Estados:
  `presente`, `falta`, `falta_justificada`. Não há duas chamadas para o mesmo
  turma/data/disciplina (o salvamento faz _upsert_). O percentual é
  `presenças computáveis ÷ registros válidos × 100`, sem registros = "Sem
  registros" (nunca 0%). A instituição define a **frequência mínima** (%) para
  alertas e se **falta justificada abona** (conta como presença computável).
  Toda chamada é auditada.
- **Horário semanal da turma:** o administrador monta uma grade visual de
  segunda a sexta, define o início do primeiro período e a duração padrão da
  aula, adiciona ou remove linhas de aula e pausas, e atribui disciplina e
  quantidade de períodos consecutivos diretamente às células. Uma aula dupla
  ocupa duas células; pausas não podem ser atravessadas. Professores vinculados
  consultam a grade. A chamada mostra as aulas previstas como referência, sem
  impedir exceções ou trocas.
- **RF-011 (avaliações e notas):** a avaliação pertence a turma, disciplina e
  período (etapa e data opcionais) e define nota máxima (padrão 10) e peso
  (padrão 1). Nota em branco é **"não lançada"** e nunca vira zero; nota acima
  da máxima ou negativa é rejeitada. O status é `rascunho|publicada|arquivada`;
  avaliações arquivadas não entram na média. A média é **ponderada quando há
  pesos diferentes de 1** e **aritmética caso contrário**, com arredondamento
  configurável pela instituição (nota máxima, média mínima e casas decimais). O
  período **encerrado bloqueia** criar/editar/lançar notas até ser reaberto.
   Criar/editar, lançar notas e mudar status geram eventos de auditoria.
- **RF-013 (boletim):** o boletim consolida, por disciplina e período, a média do
  aluno, a frequência e a situação, conforme as regras da instituição (média
  mínima, frequência mínima e abono de falta justificada). Situações:
  `aprovado`, `recuperacao` (média abaixo da mínima), `reprovado` (frequência
  abaixo da mínima, mesmo com média alta) e `sem_dados` (sem notas lançadas).
  "Não lançado" e "sem registros" aparecem como tais, nunca como zero. A
  frequência de uma disciplina considera chamadas globais (`disciplinaId` nulo)
  e específicas da disciplina. O documento exibe cabeçalho com aluno, turma,
  instituição, período e data de emissão, é impresso em A4 (sem cortar linhas) e
  **não inclui observações privadas**. O aluno acessa apenas o próprio boletim;
  a equipe acessa por aluno.
- **RF-014 (relatórios):** restritos ao **administrador** (`/relatorios`). Reusam
  as mesmas fórmulas do app: a **frequência** usa `calcularResumoFrequencia`
  (presenças computáveis ÷ registros, com abono de falta justificada conforme a
  instituição) e o **desempenho** usa `calcularMediaAluno` (ponderada quando há
  pesos, arquivadas fora e notas não lançadas ignoradas). Os relatórios por turma
  e período marcam **alunos abaixo do limite de frequência** e **abaixo da média
  mínima**; o relatório de **avaliações pendentes** lista avaliações não
  arquivadas com notas ainda sem lançamento. O **resumo institucional** agrega os
  indicadores do período e mostra data de geração e a regra de cálculo, com
  valores "sem registros"/"não lançado" tratados como tais. A **exportação CSV**
  usa delimitador `;`, BOM UTF-8 e neutraliza fórmulas perigosas (`=`, `+`, `-`,
  `@`) para reduzir risco de CSV injection.
- **RF-025 (exportação e impressão):** a central `ExportacaoService` concentra a
  serialização e o download de CSV (delimitador `;`, BOM UTF-8, escaping e
  neutralização de fórmulas). A exportação existe no boletim e nas listas de
  alunos, turmas e professores, sempre **respeitando o escopo de acesso e os
  filtros da tela**; boletim e relatórios também podem ser **impressos/gerados em
  PDF** (layout A4, ocultando navegação e controles). Toda exportação de dados
  sensíveis registra evento de auditoria (`relatorio.exportado`,
  `boletim.exportado`, `aluno.exportado`, `turma.exportado`,
  `professor.exportado`).
- **RF-008 (painel do professor):** a rota `/dashboard` é sensível ao papel —
  administradores veem a visão geral do sistema e professores veem o **painel
  docente** da própria turma (turmas vêm de `Turma.professorIds` e dos vínculos
  docentes). Indicadores derivam dos dados existentes (alunos ativos, frequência
  média e média de desempenho do período, alunos em atenção) e **nunca exibem
  números artificiais**: sem dados, mostram estado vazio. Cada indicador traz a
  definição do cálculo e atalhos para chamada, notas e alunos.
- **RF-022 (mural e recados):** o **mural** é apresentado como um **feed** de
  publicações coletivas de uma turma ou de toda a instituição (`turmaId` nulo =
  institucional), com título, texto, **foto opcional** (JPG/PNG/WEBP/GIF até 5 MB,
  compactada no navegador antes do envio), data de publicação e expiração
  opcional; a
  publicação pode ser editada, **arquivada** (some do aluno) ou restaurada,
  sempre com autoria. O feed é reutilizado no detalhe da turma e na visão do
  aluno. **Somente o administrador publica para toda a instituição**; o professor
  publica para as suas turmas. O feed permite filtrar por escopo (tudo / escola
  toda / turma) e pelas próprias publicações. O aluno vê apenas as publicações
  **vigentes** (publicadas e não expiradas) da sua turma mais as institucionais,
  podendo alternar o filtro entre elas. Os **comunicados** são individuais e
  privados:
  **recado** é visível ao próprio aluno; **observação** é privada e só a equipe
  vê — observações privadas nunca aparecem para o aluno, no boletim ou em
  exportações. O conteúdo é **sanitizado** e exibido apenas como texto (sem
  HTML/script, sem `innerHTML`). Não há chat em tempo real nem mensagem
  aluno→aluno. Criar/editar/arquivar publicações e enviar/remover comunicados
  geram eventos de auditoria.
- **RF-023 (agenda):** a agenda reúne **eventos escolares** de tipos `aula`,
  `avaliacao`, `entrega`, `atividade` e `aviso`, cada um com título, descrição,
  data-hora e turma-alvo opcional (`turmaId` nulo = toda a escola). Os eventos são
  listados em **ordem cronológica** e podem ser filtrados por **escopo** (tudo /
  escola toda / turma) e por **período** (próximos / semana / mês / todos);
  eventos passados permanecem no **histórico** (consultáveis). O sistema **bloqueia
  eventos duplicados** (mesmo título, tipo e data-hora). A data-hora é exibida no
  **fuso local** do usuário, sem deslocamento inesperado. O aluno vê apenas os
  eventos da sua turma e os da escola. Criar/editar/remover eventos — inclusive em
  cascata ao excluir turmas — geram eventos de auditoria.
- **RF-015 (ações e XP):** o administrador (ou perfil autorizado) define **ações
  de gamificação** com nome, ícone, **valor de XP**, indicador associado e status;
  o professor seleciona **um ou mais alunos** e registra a ação. O valor de XP é
  limitado pelo máximo configurável (e, quando negativo, pelo limite negativo),
  e ações inativas não pontuam. Antes de confirmar, o sistema mostra o **preview**
  dos alunos afetados e do total de XP. O **nível** do aluno deriva de fórmula
  documentada e configurável (`nivelPorXp`), e o XP do aluno **nunca** fica
  negativo. O registro é **idempotente**: duplo clique, reenvio ou rede instável
  **não** concedem XP duplicado (chave de idempotência por aluno/lote). Correções
  são feitas por **estorno auditado** (`origem: estorno`), nunca por exclusão
  silenciosa; estorno duplo e estorno-de-estorno são bloqueados. Cada concessão
  (`xp.concedido`) e estorno (`xp.estornado`) gera evento de auditoria. **XP não
  é nota:** a gamificação **nunca** cria ou altera nota, frequência ou aprovação
  (ver Transversais 1 e 7). O aluno acompanha XP, nível, progresso e histórico em
  `/aluno/gamificacao`. A gamificação pode ser desativada por instituição/turma
  em fase futura.
- **Exclusão em massa (demonstração):** as telas de cadastro e a **Zona de
  perigo** (admin) permitem excluir todos os registros de um tipo ou todos os
  dados, exigindo digitar `EXCLUIR` (e `EXCLUIR TUDO` para o apagamento total).
  A exclusão é **em cascata** (`DadosService`): remove matrículas, vínculos e
  referências relacionadas, sem deixar dados órfãos. É uma exceção deliberada de
  demonstração à preservação de histórico (RN-003) e não existe no fluxo normal.

## Transversais (obrigatórias nas próximas fases)

1. **Separação de conceitos:** nota acadêmica, frequência, XP, nível, moedas,
   ponto de equipe, ponto extra, conquista e recompensa são distintos. Nunca
   reutilizar o mesmo campo/serviço para conceitos diferentes.
2. **Contexto obrigatório:** operações acadêmicas incluem turma, período e (quando
   aplicável) disciplina; validar no backend.
3. **Histórico:** mudanças de turma, professor, matrícula, nota e frequência não
   apagam o passado (arquivamento/vigência).
4. **Datas e fusos:** timestamps de auditoria em UTC; datas de aula como datas
   locais, sem deslocamento inesperado.
5. **Cálculos centralizados:** médias, frequência, níveis e elegibilidade em
   funções/serviços testáveis; relatórios mostram a fórmula usada.
6. **Regras configuráveis:** média mínima, frequência mínima, escala de nota,
   fórmula de média, arredondamento, faltas justificadas, curva de níveis e
   visibilidade de ranking **não** são números mágicos.
7. **XP não altera notas.** Gamificação não cria/altera registro acadêmico.
8. **Moedas:** saldo interno, histórico auditável, sem saldo negativo sem regra
   explícita.
9. **Privacidade por padrão:** dados individuais e observações privadas não
   aparecem em ranking/projeção/mural/exportação coletiva sem permissão.
10. **Consistência transacional:** resgates/debêntos de moedas e lançamentos
    críticos devem ser atômicos no backend.
11. **Exclusão:** preferir arquivamento/inativação; exclusão definitiva é
    excepcional, autorizada e auditada.

## Pendências de decisão (spec §19)

Backend definitivo, provedor de autenticação, fórmula de média e escala,
tratamento de faltas justificadas, política de edição após fechamento de
período, política de ranking, regras de XP/moedas e tipos de recompensa. Adotar
provisoriamente a alternativa mais segura e reversível, registrando em ADR.


---

## Adendo — Regras para visão geral da turma e operação por disciplina

- A turma é um grupo de alunos; não equivale a uma disciplina.
- A matrícula aluno-turma-período determina a composição da turma.
- O vínculo professor-turma-disciplina determina o escopo de atuação pedagógica do professor.
- O professor abre primeiro a visão geral da turma. Essa tela é principalmente de consulta e não concede, por si só, permissão administrativa sobre matrículas ou configurações.
- O professor só pode operar em disciplinas ofertadas na turma para as quais possui vínculo docente ativo.
- Avaliações e notas pertencem à combinação turma-disciplina-período; o professor só pode criar, editar ou lançar notas se estiver autorizado nessa combinação e o período permitir alterações.
- Indicadores gerais (por exemplo, média geral da turma) são agregados e somente leitura, se autorizados pela política da instituição. Não permitem consultar notas individuais de disciplinas sem vínculo.
- Mural deve distinguir publicação geral da turma e publicação de disciplina. O professor só publica no escopo permitido pela política de permissões; não presumir acesso geral para todos os professores.
- Frequência segue a configuração escolar: geral por aula ou por disciplina. Uma chamada geral não deve ser duplicada para cada disciplina.
- Mudanças de turma/disciplina/período devem atualizar os dados dependentes e impedir gravação no contexto anterior.
- A autorização é validada no backend/banco (incluindo RLS quando aplicável), nunca apenas por controles de interface ou estado local.
- Dados ausentes não equivalem a zero; indicadores devem usar “Sem dados”/estado vazio quando não houver base suficiente.
