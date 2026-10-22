# Especificação de Requisitos --- Sistema de Gestão Escolar turmaLina

**Documento de produto, requisitos, UX, arquitetura e plano de
entrega**\
**Versão:** 1.0\
**Data:** 13/10/2026\
**Público-alvo:** Big Pickle (IA implementadora), Product Owner, Tech
Lead, UX/UI e QA\
**Stack obrigatória:** Angular 20, TypeScript, arquitetura modular; UI
Kit em biblioteca separada\
**Objetivo principal:** construir um sistema de gestão escolar centrado
na rotina do professor e no acompanhamento do aluno, reproduzindo os
fluxos e a proposta visual/funcional do HTML de referência, mas com
arquitetura sustentável, segurança real e separação clara entre produto
e componentes visuais.

------------------------------------------------------------------------

## 1. Instruções principais para a IA implementadora

Implemente um **sistema de gestão escolar funcional**, inspirado no
arquivo HTML de referência `turmaLina_conquistas_album-28.html`. Não
faça apenas uma landing page, um protótipo navegável ou telas com dados
estáticos. O produto deve ter navegação real, formulários validados,
regras de negócio centralizadas, persistência, controle de acesso,
estados de carregamento/erro/vazio e testes.

### 1.1 Prioridades de implementação

1.  **Gestão escolar e rotina docente em primeiro lugar:** turmas,
    alunos, disciplinas, frequência, avaliações/notas, relatórios e
    comunicação.
2.  **Gamificação como módulo integrado:** XP, níveis, moedas virtuais,
    equipes, ações positivas, missões, conquistas e loja de recompensas.
3.  **Experiência do aluno:** visão simplificada e segura do próprio
    progresso, frequência, notas/boletim, conquistas, missões, agenda e
    recados.
4.  **Administração:** gerenciamento de professores, turmas,
    disciplinas, períodos letivos, configurações e visão geral.
5.  **UI Kit separado:** criar uma biblioteca reutilizável de
    componentes Angular, independente das regras do sistema, com
    potencial de evolução para uma biblioteca interna no estilo de
    bibliotecas maduras como NG-ZORRO.
6.  **Segurança e integridade dos dados:** permissões verificadas no
    backend/Banco de dados; esconder botões no frontend não é
    autorização.
7.  **Entrega incremental:** construir primeiro um MVP coerente e
    utilizável; não deixar módulos críticos como telas decorativas.

### 1.2 Como usar o HTML de referência

O HTML de referência reúne em um arquivo só estilos, marcação, estado,
lógica de negócio e persistência de demonstração. Use-o como
**referência de funcionalidades, linguagem visual, conteúdo,
terminologia e jornadas**, não como arquitetura a copiar. Preserve a
identidade amigável, visual leve, cards, cores, ícones, feedbacks,
medalhas, indicadores e experiência responsiva sempre que fizer sentido.

O protótipo apresenta, entre outras áreas: painel, placar, pontuação,
presença, notas, relatórios, metas, missões, conquistas/álbum,
mural/feed, agenda, perfil do aluno, loja de recompensas, boletim
imprimível/PDF, importação de alunos e telas de gestão. Os acessos de
demonstração do protótipo **não equivalem a autenticação real**. Na
aplicação final, implemente identidade, sessão, autorização e isolamento
dos dados de verdade.

### 1.3 Regras de execução para a IA

-   Antes de criar código, inspecione o repositório existente, o
    `package.json`, a versão do Angular, o roteamento, os padrões, os
    testes, o lint e a infraestrutura já adotada.
-   Não substitua configurações existentes sem justificar e sem
    preservar funcionalidades.
-   Se o repositório estiver vazio, inicialize uma aplicação Angular 20
    organizada e pronta para crescer.
-   Não invente APIs, variáveis de ambiente, tabelas ou endpoints que
    não existam sem documentar a decisão.
-   Se não houver backend definido, implemente uma camada de acesso a
    dados abstrata e proponha Supabase como opção de backend, mas
    mantenha a UI e os casos de uso independentes do fornecedor.
-   Não use `localStorage` como banco de dados principal de informações
    escolares. Pode ser usado para preferências não sensíveis, como
    tema, densidade visual e último filtro.
-   Não colocar credenciais, chaves privadas, tokens administrativos ou
    segredos no bundle Angular.
-   Nunca confiar em dados de perfil, papel ou IDs enviados pelo cliente
    sem validação no backend.
-   Toda funcionalidade deve incluir estados de carregamento, sucesso,
    erro, vazio e confirmação quando aplicável.
-   Não gerar uma única página gigante, um único componente para todo o
    sistema ou lógica de negócio espalhada pelos templates.
-   Não duplicar componentes do produto dentro do UI Kit.
-   Não usar `any` sem necessidade justificada; preferir tipos
    explícitos, `strict` e modelos bem definidos.
-   Criar documentação de decisões técnicas, comandos para rodar,
    configuração de ambiente, testes e limitações conhecidas.
-   Quando faltar uma decisão de negócio essencial, registrar a dúvida e
    adotar provisoriamente a alternativa mais segura e reversível; não
    bloquear toda a implementação por dúvidas cosméticas.

------------------------------------------------------------------------

## 2. Visão do produto

### 2.1 Problema a resolver

Professores precisam administrar turmas e alunos, registrar frequência e
notas, acompanhar evolução, reconhecer comportamentos positivos e
comunicar informações sem depender de planilhas e ferramentas
desconectadas. Alunos precisam entender o próprio desempenho, visualizar
conquistas e receber orientações de forma simples. A gestão precisa
manter cadastros e configurações consistentes, além de acompanhar
indicadores agregados.

### 2.2 Visão

O **turmaLina** será uma aplicação responsiva de gestão escolar com uma
experiência docente simples e rápida, combinando ferramentas acadêmicas
essenciais com gamificação educativa. A gamificação deve apoiar
engajamento e reconhecimento, sem substituir notas, frequência ou
avaliação pedagógica formal.

### 2.3 Objetivos

-   Reduzir o tempo para executar tarefas frequentes em sala de aula.
-   Centralizar dados de turmas, alunos, disciplinas, presença e
    avaliações.
-   Permitir acompanhamento individual e coletivo com indicadores
    compreensíveis.
-   Tornar a comunicação professor--aluno organizada e rastreável.
-   Incentivar participação com metas, XP, níveis, conquistas e
    recompensas configuráveis.
-   Disponibilizar boletins e relatórios que possam ser consultados e
    exportados.
-   Permitir evolução futura sem reescrever a camada visual ou acoplar
    telas a um único backend.

### 2.4 Fora de escopo inicial

-   Folha de pagamento, contabilidade, emissão fiscal e cobrança de
    mensalidades.
-   Matrícula online pública, captação comercial e CRM.
-   Integração oficial com sistemas governamentais ou diários oficiais.
-   Videoconferência, LMS completo, provas online com antifraude ou
    correção automática avançada.
-   Aplicativo nativo iOS/Android; a primeira entrega será web
    responsiva. PWA pode ser habilitada, sem prometer operação offline
    completa.
-   Inteligência artificial para atribuir notas, diagnosticar alunos ou
    tomar decisões pedagógicas automaticamente.
-   Ranking público na internet. Informações de desempenho são privadas
    por padrão.

Esses itens podem entrar em roadmap futuro, após validação de uso e
requisitos legais.

------------------------------------------------------------------------

## 3. Perfis, papéis e permissões

A autorização deve ser implementada por **papel + escopo de acesso +
vínculo com a turma/disciplina**. Uma pessoa pode ter mais de um
vínculo, mas deve atuar com o contexto selecionado.

### 3.1 Papéis iniciais

#### A. Administrador da instituição

Pode: - Criar e editar dados institucionais e períodos letivos. -
Gerenciar professores, turmas, disciplinas, matrículas e vínculos. -
Definir parâmetros acadêmicos e gamificação global. - Consultar
relatórios agregados de toda a instituição. - Desativar acessos e
corrigir cadastros, com registro de auditoria.

Não deve: - Apagar definitivamente registros acadêmicos históricos sem
fluxo especial de retenção e auditoria. - Ver ou alterar senhas dos
usuários. - Consultar dados de outra instituição/tenant.

#### B. Professor

Pode: - Acessar apenas as turmas e disciplinas para as quais possui
vínculo. - Consultar os alunos de suas turmas. - Registrar e editar
frequência conforme regras de período e permissão. - Criar avaliações e
lançar/editar notas. - Registrar observações privadas pedagógicas,
recados destinados ao aluno e publicações para sua turma. - Gerenciar
ações de gamificação, missões e conquistas conforme configuração. -
Consultar boletins e relatórios de suas turmas. - Importar alunos apenas
nas turmas que pode administrar, se autorizado.

Não pode: - Acessar turmas ou dados de outras turmas sem vínculo. -
Alterar parâmetros institucionais exclusivos da gestão. - Ver
observações privadas de professores diferentes, salvo permissão
explícita de gestão. - Editar notas/frequência de período encerrado sem
reabertura autorizada.

#### C. Aluno

Pode: - Ver somente seu próprio perfil. - Consultar notas, frequência,
boletim, agenda, recados, missões e conquistas liberadas. - Consultar
saldo de moedas e histórico de resgates. - Resgatar recompensas quando
elegível.

Não pode: - Alterar notas, frequência, XP, moedas, conquistas ou dados
acadêmicos. - Consultar observações internas do professor. - Ver dados
pessoais ou notas de outros alunos. - Criar ou excluir recados enviados
pelo professor.

#### D. Futuro: responsável

Não é obrigatório no MVP. Se implementado, deverá acessar apenas os
alunos vinculados e as informações explicitamente autorizadas para
responsáveis. Não reutilizar o papel de aluno.

