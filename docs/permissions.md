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
| `/turmas`, `/turmas/:id` | sim     | sim       | não |
| `/professores`     | sim           | sim       | não |
| `/alunos`          | sim           | sim       | não |
| `/aluno/inicio`    | não           | não       | sim |
| `/instituicao`     | sim           | não       | não |
| `/periodos-letivos`| sim           | não       | não |

Regras aplicadas:

- Sem sessão → qualquer rota interna redireciona para `/login`.
- Papel sem permissão na rota → redireciona para a rota inicial do papel
  (`rotaInicialPorPapel`).
- Instituição e períodos letivos são restritos ao administrador; ativar,
  encerrar e reabrir período registram evento de auditoria.

## Alvo (a implementar)

Conforme a matriz da especificação (autorização no backend):

- Professor acessa **apenas** turmas/disciplinas com vínculo.
- Aluno vê **apenas** os próprios dados (notas, frequência, boletim, agenda,
  recados, missões, conquistas) e resgata recompensas quando elegível.
- Administrador gerencia cadastros, vínculos e relatórios agregados, sem ver
  senhas nem dados de outra instituição.

A implementação real deve incluir testes de isolamento (ver cenários de
segurança da especificação §15.2).
