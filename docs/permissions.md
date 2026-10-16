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
| `/aluno/inicio`    | não           | não       | sim |
| `/aluno/boletim`   | não           | não       | sim |
| `/instituicao`     | sim           | não       | não |
| `/periodos-letivos`| sim           | não       | não |
| `/disciplinas`     | sim           | não       | não |
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