### 3.2 Matriz resumida de autorização

  -------------------------------------------------------------------------
  Recurso            Administrador      Professor         Aluno
                                        vinculado         
  ------------------ ------------------ ----------------- -----------------
  Configuração       CRUD autorizado    Leitura limitada  Não
  institucional                                           

  Usuários e papéis  Gerencia           Não               Não

  Turmas             Todas na           Turmas vinculadas Apenas
                     instituição                          turma/contexto
                                                          próprio permitido

  Cadastro de aluno  Gerencia           Conforme          Não
                                        permissão da      
                                        turma             

  Frequência         Consulta/gestão    Registra nas      Somente leitura
                     autorizada         turmas vinculadas própria

  Avaliações/notas   Consulta e         Registra nas      Somente leitura
                     correções          disciplinas       própria
                     autorizadas        vinculadas        

  Observações        Conforme política  Apenas as         Não
  privadas           institucional      próprias ou       
                                        autorizadas       

  Recados            Auditoria/gestão   Envia para        Lê os próprios
                     conforme política  alunos/turmas     
                                        vinculados        

  Gamificação        Configura          Opera no escopo   Consulta e
                     políticas globais  autorizado        resgata conforme
                                                          regra

  Relatórios         Agregados          Suas turmas       Relatórios
                     institucionais                       individuais
                                                          próprios

  Auditoria          Consulta conforme  Ações próprias    Não
                     permissão          quando aplicável  
  -------------------------------------------------------------------------

A matriz deverá ser refinada por política de acesso no backend. Cada
caso de uso precisa validar o escopo, não apenas o papel.

------------------------------------------------------------------------

## 4. Arquitetura funcional / módulos

1.  **Autenticação e sessão**
2.  **Instituição e configurações**
3.  **Professores e usuários**
4.  **Turmas e matrículas**
5.  **Alunos e perfis**
6.  **Disciplinas e períodos letivos**
7.  **Painel e indicadores**
8.  **Frequência**
9.  **Avaliações e notas**
10. **Boletim**
11. **Relatórios**
12. **Gamificação: ações, XP, níveis e moedas**
13. **Equipes**
14. **Missões e metas**
15. **Conquistas e álbum**
16. **Loja e resgate de recompensas**
17. **Mural/feed e recados**
18. **Agenda**
19. **Importação/exportação**
20. **Tela de projeção/placar**
21. **Auditoria e histórico**
22. **UI Kit compartilhado**

Cada módulo deve ter componentes de interface, modelos, serviços de
aplicação, validações e testes próprios. A regra de negócio não deve
depender diretamente de componentes visuais.

------------------------------------------------------------------------

## 5. Navegação e experiência

### 5.1 Navegação do professor

A aplicação deve oferecer navegação consistente com: - Seletor de
turma/contexto. - Nome da turma e resumo de contexto. - Seletor de
disciplina quando aplicável. - Seletor de período letivo/bimestre. -
Menu principal com acesso às rotinas de trabalho. - Perfil e
encerramento de sessão. - Indicadores ou badges de itens pendentes
quando houver informação confiável.

Sugestão de áreas principais: - **Painel** - **Alunos / Placar** -
**Pontuar** - **Presença** - **Notas** - **Relatórios** -
**Gamificação** (metas, missões, conquistas, equipes) - **Mural** -
**Agenda** - **Configurações da turma**

Em telas pequenas, usar navegação compacta, sem esconder ações
essenciais em menus difíceis de descobrir. O menu pode agrupar módulos
secundários, mas presença e notas devem continuar fáceis de acessar.

### 5.2 Navegação do aluno

-   Início / resumo
-   Meu desempenho
-   Meu boletim
-   Frequência
-   Missões
-   Álbum de conquistas
-   Loja de recompensas
-   Agenda
-   Recados

A interface do aluno deve usar linguagem simples, hierarquia visual
clara e não expor informações internas da equipe docente.

### 5.3 Navegação da gestão

-   Visão geral
-   Períodos letivos
-   Turmas
-   Alunos/matrículas
-   Professores
-   Disciplinas
-   Parâmetros acadêmicos
-   Configurações de gamificação
-   Relatórios institucionais
-   Auditoria

### 5.4 Padrões de UX

-   Priorizar tarefas recorrentes com poucos passos e áreas de toque
    adequadas.
-   Confirmar operações destrutivas ou de alto impacto.
-   Mostrar claramente turma, disciplina, data e período que estão sendo
    editados.
-   Preservar filtros ao abrir um aluno e retornar à lista.
-   Em operações em lote, mostrar quantidade de pessoas afetadas antes
    de confirmar.
-   Nunca comunicar sucesso antes da persistência confirmar.
-   Informar quando não há dados e orientar a próxima ação.
-   Não depender apenas de cor para indicar presença, aprovação, erro ou
    status.
-   Exibir mensagens de erro acionáveis, sem stack traces ou detalhes
    técnicos para o usuário.
-   Usar skeleton/loading para consultas e desabilitar submissão
    duplicada.
-   Prever estados de conexão lenta, sessão expirada e falha de
    gravação.

------------------------------------------------------------------------

## 6. Requisitos funcionais detalhados

Prioridades: - **P0:** necessário para um MVP utilizável e seguro. -
**P1:** importante para completar a experiência. - **P2:** evolução
posterior.

### RF-001 --- Autenticação e sessão (P0)

-   Permitir login real por provedor escolhido para o projeto.
-   Permitir logout e encerramento de sessão.
-   Restaurar a sessão de forma segura ao recarregar a aplicação.
-   Redirecionar para a área adequada ao papel e ao contexto autorizado.
-   Bloquear rotas protegidas quando não autenticado.
-   Tratar sessão expirada e erros de login.
-   Não oferecer acesso real por botões de demonstração nem confiar em
    papel escolhido pelo usuário.
-   Prever convite/ativação de usuários por administração, conforme
    backend escolhido.
-   Recuperação de acesso deve usar o mecanismo oficial do provedor.

**Critérios de aceite** 1. Usuário não autenticado não consegue abrir
rotas internas diretamente. 2. Alterar manualmente o papel no navegador
não concede privilégios. 3. Após logout, rotas protegidas não podem ser
reabertas usando estado antigo. 4. Falhas de autenticação exibem
mensagem clara sem revelar detalhes sensíveis.

### RF-002 --- Instituição e período letivo (P0/P1)

-   Cadastrar nome e dados básicos da instituição.
-   Criar períodos letivos com nome, data inicial/final e status.
-   Permitir um período ativo por contexto institucional, conforme regra
    configurada.
-   Definir bimestres/trimestres/etapas de avaliação dentro do período.
-   Impedir datas inconsistentes e sobreposições não permitidas.
-   Permitir encerrar/reabrir período apenas a perfis autorizados,
    registrando auditoria.
-   Preservar histórico de períodos encerrados.

**Aceite:** nenhuma nota ou frequência deve ser lançada silenciosamente
no período errado; o contexto atual precisa estar visível.

### RF-003 --- Cadastro e gestão de turmas (P0)

-   Criar, consultar, editar e arquivar turmas.
-   Campos mínimos: nome, período letivo, série/ano opcional, turno
    opcional, status e descrição opcional.
-   Associar disciplinas e professores à turma.
-   Permitir seleção da turma ativa pelo professor.
-   Mostrar quantidade de alunos e resumo acadêmico quando houver dados
    suficientes.
-   Impedir exclusão física de turma que possua histórico; preferir
    arquivamento.
-   A troca de turma deve atualizar todos os dados apresentados no
    contexto.

**Aceite:** um professor não pode selecionar uma turma à qual não esteja
vinculado.

### RF-004 --- Cadastro de professores e vínculos (P0/P1)

-   Criar ou convidar professor.
-   Associar usuário a uma ou mais turmas e disciplinas.
-   Definir permissões operacionais de forma explícita.
-   Permitir desativação sem apagar o histórico.
-   Exibir vínculo atual no seletor de contexto.
-   Não permitir que um professor se conceda privilégios.

### RF-005 --- Cadastro de alunos e matrículas (P0)

-   Criar, editar, consultar e arquivar aluno.
-   Campos mínimos: nome completo, identificador interno e status;
    demais dados pessoais só quando necessários e com finalidade
    definida.
-   Matricular aluno em turma e período letivo.
-   Permitir mudança de turma com histórico e data de vigência.
-   Impedir duplicação evidente dentro do mesmo contexto.
-   Permitir atribuição de equipe de gamificação sem alterar matrícula
    acadêmica.
-   Exibir perfil com resumo de notas, frequência, XP, moedas,
    conquistas, missões e recados conforme permissões.
-   Permitir busca por nome e filtros por turma/equipe/status.

**Privacidade:** não coletar CPF, endereço, telefone ou dados sensíveis
sem necessidade comprovada. Em ambiente com menores, definir política de
acesso, retenção, consentimento/base legal e atendimento à LGPD antes da
produção.

### RF-006 --- Importação de alunos (P1)

-   Importar CSV/TSV/TXT com mapeamento de colunas.
-   Oferecer modelo de arquivo para download.
-   Validar o arquivo antes de gravar.
-   Exibir prévia, contagem de registros válidos e inválidos, motivos de
    rejeição e possíveis duplicatas.
-   Permitir cancelar sem alterar dados.
-   Exigir confirmação antes da importação definitiva.
-   Produzir resumo final e arquivo/relatório dos erros, quando
    possível.
-   Não aceitar conteúdo HTML/script como instrução executável.
-   Limitar tamanho de arquivo e quantidade de linhas configuravelmente.

**Aceite:** uma importação inválida não deve criar registros parciais
silenciosamente; se houver processamento parcial, ele deve ser
explicitamente informado e rastreável.

### RF-007 --- Disciplinas e contexto docente (P0)

-   Cadastrar disciplinas.
-   Associar disciplinas às turmas e professores.
-   Selecionar disciplina ativa no contexto do professor.
-   Filtrar notas, avaliações, presença se a política da instituição
    assim definir, pontos extras e relatórios por disciplina.
-   Se frequência for global por aula, não duplicá-la por disciplina;
    essa decisão deve ser configurável e documentada.
-   Evitar que a troca de disciplina misture dados de outra disciplina.

### RF-008 --- Painel do professor (P0)

Mostrar indicadores úteis, de acordo com dados existentes: - total de
alunos ativos na turma; - frequência média no período; - média de
desempenho, apenas quando houver notas suficientes; - alunos em atenção,
com critérios configuráveis; - avaliações próximas ou sem lançamento; -
missões/metas pendentes de validação; - atividades recentes; - atalhos
para chamada, lançamento de notas e pontuação.

Não exibir números artificiais quando não houver dados; usar estado
vazio e orientar como iniciar. Todo indicador deve ter definição clara e
abrir a lista que explica seu cálculo.

### RF-009 --- Placar e perfil individual (P0/P1)

-   Exibir alunos por nome e, opcionalmente, equipe, nível, XP e
    conquistas.
-   Permitir ordenação por nome, XP ou nível.
-   Permitir busca.
-   Abrir perfil individual.
-   Mostrar claramente que XP/nível são gamificação e não nota
    acadêmica.
-   Permitir que a instituição desative rankings ou limite a exposição
    entre alunos.
-   Não criar ranking público fora da instituição.
-   Dar suporte a avatar por iniciais no MVP, sem exigir upload de foto.

### RF-010 --- Registro de frequência (P0)

-   Selecionar turma, data e, quando aplicável, disciplina/aula.
-   Carregar alunos matriculados e o estado previamente salvo.
-   Estados iniciais: **Presente**, **Falta** e **Falta justificada**. A
    instituição poderá configurar outros estados futuramente.
-   Permitir marcar individualmente e aplicar ação em lote (por exemplo,
    marcar todos presentes) com revisão.
-   Salvar chamada e indicar claramente estado salvo/não salvo.
-   Permitir editar chamada conforme janela de correção autorizada.
-   Não permitir duas chamadas duplicadas para a mesma
    turma/data/aula/contexto, salvo regra explícita de múltiplas aulas.
-   Registrar autor, data/hora e alterações relevantes.
-   Calcular frequência e faltas de modo consistente, respeitando aulas
    válidas e justificativas.
-   Exibir alerta quando a frequência ficar abaixo do limite
    institucional configurado.
-   Não tratar uma chamada não realizada como presença ou falta.

**Regra de cálculo recomendada:** percentual = presenças computáveis /
total de aulas válidas registradas × 100. A regra exata para falta
justificada deve ser configurável institucionalmente e visível nos
relatórios. Se não houver chamadas, mostrar "Sem registros", não 0%.

**Aceite** - Reabrir uma chamada já salva recupera os estados
persistidos. - Alterações só são consideradas concluídas após
confirmação do backend. - Relatório mostra o total de aulas usado no
cálculo.

### RF-011 --- Avaliações e notas (P0)

-   Criar, consultar, editar e arquivar avaliações.
-   Campos: nome, disciplina, período/etapa, data opcional, nota máxima,
    peso opcional, status e descrição opcional.
-   Lançar notas em lote por avaliação.
-   Validar que a nota esteja dentro do intervalo permitido.
-   Permitir nota em branco como "não lançada"; não converter
    automaticamente para zero.
-   Permitir edição com controle de acesso e trilha de auditoria.
-   Exibir quantidade de notas lançadas e pendentes.
-   Calcular médias de acordo com a fórmula institucional configurada.
-   Exibir critérios de aprovação e recuperação quando definidos.
-   Bloquear alterações após fechamento do período, exceto com
    reabertura autorizada.
-   Registrar autor e timestamp de alterações críticas.

**Regra importante:** não assumir média aritmética simples como única
regra universal. O MVP deve implementar uma fórmula explícita e
documentada, por exemplo média ponderada quando pesos estiverem
configurados e média aritmética quando não estiverem. A instituição deve
definir nota máxima, média mínima e arredondamento.

### RF-012 --- Pontos extras acadêmicos (P1)

O protótipo permite conceder pontos extras associados a uma avaliação ou
à média do período. No produto real: - separar ponto extra acadêmico de
XP/moeda de gamificação; - exigir permissão específica; - definir
destino, quantidade, justificativa e data; - aplicar limite
configurável; - impedir ultrapassar a nota máxima, salvo regra
institucional explícita; - mostrar histórico de concessão e remoção; -
registrar auditoria; - permitir remoção/correção com justificativa, sem
apagar o evento original do histórico.

Não usar moedas virtuais como pontos de nota.

### RF-013 --- Boletim (P0)

-   Exibir notas e médias por disciplina e período.
-   Exibir frequência e resumo de situação conforme regras da
    instituição.
-   Mostrar "não lançado"/"sem dados" quando aplicável.
-   Permitir impressão e geração de PDF.
-   Identificar aluno, turma, instituição, período de referência e data
    de emissão.
-   Gerar documento com layout legível em A4, sem cortar tabelas.
-   Não incluir observações privadas nem dados que o destinatário não
    possa consultar.
-   Permitir ao aluno consultar apenas o próprio boletim.

### RF-014 --- Relatórios (P0/P1)

Relatórios mínimos: - frequência por turma, aluno, período e data; -
alunos abaixo do limite de frequência; - notas por avaliação, disciplina
e período; - alunos abaixo da média mínima; - avaliações sem lançamento
completo; - resumo individual do aluno; - pontos extras concedidos; -
evolução de XP e conquistas; - resumo agregado institucional para gestão
autorizada.

Requisitos: - filtros visíveis e reproduzíveis; - indicação da data de
geração; - explicação da regra de cálculo; - exportação CSV/PDF quando
apropriado; - respeito ao escopo de autorização; - estados sem dados; -
evitar gráficos enganosos e não misturar métricas acadêmicas com
gamificação.

### RF-015 --- Ações de gamificação e XP (P1)

-   Administrador ou perfil autorizado define ações positivas/negativas
    com nome, ícone/emoji, valor de XP, indicador associado e status.
-   Professor seleciona um ou mais alunos e registra uma ação.
-   Exibir prévia da quantidade de alunos e pontos que serão afetados.
-   Persistir um evento de pontuação com autor, data, ação, aluno e
    valor.
-   Permitir correção por estorno/auditoria, não exclusão silenciosa.
-   Calcular nível a partir de uma fórmula configurável e documentada.
-   Exibir histórico de pontuações.
-   Permitir limite e regras para pontuação negativa, evitando punições
    arbitrárias.
-   Gamificação deve poder ser desligada por instituição/turma.

**Regra:** XP não altera notas, frequência ou aprovação. Uma ação de
gamificação não pode criar nem alterar automaticamente um registro
acadêmico.

### RF-016 --- Moedas virtuais (P1)

-   Moedas são um saldo interno de gamificação, não dinheiro real.
-   Definir claramente quais eventos geram ou consomem moedas.
-   Registrar toda movimentação em um ledger/histórico imutável ou
    auditável.
-   Calcular saldo a partir das movimentações ou manter saldo
    materializado com transação consistente.
-   Impedir saldo negativo, salvo regra deliberada e explicitamente
    aprovada.
-   Não permitir que aluno altere saldo por chamada direta ao backend.
-   Diferenciar XP, moedas, pontos acadêmicos e pontos de equipe.

### RF-017 --- Equipes (P1)

-   Criar equipes com nome, emoji/ícone, cor e status.
-   Associar alunos a equipes dentro de um contexto de turma e período.
-   Permitir transferir aluno entre equipes mantendo histórico de
    pontuação.
-   Exibir placar por equipe com fórmula definida.
-   Definir se o placar usa XP acumulado, XP do período ou outro
    critério.
-   Garantir contraste adequado da cor e não usar cor como único
    identificador.
-   Não permitir duplicidade de associação ativa se a regra for uma
    equipe por aluno.

### RF-018 --- Indicadores e metas (P1)

-   Definir indicadores pedagógicos/gamificados com nome, descrição,
    unidade e regra de contagem.
-   Criar metas que exijam um ou mais indicadores com quantidades
    mínimas.
-   Configurar recompensa em XP/moedas e visibilidade.
-   Avaliar automaticamente se os critérios foram atingidos.
-   Mostrar status: bloqueada/não atingida, disponível para validação,
    concedida ou revogada.
-   Professor autorizado valida e concede a recompensa quando a política
    exigir.
-   Evitar conceder duas vezes a mesma meta para o mesmo aluno/período,
    salvo repetição configurada.
-   Ao corrigir eventos anteriores, recalcular elegibilidade de forma
    previsível e registrar o motivo.
-   Exibir ao aluno os critérios de forma compreensível.

### RF-019 --- Missões (P1)

-   Criar missões com título, descrição, instruções, período de
    validade, público-alvo, critérios, recompensa e status.
-   Associar missão a turma, equipe ou alunos selecionados.
-   Permitir estados: rascunho, publicada, encerrada e arquivada.
-   O aluno vê apenas missões destinadas a ele.
-   Registrar progresso e conclusão.
-   Definir se a conclusão é automática por eventos ou depende de
    validação docente.
-   Evitar recompensas duplicadas em repetição de requisições.
-   Informar quando a missão expirou ou ainda não está disponível.

### RF-020 --- Conquistas e álbum (P1)

-   Administrador/professor autorizado configura conquistas com nome,
    descrição, emoji/ícone, critério e visibilidade.
-   Registrar desbloqueio por aluno, data, origem e regra que o
    provocou.
-   Mostrar conquistas conquistadas e, se a política permitir, as ainda
    bloqueadas.
-   Garantir que desbloqueios sejam idempotentes.
-   Não apagar a história de uma conquista concedida; correções devem
    ser auditadas.
-   O álbum do aluno exibe progresso pessoal, sem revelar dados de
    colegas.

### RF-021 --- Loja e recompensas (P1)

-   Configurar itens de recompensa com nome, descrição, ícone, custo em
    moedas, disponibilidade, limite e recompensa acadêmica/gamificada
    claramente tipada.
-   O aluno pode solicitar/resgatar apenas quando possui saldo
    suficiente e o item está disponível.
-   Resgate deve ocorrer em transação atômica: verificar disponibilidade
    e saldo, debitar moedas, registrar pedido e impedir duplicidade.
-   Definir status de resgate: solicitado, aprovado, entregue,
    recusado/cancelado conforme o tipo de recompensa.
-   Se a recompensa exige ação física do professor, não marcar como
    entregue automaticamente.
-   Se o item for ponto acadêmico, exigir regras e autorização próprias;
    recomendar que recompensas não concedam nota acadêmica
    automaticamente sem política formal.
-   Permitir histórico de compras e estornos auditados.

### RF-022 --- Mural/feed e recados (P1)

-   Professor autorizado cria publicação para turma ou grupo
    selecionado.
-   Publicação pode conter título, texto, data de publicação e data de
    expiração.
-   Sanitizar conteúdo e impedir execução de HTML/script.
-   Aluno vê apenas publicações destinadas à sua turma/grupo.
-   Recados individuais são privados entre remetente autorizado e
    destinatário.
-   Distinguir mural coletivo de recado individual e de observação
    privada.
-   Permitir editar/arquivar com registro de autoria.
-   Não implementar chat em tempo real no MVP; feed assíncrono é
    suficiente.
-   Não oferecer envio de mensagem entre alunos no MVP.

### RF-023 --- Agenda (P1)

-   Cadastrar evento com título, descrição, data/hora, turma/alvo e
    tipo.
-   Permitir eventos de aula, avaliação, entrega, atividade ou aviso.
-   Exibir próximos eventos em ordem cronológica.
-   Filtrar por turma/período.
-   Evitar duplicidades acidentais e mostrar fuso horário/localidade
    adequados.
-   Eventos expirados continuam consultáveis no histórico se necessário.

### RF-024 --- Tela de projeção/placar (P2)

-   Oferecer visualização em tela cheia para projetor.
-   Mostrar placar de turma/equipe conforme configuração de privacidade.
-   Permitir selecionar turma e métrica autorizada.
-   Não mostrar notas individuais, observações privadas ou informações
    pessoais desnecessárias.
-   Permitir encerrar modo de projeção com facilidade.
-   Respeitar configuração institucional para ocultar rankings
    individuais.

### RF-025 --- Exportação e impressão (P1)

-   Exportar dados tabulares em CSV apenas para usuários autorizados.
-   Gerar PDF para boletim e relatórios definidos.
-   Escapar valores corretamente para CSV, inclusive fórmulas iniciadas
    por `=`, `+`, `-` ou `@`, para reduzir risco de CSV injection.
-   Registrar exportações de dados sensíveis quando aplicável.
-   Não expor segredos ou dados desnecessários em arquivos exportados.

### RF-026 --- Preferências e acessibilidade (P1)

-   Permitir tema claro/escuro se isso fizer parte da identidade de
    referência.
-   Persistir apenas preferências não sensíveis.
-   Suportar navegação por teclado, foco visível, rótulos acessíveis,
    mensagens de validação e contraste adequado.
-   Não comunicar status apenas por cor/emoji.
-   Respeitar `prefers-reduced-motion`.
-   Ter layouts utilizáveis em celular, tablet e desktop.

### RF-027 --- Auditoria (P0/P1)

Registrar eventos relevantes, especialmente: - alteração de notas e
frequência; - concessão/estorno de pontos e moedas; - mudança de vínculo
de professor/aluno; - alterações de papéis e permissões; -
encerramento/reabertura de período; - resgates e estornos de
recompensas; - importações/exportações relevantes.

Cada registro deve incluir ator, ação, entidade, identificador,
data/hora e metadados mínimos necessários. Não registrar senhas, tokens
ou dados sensíveis desnecessários. A auditoria deve ser append-only ou
protegida contra alteração por usuários comuns.

------------------------------------------------------------------------

## 7. Jornadas do usuário

### Jornada A --- Primeiro acesso do administrador

1.  Administrador autentica-se por convite ou conta provisionada.
2.  O sistema verifica papel e instituição vinculada.
3.  Se a instituição ainda não estiver configurada, abre um assistente
    de configuração inicial.
4.  Administrador informa nome da instituição e período letivo.
5.  Cria disciplinas e turmas.
6.  Convida professores e associa-os a turmas/disciplinas.
7.  Importa ou cadastra alunos.
8.  Configura critérios acadêmicos básicos.
9.  Decide se gamificação será habilitada e define ações iniciais.
10. Visualiza resumo de configuração concluída e próximos passos.

**Alternativas/erros:** convite expirado, instituição já configurada,
falha de gravação, dados duplicados. A interface deve preservar dados do
formulário e permitir nova tentativa segura.

### Jornada B --- Preparar uma turma

1.  Professor entra no sistema.
2.  Seleciona turma, disciplina e período.
3.  O painel apresenta resumo e pendências.
4.  Confere alunos matriculados.
5.  Configura/consulta avaliações e eventos da agenda.
6.  Define missões ou ações de gamificação, se habilitadas.
7.  Está pronto para registrar frequência, notas ou participação.

### Jornada C --- Fazer chamada

1.  Professor abre **Presença**.
2.  Confirma turma e data; escolhe aula/disciplina se aplicável.
3.  Sistema carrega a lista de alunos matriculados.
4.  Professor marca presença/falta/justificada individualmente ou usa
    "Marcar todos presentes".
5.  A interface mostra quantos estão em cada estado e quais ainda não
    foram classificados.
6.  Professor revisa e salva.
7.  Sistema persiste a chamada e confirma a gravação.
8.  O painel e os relatórios refletem a chamada salva.

**Exceções:** sem alunos matriculados, chamada já existente, período
bloqueado, perda de conexão, usuário sem vínculo, edição fora da janela
permitida. Não sobrescrever chamada existente sem carregar seus valores
e avisar que ela já existe.

### Jornada D --- Criar avaliação e lançar notas

1.  Professor abre **Notas**.
2.  Seleciona disciplina e período.
3.  Cria avaliação com nome, nota máxima, peso e data opcional.
4.  Sistema valida os campos e salva.
5.  Professor abre lançamento de notas.
6.  Insere nota por aluno; campos em branco permanecem "não lançados".
7.  A tela apresenta erros por campo e resumo de lançamentos pendentes.
8.  Professor revisa e salva.
9.  Sistema recalcula médias usando a regra configurada.
10. Relatórios e boletins são atualizados.

**Exceções:** nota fora do intervalo, período encerrado, avaliação
arquivada, alteração concorrente, falha de persistência. Em conflito de
edição, avisar e recarregar/mesclar de forma segura.

### Jornada E --- Consultar um aluno

1.  Professor pesquisa/seleciona aluno em uma turma autorizada.
2.  Abre o perfil individual.
3.  Vê resumo acadêmico, frequência, gamificação e histórico.
4.  Acessa detalhes de notas por disciplina/período.
5.  Registra observação privada ou recado individual, conforme a ação
    desejada.
6.  Confirma que a observação é interna ou que o recado será visível ao
    aluno.
7.  Salva e recebe confirmação.
8.  Pode consultar histórico sem expor dados de outros alunos.

### Jornada F --- Conceder pontuação em sala

1.  Professor abre **Pontuar**.
2.  Seleciona um ou vários alunos ou uma equipe.
3.  Escolhe ação cadastrada.
4.  Sistema mostra o valor total e quem será afetado.
5.  Professor confirma.
6.  Sistema registra evento, atualiza XP/indicadores e avalia critérios
    de metas/conquistas.
7.  Se houver desbloqueio, exibe feedback visual acessível.
8.  Histórico registra a ação e permite correção auditada.

**Regra de idempotência:** duplo clique, reenvio da requisição ou
instabilidade de rede não podem conceder pontos em duplicidade.

### Jornada G --- Aluno consulta seu progresso

1.  Aluno autentica-se.
2.  Sistema identifica o vínculo aluno--usuário no backend.
3.  Abre painel individual.
4.  Aluno consulta frequência, notas, boletim, agenda, recados e
    conquistas.
5.  Abre uma missão para ler critérios e progresso.
6.  Consulta a loja e tenta resgatar uma recompensa.
7.  Se o saldo for insuficiente, vê o custo e quanto falta; se elegível,
    o sistema confirma o resgate.
8.  O aluno consulta o histórico do pedido.

### Jornada H --- Importar alunos

1.  Usuário autorizado abre importação na turma.
2.  Baixa modelo ou seleciona CSV/TSV.
3.  Sistema valida extensão, tamanho e conteúdo.
4.  Exibe prévia e mapeamento de colunas.
5.  Mostra duplicatas e erros.
6.  Usuário corrige o arquivo ou confirma os registros válidos conforme
    a política escolhida.
7.  Sistema importa com resultado rastreável.
8.  Exibe resumo e permite baixar relatório de falhas.

### Jornada I --- Gestão acompanha indicadores

1.  Administrador seleciona período e filtros.
2.  Sistema exibe indicadores agregados e suas definições.
3.  Administrador abre um indicador para ver os registros que compõem o
    resultado, dentro das permissões.
4.  Exporta relatório se necessário.
5.  A exportação respeita o mesmo escopo de acesso da tela.

------------------------------------------------------------------------

## 8. Regras de negócio transversais

### RN-001 --- Separação de conceitos

Manter entidades e saldos diferentes para: - nota acadêmica; -
frequência; - XP; - nível; - moedas virtuais; - ponto de equipe; - ponto
extra acadêmico; - conquista; - recompensa resgatada.

Nunca reutilizar o mesmo campo ou serviço para representar conceitos
diferentes.

### RN-002 --- Contexto obrigatório

Operações acadêmicas devem incluir turma, período e, quando aplicável,
disciplina. Validar o contexto no backend e não depender apenas dos
filtros da tela.

### RN-003 --- Histórico acadêmico

Mudanças de turma, professor, matrícula, nota e frequência não devem
apagar o passado. Usar arquivamento, vigência ou histórico de alterações
quando apropriado.

### RN-004 --- Datas e fusos

Persistir timestamps de auditoria em UTC e apresentar datas/horas de
acordo com o fuso configurado para a instituição. Datas de aula devem
ser tratadas como datas locais, sem deslocamento inesperado por
conversão de fuso.

### RN-005 --- Valores numéricos

Definir precisão e arredondamento para notas, pesos, XP e moedas.
Validar limites no frontend e repetir a validação no backend.

### RN-006 --- Concorrência

Se duas pessoas editarem o mesmo registro, detectar conflito ou aplicar
controle otimista de versão. Não sobrescrever silenciosamente uma
alteração mais recente.

### RN-007 --- Operações em lote

Operações em lote precisam de prévia, confirmação, resultado por
registro e estratégia definida para falhas parciais.

### RN-008 --- Exclusão

Preferir arquivamento/inativação. Exclusão definitiva deve ser
excepcional, autorizada, auditada e compatível com retenção e obrigações
legais.

### RN-009 --- Cálculos

Centralizar funções de cálculo em serviços de domínio/testáveis. Mostrar
nos relatórios a fórmula e o conjunto de dados usados.

### RN-010 --- Regras configuráveis

Média mínima, frequência mínima, escala de nota, fórmula de média,
regras de falta justificada, curva de níveis, recompensas e visibilidade
de ranking devem ser configurações explícitas, não números mágicos
espalhados pelo código.

### RN-011 --- Privacidade por padrão

Dados acadêmicos individuais e observações privadas não devem aparecer
em ranking, projeção, mural ou exportação coletiva sem finalidade e
permissão explícitas.

### RN-012 --- Consistência transacional

Resgates, débito de moedas, lançamento de pontos e eventos relacionados
devem ser atômicos quando possível. Se houver vários passos, usar
transação, função de backend ou padrão confiável de compensação.

------------------------------------------------------------------------

## 9. Modelo de domínio inicial

Os nomes podem ser adaptados ao backend, mas a semântica precisa
permanecer explícita.

### Entidades principais

-   **Institution**: id, nome, configurações, status, fuso horário.
-   **User**: id do provedor de autenticação, nome de exibição, e-mail
    quando necessário, status.
-   **Membership/RoleAssignment**: usuário, instituição, papel, status e
    escopo.
-   **AcademicYear/Term**: período letivo, datas, status.
-   **GradingPeriod**: etapa/bimestre/trimestre, datas, status.
-   **Classroom**: turma, período letivo, metadados e status.
-   **Subject**: disciplina.
-   **ClassSubject**: vínculo turma--disciplina.
-   **TeacherAssignment**: professor, turma, disciplina, vigência e
    permissões.
-   **Student**: registro escolar do aluno, separado da identidade de
    login.
-   **Enrollment**: aluno, turma, período, status e datas de vigência.
-   **AttendanceSession**: turma, data, aula/disciplina se aplicável,
    criador, status.
-   **AttendanceRecord**: sessão, matrícula/aluno, status, justificativa
    restrita quando necessária, autor e timestamps.
-   **Assessment**: turma, disciplina, período, nome, escala, peso,
    datas e status.
-   **Grade**: avaliação, aluno/matrícula, valor ou nulo, autor e
    timestamps.
-   **GradePolicy**: fórmula, média mínima, arredondamento, limites e
    política de recuperação.
-   **ExtraCreditEvent**: aluno, período, destino, valor, motivo, autor,
    estado e auditoria.
-   **GamificationAction**: nome, valor XP, indicador, status e regras.
-   **XPEvent**: aluno, turma, ação, delta, origem, autor, idempotency
    key e data.
-   **WalletTransaction**: aluno, delta de moedas, tipo, referência e
    data.
-   **Team**: nome, cor, ícone, turma/período e status.
-   **TeamMembership**: aluno/equipe, vigência e histórico.
-   **Indicator**: definição do indicador e regra de contagem.
-   **Goal/GoalRequirement**: meta e critérios.
-   **GoalAward**: concessão por aluno, data, origem e status.
-   **Mission/MissionAssignment/MissionProgress**: missão, público,
    progresso e conclusão.
-   **Achievement/AchievementUnlock**: conquista e desbloqueio
    individual.
-   **Reward/Redemption**: item, custo, estoque/limite, solicitação,
    estado, transações e entrega.
-   **Announcement**: publicação do mural, público, autor, validade e
    estado.
-   **PrivateMessage/StudentNotice**: recado individual destinado ao
    aluno.
-   **TeacherObservation**: anotação privada com escopo e autor.
-   **CalendarEvent**: evento, turma/alvo, data/hora e tipo.
-   **AuditEvent**: ator, ação, entidade, referência, timestamp e
    metadados mínimos.
-   **ImportJob/ImportRowError**: execução da importação e resultado por
    linha.

### Diretrizes de modelagem

-   Separar identidade de login de registro acadêmico do aluno.
-   Modelar vínculos com vigência quando a mudança impactar histórico.
-   Usar identificadores estáveis (UUID ou equivalente), não nome como
    chave.
-   Definir `created_at`, `updated_at`, `created_by` onde fizer sentido.
-   Aplicar integridade referencial e restrições únicas no banco.
-   Não persistir campos derivados sem necessidade; se persistidos por
    desempenho, definir como são reconciliados.
-   Para moedas e XP, preferir eventos/movimentações auditáveis em vez
    de um saldo sem origem.
-   Definir política de retenção, anonimização e exclusão compatível com
    a LGPD.

------------------------------------------------------------------------

## 10. Arquitetura Angular 20

### 10.1 Princípios

-   Angular 20 com componentes standalone.
-   TypeScript em modo strict.
-   Lazy loading por feature.
-   Separação entre apresentação, aplicação, domínio e infraestrutura.
-   Serviços de domínio sem dependência do DOM.
-   Reatividade consistente usando RxJS e/ou Signals, sem misturar
    padrões arbitrariamente.
-   Formularios reativos para formulários complexos.
-   Rotas protegidas com guards como conveniência de UX, mantendo
    autorização real no backend.
-   Interceptors para autenticação/erros quando aplicável.
-   Não fazer chamadas HTTP diretamente nos componentes de página.
-   Não colocar regras de negócio dentro de templates.
-   Evitar um mega `shared` genérico; cada item compartilhado deve ter
    motivo claro.
-   Não adotar microfrontends para o MVP sem requisito organizacional
    real. O produto inicial deve ser uma aplicação Angular modular.

### 10.2 Estrutura sugerida

``` text
src/
  app/
    core/
      auth/
      authorization/
      config/
      error-handling/
      http/
      layout/
      logging/
      routing/
      session/
    shared/
      pipes/
      directives/
      utils/
      types/
    features/
      dashboard/
        pages/
        components/
        data-access/
        domain/
      institution/
      academic-periods/
      teachers/
      classrooms/
      students/
      subjects/
      attendance/
      assessments/
      grades/
      report-card/
      reports/
      gamification/
        actions/
        teams/
        indicators/
        goals/
        missions/
        achievements/
        rewards/
      announcements/
      calendar/
      imports/
      audit/
    app.routes.ts
    app.config.ts
  environments/
projects/
  turma-lina-ui/
    src/lib/
      button/
      icon-button/
      input/
      select/
      checkbox/
      radio/
      textarea/
      form-field/
      card/
      badge/
      avatar/
      alert/
      toast/
      dialog/
      confirm-dialog/
      dropdown/
      tabs/
      table/
      pagination/
      empty-state/
      skeleton/
      spinner/
      tooltip/
      date-picker/
      modal/
      drawer/
      theme/
      tokens/
      public-api.ts
```

A estrutura pode ser ajustada ao repositório real, desde que mantenha
separação por feature e responsabilidades equivalentes. Evitar criar
dezenas de pastas vazias sem código ou necessidade.

### 10.3 Camadas por feature

-   **pages:** composição de tela e coordenação de estado da rota.
-   **components:** componentes específicos daquela feature.
-   **domain:** modelos, regras puras, cálculos e contratos.
-   **data-access:** serviços/repositórios para leitura e gravação.
-   **application/use-cases:** orquestrações de ações de negócio quando
    a complexidade justificar.
-   **models/types:** somente se não houver domínio organizado; evitar
    duplicação de modelos.

Componentes devem receber dados por inputs e emitir intenções por
outputs ou usar uma estratégia de estado consistente. Não acoplar
componente do UI Kit a entidades como `Student`, `Assessment` ou
`XPEvent`.

### 10.4 Rotas sugeridas

``` text
/login
/app
/app/dashboard
/app/classes
/app/classes/:classId
/app/classes/:classId/students
/app/students/:studentId
/app/attendance
/app/assessments
/app/assessments/:assessmentId/grades
/app/report-cards/:studentId
/app/reports
/app/gamification/actions
/app/gamification/teams
/app/gamification/goals
/app/gamification/missions
/app/gamification/achievements
/app/gamification/rewards
/app/announcements
/app/calendar
/app/settings
/student
/student/home
/student/grades
/student/attendance
/student/report-card
/student/missions
/student/album
/student/store
/student/calendar
/student/notices
/admin
/admin/users
/admin/terms
/admin/classes
/admin/subjects
/admin/settings
/admin/audit
```

A estrutura final deve refletir as permissões reais e pode variar por
perfil. Não criar rotas duplicadas para a mesma tela apenas para mudar o
papel; reutilizar componentes de leitura quando isso não comprometer a
segurança nem a UX.

------------------------------------------------------------------------

## 11. UI Kit como biblioteca separada --- requisito obrigatório

### 11.1 Objetivo

Criar uma biblioteca Angular independente chamada, por exemplo,
**`turma-lina-ui`**, para centralizar tokens, estilos e componentes
visuais reutilizáveis. O sistema de gestão escolar deve consumir essa
biblioteca como consumidor; a biblioteca não pode importar features do
sistema.

A intenção é permitir que, no futuro, o UI Kit evolua para uma
biblioteca interna de componentes de uso geral, com documentação e APIs
estáveis, inspirada na experiência de bibliotecas como NG-ZORRO --- sem
copiar seu código, marca, design ou API literalmente.

### 11.2 Separação de responsabilidades

**UI Kit pode conter:** - tokens de cor, tipografia, espaçamento,
bordas, elevação, breakpoints e motion; - temas claro/escuro; - botões,
campos, labels, selects, checkbox, radio, textarea; - cards, badges,
avatares, alertas, toasts; - dialogs/modals, drawers, dropdowns, tabs; -
tabelas genéricas, paginação, skeletons, spinners, estados vazios; -
componentes de formulário e validação visual; - utilitários de
acessibilidade e estilos globais estritamente visuais; - ícones
abstratos ou integração documentada com uma biblioteca de ícones.

**UI Kit não pode conter:** - serviços de gestão escolar; - modelos de
aluno, turma, nota, presença ou gamificação; - regras de aprovação,
frequência ou XP; - chamadas a APIs do produto; - conhecimento de rotas
de negócio; - dependência de Supabase ou de qualquer backend; -
permissões de negócio; - textos de domínio que só façam sentido na
aplicação.

### 11.3 API e qualidade dos componentes

-   Componentes standalone.
-   Inputs/outputs tipados e nomes coerentes.
-   APIs pequenas e previsíveis; evitar dezenas de inputs booleanos
    combináveis.
-   Acessibilidade por teclado e leitor de tela.
-   Estados `disabled`, `loading`, `error`, `readonly` quando aplicável.
-   Suporte responsivo.
-   Tokens CSS custom properties em vez de cores hardcoded espalhadas.
-   Estilos encapsulados e sem efeitos colaterais globais não
    documentados.
-   Não impor estilos internos às páginas consumidoras.
-   Não exigir que consumidor importe o CSS completo de uma aplicação
    demo.
-   Exportar apenas APIs públicas via `public-api.ts`.
-   Versionar/documentar mudanças incompatíveis.
-   Testes unitários dos comportamentos públicos.
-   Criar exemplos de uso em uma página de showcase ou Storybook se
    viável; não deixar o Storybook bloquear o MVP.
-   Não construir um clone completo de NG-ZORRO na primeira entrega.
    Começar pelo conjunto que o produto realmente usa e evoluir conforme
    necessidade.

### 11.4 Tokens iniciais

Extrair da referência e formalizar, em vez de copiar valores
aleatoriamente: - cores de marca e semânticas; - cores para sucesso,
aviso, erro e informação; - superfícies, fundo, bordas e texto; -
tipografia e escala de tamanhos; - escala de espaçamento; - raios e
sombras; - foco e estados interativos; - breakpoints responsivos; -
transições e preferência por movimento reduzido.

As cores finais devem manter a personalidade acolhedora da referência,
mas atender a contraste WCAG 2.2 AA. Não fixar toda a identidade em
emojis; emojis podem ser opcionais em conteúdo de gamificação, enquanto
os controles do sistema precisam de ícones consistentes e acessíveis.

### 11.5 Componentes mínimos de UI Kit para o MVP

1.  `TlButton` --- variantes primary, secondary, tertiary/ghost, danger;
    tamanhos; loading; disabled.
2.  `TlIconButton` --- botão com nome acessível obrigatório.
3.  `TlCard` --- superfície, cabeçalho opcional, conteúdo e ações.
4.  `TlFormField` --- label, hint, erro e associação acessível.
5.  `TlInput`, `TlTextarea`, `TlSelect`, `TlCheckbox`.
6.  `TlBadge` / `TlStatusBadge`.
7.  `TlAvatar` com iniciais.
8.  `TlAlert` para feedback contextual.
9.  `TlToastService` ou mecanismo equivalente, sem acoplar regra de
    negócio.
10. `TlDialog` e `TlConfirmDialog`.
11. `TlTabs`.
12. `TlTable` ou tabela acessível composta por elementos nativos.
13. `TlPagination`.
14. `TlEmptyState`.
15. `TlSkeleton` e `TlSpinner`.
16. `TlDropdownMenu`.
17. `TlDatePicker` apenas se houver necessidade e solução acessível
    confiável.
18. `TlPageHeader` se for claramente um padrão visual reutilizado; caso
    tenha semântica de produto, manter na aplicação.

### 11.6 Critérios de aceite do UI Kit

-   O UI Kit compila e pode ser importado sem importar a aplicação.
-   Nenhum componente da biblioteca depende de serviços de domínio.
-   Um showcase permite testar variantes e estados.
-   Componentes principais têm testes.
-   Tokens e temas estão documentados.
-   Aplicação usa os componentes do UI Kit em vez de duplicar seus
    estilos.
-   Alterar o tema não exige editar dezenas de componentes.
-   Componentes são acessíveis por teclado e possuem nomes/labels
    corretos.
-   O build da biblioteca e o build da aplicação fazem parte da
    verificação contínua.

------------------------------------------------------------------------

## 12. Persistência, backend e integrações

### 12.1 Princípio de independência

A camada Angular deve depender de contratos de repositório/serviços, não
diretamente de detalhes de um fornecedor. Caso seja escolhido
Supabase: - autenticação pode usar Supabase Auth; - dados relacionais
podem usar PostgreSQL; - políticas RLS devem limitar o acesso por
instituição, papel, turma e vínculo; - operações que precisam ser
atômicas ou privilegiadas devem usar funções/serviços seguros no
backend; - chaves privilegiadas nunca podem estar no frontend; -
migrações de banco devem ser versionadas; - ambientes DES/PRD devem ser
isolados.

Não presumir que RLS está correta apenas por estar habilitada: escrever
e testar políticas para leitura, inserção, atualização e exclusão.

### 12.2 Repositórios sugeridos

Criar contratos equivalentes a: - `AuthRepository` -
`ClassroomRepository` - `StudentRepository` - `AttendanceRepository` -
`AssessmentRepository` - `GradeRepository` - `GamificationRepository` -
`AnnouncementRepository` - `CalendarRepository` - `ReportRepository`

Não é necessário criar abstração genérica complexa para cada tabela. A
abstração deve facilitar testes e reduzir acoplamento, não virar uma
camada de boilerplate.

### 12.3 Ambiente e configuração

-   Separar desenvolvimento, homologação e produção.
-   Não commitar `.env` com segredos.
-   Documentar variáveis obrigatórias e valores públicos.
-   Validar configuração no início da aplicação e falhar com mensagem
    clara se faltar algo essencial.
-   Não apontar ambiente de desenvolvimento para dados reais de alunos.
-   Criar migrações reproduzíveis e instruções de setup.
-   Dados de demonstração devem ser sintéticos e identificados como
    demo.

------------------------------------------------------------------------

## 13. Segurança, privacidade e LGPD

O sistema pode lidar com dados de crianças/adolescentes e dados
acadêmicos. A segurança não é opcional.

-   Aplicar princípio do menor privilégio.
-   Verificar autorização no backend/banco, por registro e operação.
-   Isolar instituições/tenants em todas as consultas.
-   Impedir IDOR: conhecer ou alterar um ID não deve liberar acesso.
-   Sanitizar texto exibido e conteúdo importado.
-   Usar proteção contra XSS, CSRF conforme arquitetura, abuso de APIs e
    brute force no provedor apropriado.
-   Não registrar dados pessoais completos em logs sem necessidade.
-   Não armazenar tokens em locais inseguros por conveniência.
-   Proteger observações privadas e recados.
-   Restringir exportações e registrar ações relevantes.
-   Definir política de retenção, correção, exportação,
    exclusão/anonimização e atendimento a titulares.
-   Documentar finalidade e base legal de cada categoria de dado.
-   Considerar o melhor interesse da criança/adolescente e as obrigações
    aplicáveis da LGPD.
-   Não usar fotos de alunos por padrão.
-   Não mostrar ranking individual por padrão sem decisão institucional
    explícita.
-   Ter plano de backup e recuperação.
-   Revisar permissões com testes automatizados.
-   Produção exige revisão de segurança e validação das políticas do
    backend antes de inserir dados reais.

**Nota:** este documento não substitui avaliação jurídica ou de
privacidade. A instituição deve validar as bases legais, avisos de
privacidade e políticas aplicáveis.

------------------------------------------------------------------------

## 14. Requisitos não funcionais

### RNF-001 --- Performance

-   Carregar shell e rotas essenciais sem transferir todos os módulos de
    uma vez.
-   Usar lazy loading para features.
-   Evitar listas gigantes renderizadas sem paginação/virtualização
    quando necessário.
-   Minimizar chamadas redundantes e oferecer feedback de carregamento.
-   Definir metas mensuráveis após baseline; como alvo inicial, buscar
    LCP ≤ 2,5 s em condições de teste representativas e manter
    interações comuns responsivas.

### RNF-002 --- Responsividade

-   Suportar celular a partir de aproximadamente 360 px, tablet e
    desktop.
-   Não depender de hover para ações essenciais.
-   Em telas pequenas, converter tabelas em layouts legíveis ou permitir
    rolagem claramente indicada.
-   Botões e alvos de toque com dimensão confortável.

### RNF-003 --- Acessibilidade

-   Buscar conformidade WCAG 2.2 AA nas jornadas principais.
-   Ordem de foco lógica, foco visível, labels, mensagens associadas e
    contraste adequado.
-   Dialogs com foco gerenciado e retorno de foco.
-   Status anunciados por tecnologia assistiva quando necessário.
-   Não usar somente emoji para comunicar estado.

### RNF-004 --- Compatibilidade

-   Suportar versões atuais dos principais navegadores modernos
    definidos no projeto.
-   Documentar limitações conhecidas.

### RNF-005 --- Manutenibilidade

-   TypeScript strict.
-   Lint e formatação automatizados.
-   Componentes e serviços com responsabilidade clara.
-   Nomes consistentes e código sem duplicação evitável.
-   Regras de domínio cobertas por testes.
-   Não permitir erros críticos de build/lint/teste na pipeline.

### RNF-006 --- Observabilidade

-   Registrar erros técnicos sem expor dados pessoais.
-   Correlacionar operações de gravação quando possível.
-   Exibir mensagens amigáveis e manter detalhes técnicos no log seguro.
-   Ter monitoramento de falhas e performance adequado ao ambiente.

### RNF-007 --- Disponibilidade e recuperação

-   Definir backup, restauração e RPO/RTO conforme infraestrutura e
    criticidade.
-   Testar restauração; backup não verificado não é estratégia
    suficiente.

### RNF-008 --- Internacionalização

-   Idioma inicial: português brasileiro (`pt-BR`).
-   Datas, números e notas formatados conforme convenções locais.
-   Evitar concatenar textos de forma que impeça futura tradução.

------------------------------------------------------------------------

## 15. Estratégia de testes e qualidade

### 15.1 Pirâmide de testes

-   **Unitários:** funções de média, frequência, níveis, elegibilidade
    de metas, saldo de moedas e validações.
-   **Componentes:** UI Kit, formulários, estados, acessibilidade
    básica.
-   **Integração:** repositórios, autorização, gravação de
    chamada/notas, resgate de recompensa.
-   **E2E:** login e redirecionamento por papel; chamada; criação de
    avaliação e notas; consulta do aluno; resgate; importação.
-   **Segurança:** tentativa de acessar aluno/turma de outro escopo;
    adulteração de papel; duplicação de transações; XSS em textos
    importados.

### 15.2 Cenários mínimos obrigatórios

1.  Usuário sem sessão não acessa tela interna.
2.  Professor A não lê nem altera turma exclusiva do Professor B.
3.  Aluno A não consulta dados do Aluno B alterando URL/ID.
4.  Nota em branco não é interpretada como zero.
5.  Nota acima do máximo é rejeitada no cliente e no servidor.
6.  Frequência sem chamadas é exibida como sem registro.
7.  Chamada duplicada é impedida ou tratada pela regra de múltiplas
    aulas.
8.  Salvar uma chamada e recarregar mantém os dados.
9.  Duplo clique não duplica pontuação.
10. Resgate simultâneo não permite gastar o mesmo saldo duas vezes.
11. Meta/conquista não é concedida duas vezes por reenvio da mesma
    operação.
12. Falha de rede não exibe confirmação falsa.
13. Importação inválida apresenta erros e não executa scripts.
14. CSV exportado neutraliza fórmulas perigosas.
15. Observação privada não aparece na conta do aluno.
16. Ranking respeita configuração de privacidade.
17. Período encerrado bloqueia edição conforme política.
18. UI Kit compila isoladamente e seus componentes principais têm
    testes.

### 15.3 Definição de pronto (Definition of Done)

Uma funcionalidade só é considerada concluída quando: - requisito e
regra de negócio estão documentados; - fluxo principal e estados
alternativos foram implementados; - validação frontend e backend existem
quando aplicável; - permissões foram verificadas; - testes adequados
foram criados e passam; - interface é responsiva e acessível; - erros e
estados vazios são tratados; - não há credenciais ou dados reais de
alunos em fixtures; - documentação foi atualizada; - build, lint e
testes passam; - mudanças no banco estão versionadas; - critérios de
aceite foram demonstrados.

------------------------------------------------------------------------

## 16. Plano de entrega sugerido

### Fase 0 --- Descoberta e fundação

-   Inspecionar repositório e registrar decisões.
-   Confirmar backend, autenticação e ambientes.
-   Definir domínio, papéis, política de autorização e esquema inicial.
-   Criar base Angular 20 e UI Kit.
-   Criar tokens e shell responsivo.
-   Configurar lint, testes e pipeline.

**Saída:** aplicação compilando, UI Kit separado, navegação base e
documentação de setup.

### Fase 1 --- MVP acadêmico essencial

-   Autenticação real e autorização.
-   Instituição/período letivo.
-   Turmas, professores, disciplinas, alunos e matrículas.
-   Painel inicial.
-   Frequência.
-   Avaliações e lançamento de notas.
-   Boletim básico.
-   Auditoria para alterações críticas.

**Saída:** professor consegue preparar turma, registrar presença/notas e
aluno autorizado consegue consultar seu próprio resultado.

### Fase 2 --- Relatórios e comunicação

-   Relatórios de frequência/notas.
-   Importação de alunos com prévia.
-   Mural, recados e agenda.
-   Exportação CSV/PDF.
-   Melhorias de acessibilidade e UX com usuários reais.

### Fase 3 --- Gamificação

-   Ações de XP, níveis, moedas e histórico.
-   Equipes e placar.
-   Indicadores, metas e missões.
-   Conquistas e álbum.
-   Loja e resgates com transações seguras.
-   Configurações de privacidade e ativação/desativação por instituição.

### Fase 4 --- Gestão avançada e escala

-   Visão institucional e relatórios agregados.
-   Auditoria ampliada.
-   Tela de projeção segura.
-   Otimização de performance.
-   PWA/offline limitado apenas se houver necessidade clara.
-   Preparação de API e UI Kit para eventual consumo por outros
    produtos.

**Regra de priorização:** não começar por animações, ranking, loja ou
tela de projeção enquanto autenticação, escopo de acesso, persistência,
chamada e notas não estiverem sólidos.

------------------------------------------------------------------------

## 17. Backlog inicial com critérios de aceite

  ---------------------------------------------------------------------------------
  ID                História                  Prioridade        Critérios de aceite
                                                                resumidos
  ----------------- ------------------------- ----------------- -------------------
  US-001            Como usuário, quero       P0                Login real, logout,
                    autenticar-me com                           sessão e proteção
                    segurança                                   de rotas

  US-002            Como administrador, quero P0                Datas válidas,
                    configurar instituição e                    status e auditoria
                    período                                     

  US-003            Como administrador, quero P0                Vínculos
                    criar turmas e                              consistentes e
                    disciplinas                                 isolamento por
                                                                instituição

  US-004            Como                      P0                Validação, busca e
                    administrador/professor                     arquivamento
                    autorizado, quero                           
                    cadastrar alunos                            

  US-005            Como professor, quero     P0                Somente vínculos
                    visualizar minhas turmas                    autorizados

  US-006            Como professor, quero     P0                Estados,
                    registrar frequência                        persistência,
                                                                edição autorizada e
                                                                histórico

  US-007            Como professor, quero     P0                Escala, período,
                    criar avaliações                            disciplina e
                                                                validação

  US-008            Como professor, quero     P0                Branco não é zero;
                    lançar notas                                cálculo documentado

  US-009            Como aluno, quero         P0                Apenas dados
                    consultar meu boletim                       próprios,
                                                                impressão/PDF

  US-010            Como professor, quero ver P0                Métricas definidas
                    indicadores da turma                        e sem valores
                                                                inventados

  US-011            Como professor, quero     P1                Prévia, erros,
                    importar alunos                             duplicatas e
                                                                confirmação

  US-012            Como professor, quero     P1                Escopo correto e
                    enviar recados e publicar                   conteúdo sanitizado
                    avisos                                      

  US-013            Como professor, quero     P1                Evento auditável e
                    registrar ações de                          sem duplicidade
                    gamificação                                 

  US-014            Como aluno, quero ver     P1                Visibilidade e
                    missões e conquistas                        elegibilidade
                                                                consistentes

  US-015            Como aluno, quero         P1                Saldo verificado
                    resgatar recompensa                         transacionalmente

  US-016            Como gestor, quero        P1                Escopo, filtros e
                    relatórios institucionais                   exportação
                                                                autorizada

  US-017            Como equipe de produto,   P0                Build separado,
                    quero UI Kit independente                   APIs públicas,
                                                                tokens e testes

  US-018            Como administrador, quero P1                Eventos críticos
                    consultar auditoria                         rastreáveis e
                                                                acesso restrito
  ---------------------------------------------------------------------------------

Cada história deverá ser quebrada em tarefas técnicas pequenas e
estimáveis, sem misturar frontend, backend, migração e testes em uma
tarefa genérica.

------------------------------------------------------------------------

## 18. Diretrizes de design visual

-   Reproduzir a sensação acolhedora, lúdica e organizada da referência,
    sem transformar o produto em uma interface infantilizada em excesso.
-   Preservar hierarquia: cabeçalho contextual, conteúdo principal,
    cartões de resumo, listas e ações primárias.
-   Usar cores semânticas consistentes, ícones e ilustrações leves.
-   Preferir iniciais/avatares abstratos a fotografias de alunos no MVP.
-   Gamificação pode usar emojis em conquistas e ações; controles
    operacionais devem ter ícones e rótulos acessíveis.
-   Cards precisam funcionar em largura pequena sem overflow.
-   Evitar modais gigantes; formulários complexos podem ser páginas ou
    drawers.
-   Ações destrutivas precisam de confirmação clara.
-   Ter estados de sucesso, alerta, erro, carregamento e vazio
    padronizados pelo UI Kit.
-   Implementar tema por tokens, não por seletores CSS improvisados em
    cada feature.
-   Não copiar integralmente marca, código ou API de terceiros. A
    referência é o HTML fornecido e a identidade própria do produto.

------------------------------------------------------------------------

## 19. Decisões que precisam ser explicitadas no projeto

Se não estiverem definidas no repositório, registrar como decisões
pendentes e sugerir uma opção padrão segura:

1.  Backend: Supabase ou API própria?
2.  Autenticação: e-mail/senha, Google, convite institucional ou
    combinação?
3.  Uma instituição por implantação ou multi-tenant?
4.  Modelo de frequência: por dia, por aula ou por disciplina?
5.  Fórmula de média, nota máxima, média mínima e arredondamento.
6.  Tratamento de faltas justificadas no percentual de frequência.
7.  Política para edição após fechamento de período.
8.  Política de ranking individual e placar público em sala.
9.  Regras de geração de XP, moedas e níveis.
10. Tipos de recompensa permitidos e se haverá qualquer recompensa
    acadêmica.
11. Importação: permitir linhas válidas quando há linhas inválidas ou
    exigir arquivo totalmente corrigido?
12. Retenção e exclusão de dados.
13. Requisitos para responsáveis legais.
14. PWA e funcionamento offline.
15. Exportação e relatórios obrigatórios.
16. Identidade visual final e fonte/ícones.
17. Estratégia de deploy, backups, monitoramento e ambientes.

Não esconder essas decisões dentro de constantes ou escolhas implícitas
no código.

------------------------------------------------------------------------

## 20. Entregáveis obrigatórios da IA

Ao concluir cada fase, entregar: 1. Código compilável e organizado. 2.
UI Kit em biblioteca separada. 3. Migrações e políticas de acesso, se
houver backend relacional. 4. Testes automatizados relevantes. 5. Dados
de demonstração sintéticos e isolados de produção. 6. `README.md` com
requisitos, setup, comandos, variáveis de ambiente e deploy. 7.
Documento de arquitetura (`docs/architecture.md`). 8. Documento de
regras de negócio (`docs/business-rules.md`). 9. Matriz de permissões
(`docs/permissions.md`). 10. Registro de decisões técnicas (`docs/adr/`
ou equivalente). 11. Backlog do que foi implementado, pendente e
bloqueado. 12. Lista de riscos e limitações conhecidas. 13. Evidência
dos comandos de build, lint e testes executados.

Não declarar funcionalidade concluída se estiver apenas simulada com
arrays locais ou dados hardcoded. Se alguma parte estiver mockada
temporariamente, identificar explicitamente como mock, explicar a
limitação e criar uma interface clara para substituição.

------------------------------------------------------------------------

## 21. Prompt operacional final para o Big Pickle

> Atue como uma equipe sênior composta por Product Owner, analista de
> requisitos, UX designer, arquiteto de software, Tech Lead Angular 20,
> especialista em segurança e QA.
>
> Analise o repositório e o HTML de referência
> `turmaLina_conquistas_album-28.html`. Use o HTML para entender
> funcionalidades, linguagem visual e jornadas; não copie sua
> arquitetura monolítica. Implemente o sistema descrito neste documento
> de forma incremental, começando por uma análise do estado atual e um
> plano técnico.
>
> **Prioridade máxima:** gestão escolar utilizável --- autenticação e
> autorização reais, turmas, alunos, disciplinas, frequência,
> avaliações, notas, boletim e relatórios. Gamificação vem depois e deve
> permanecer separada dos conceitos acadêmicos.
>
> Crie uma biblioteca Angular independente para o UI Kit, com tokens,
> temas e componentes reutilizáveis. A aplicação principal deve consumir
> essa biblioteca, e a biblioteca não pode conhecer regras de negócio,
> entidades escolares, rotas do produto ou backend. Estruture-a para
> permitir evolução futura como biblioteca interna de componentes, sem
> tentar construir de início um clone completo de NG-ZORRO.
>
> Use Angular 20, componentes standalone, TypeScript strict, lazy
> loading por feature, formulários reativos quando apropriado, testes
> automatizados, acessibilidade e arquitetura modular. Não crie um
> componente gigante nem coloque chamadas de dados e regras de negócio
> dentro de templates.
>
> Implemente autorização no backend/banco, isolamento de dados e trilha
> de auditoria. Não use `localStorage` como banco escolar, não confie em
> papel vindo do cliente, não exponha segredos e não misture XP/moedas
> com notas acadêmicas.
>
> Antes de modificar arquivos, informe brevemente o que encontrou no
> repositório e apresente uma sequência de implementação. Em seguida,
> implemente a primeira fatia vertical funcional, com UI, persistência,
> validação, autorização, testes e documentação. Não pare em uma
> proposta de arquitetura: produza código funcional. Após cada fase,
> informe o que foi entregue, os testes executados, o que continua
> pendente e os riscos.
>
> Quando uma decisão essencial não estiver definida, registre a decisão
> pendente e proponha uma alternativa segura e reversível. Não invente
> que uma integração existe, não esconda mocks e não declare concluído
> algo que só funciona visualmente.

------------------------------------------------------------------------

## 22. Observação final

O sistema deve ser desenvolvido como produto de gestão escolar, não
apenas como álbum de conquistas. O núcleo acadêmico, a integridade dos
dados, a segurança e a facilidade de uso do professor são os critérios
de sucesso. A gamificação deve enriquecer esse núcleo e poder ser
ativada, configurada ou desativada sem afetar o funcionamento de
frequência, notas e boletins.


---

## ADENDO DE PRODUTO — Experiência do professor por turma e disciplina (decisão aprovada)

Este adendo complementa e prevalece sobre orientações anteriores de navegação do professor que possam sugerir selecionar uma disciplina antes de consultar a turma. **O fluxo preferido é abrir primeiro a turma em uma visão geral e, dentro dela, acessar a disciplina para executar tarefas pedagógicas.**

### Modelo mental
- **Turma** é o agrupamento acadêmico de alunos em um período letivo (ex.: 6º ano A). Não é uma disciplina.
- **Disciplina ofertada** é uma matéria disponível naquela turma (ex.: Matemática, Português, História).
- **Vínculo docente** associa `professorId + turmaId + disciplinaId` e determina em qual disciplina o professor pode operar em determinada turma.
- **Matrícula** associa aluno à turma/período; não deve ser confundida com o vínculo docente.
- Um professor pode ter vários vínculos, inclusive a mesma disciplina em várias turmas e, se a escola permitir, disciplinas diferentes na mesma turma.

### Jornada obrigatória do professor
1. Login → painel do professor.
2. Painel mostra turmas vinculadas, disciplinas que leciona em cada uma, pendências e próximas aulas quando esses dados existirem.
3. Selecionar uma turma → abrir o detalhe da turma na aba **Visão geral** por padrão.
4. Na visão geral, consultar dados coletivos permitidos: identificação da turma, quantidade/lista de alunos, equipe docente, disciplinas ofertadas, agenda/comunicados gerais e indicadores agregados permitidos.
5. A partir da turma, abrir **Disciplinas** e selecionar uma disciplina em que o professor tenha vínculo ativo.
6. Abrir a área da disciplina, com ações e dados limitados ao vínculo selecionado: avaliações/notas, conteúdos, mural/publicações disciplinares e frequência quando a política escolar for por disciplina.
7. Trocar de disciplina sem precisar sair da turma. O contexto atual deve permanecer explícito no cabeçalho.

### Requisitos de UX
- No detalhe da turma, apresentar navegação clara, por exemplo: **Visão geral | Disciplinas | Professores | Alunos | Mural | Agenda**. Adaptar os itens aos módulos já implementados; não criar páginas vazias apenas para cumprir a lista.
- A área **Disciplinas** lista as disciplinas ofertadas e identifica quais são lecionadas pelo professor autenticado. Mostrar nome da disciplina e, quando útil, nome do docente responsável e quantidade de alunos.
- Ao selecionar uma disciplina, mostrar breadcrumb/cabeçalho persistente como **Turmas / 6º ano A / Matemática** e um indicador **Minha disciplina**.
- Dentro da disciplina, oferecer navegação contextual como **Visão geral | Notas e avaliações | Frequência | Mural | Conteúdos**, somente para funcionalidades existentes ou incluídas no escopo atual.
- Nunca sugerir que o professor administra a turma inteira. A visão geral é primariamente de consulta; ações administrativas da turma (matrículas, configuração, atribuição de docentes) continuam restritas ao papel autorizado.
- Não obrigar o professor a escolher uma disciplina antes de visualizar a turma. Se só houver uma disciplina vinculada, pode destacá-la como atalho, mas não eliminar a visão geral.
- Em mobile, preservar o contexto e tornar a troca de turma/disciplina acessível sem sobrecarregar a tela.

### Escopo dos dados e ações
- A turma define o conjunto de alunos; o vínculo docente define a disciplina e o escopo de escrita do professor.
- O professor só pode criar/editar avaliações, lançar notas e publicar conteúdos disciplinares na combinação turma-disciplina em que tem vínculo ativo.
- Não conceder acesso às notas individuais de outras disciplinas só porque o professor vê um indicador consolidado.
- Indicadores agregados de turma (ex.: média geral entre disciplinas) são somente leitura, devem ter fórmula e período explícitos e só podem ser mostrados se a política da instituição autorizar. Não expor valores individuais de outras disciplinas por meio de drill-down, exportação ou APIs.
- Separar mural/comunicado geral da turma de publicação vinculada a uma disciplina. Um professor pode publicar no mural disciplinar apenas no escopo autorizado. A publicação geral da turma segue uma permissão própria, configurável pela instituição; não presumir que todo professor pode fazê-la.
- Frequência pode ser global por aula ou por disciplina. Respeitar a configuração/política existente da instituição; não duplicar chamada geral por disciplina. Professor só registra frequência no escopo permitido.
- Pontuação/gamificação deve respeitar as regras já existentes e o escopo de turma/aluno; não usar XP como nota acadêmica.

### Segurança e estado de contexto
- A seleção de turma/disciplina no frontend serve para navegação e UX, **não é mecanismo de segurança**.
- Validar no serviço/repositório e no Supabase/RLS (ou política equivalente) instituição, papel, vínculo docente ativo, turma, disciplina e período letivo em toda leitura/escrita sensível.
- Não confiar em `turmaId`/`disciplinaId` enviados pelo cliente sem autorização no servidor/banco.
- Ao trocar de turma ou disciplina, limpar/recarregar dados dependentes para impedir que notas, alunos ou ações do contexto anterior apareçam momentaneamente ou sejam gravados no contexto errado.
- Não inventar métricas nem mostrar `0` quando os dados estão ausentes; usar estado vazio/“Sem dados”.
- Preservar os componentes e padrões já existentes quando possível. Antes de alterar esquema, rotas ou migrações, inspecionar o repositório e reutilizar os vínculos existentes.

### Critérios de aceite
1. Professor vê no painel somente turmas às quais possui vínculo docente ativo.
2. Ao abrir uma turma, a primeira tela é a visão geral, não o formulário de notas de uma disciplina.
3. A visão geral apresenta somente informações permitidas e diferencia claramente dados agregados de dados disciplinares.
4. A lista de disciplinas mostra quais são acessíveis ao professor; disciplinas sem vínculo não permitem entrar em ferramentas de edição.
5. Um professor vinculado a Matemática no 6º A e 7º B pode trabalhar em cada combinação sem misturar dados.
6. Tentativas de consultar/alterar notas de outra disciplina são negadas também no backend/banco, não apenas ocultadas na UI.
7. Trocar turma, disciplina ou período atualiza cabeçalho, listas, indicadores e formulários e não reaproveita estado incompatível.
8. Dados ausentes geram estados vazios, não números artificiais.
9. A experiência responsiva mantém visível o contexto `turma + disciplina`.
10. Testes cobrem autorização permitida/negada, troca de contexto e isolamento entre disciplinas.
