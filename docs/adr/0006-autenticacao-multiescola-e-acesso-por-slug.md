# ADR 0006 — Autenticação multi-escola e acesso por slug

- **Status:** Aceito
- **Data:** 2026-10-23
- **Complementa:** ADR 0005

## Contexto

Uma mesma pessoa pode ensinar em mais de uma escola e continua usando um único
e-mail/conta. O papel e os dados acadêmicos pertencem ao vínculo com cada
escola, não à conta global. Além disso, inativar uma escola deve impedir o
acesso aos seus dados inclusive para sessões que já estavam abertas.

Um subdomínio por escola (por exemplo, `escolax.turmalina.com`) exigiria DNS
curinga, certificados, configuração de hospedagem e tratamento específico do
host. A aplicação atual é uma SPA publicada em um domínio compartilhado.

## Decisão

- Manter uma conta de autenticação por pessoa e permitir um vínculo/perfil por
  escola (`UNIQUE (user_id, institution_id)`).
- Após autenticar, exigir a escolha da escola quando houver mais de um vínculo
  ativo. O usuário pode trocar de escola sem encerrar a sessão.
- Usar o caminho `/e/:slug` como endereço público e estável de cada escola. O
  slug define o contexto inicial do login, mas não substitui a autenticação nem
  concede acesso por si só.
- Permitir seleção e acesso somente a escolas ativas. O banco valida o status
  em `selecionar_instituicao` e `auth_institution`; o RLS bloqueia dados da
  escola inativa mesmo quando o token do usuário ainda é válido.
- Não adotar subdomínios por escola nesta fase. Eles poderão ser considerados
  quando houver infraestrutura de DNS e hospedagem configurada para isso.

## Consequências

- O mesmo e-mail pode identificar um professor em várias escolas, com o papel
  correspondente ao vínculo escolhido.
- O login por `/e/:slug` pode direcionar o usuário diretamente à escola quando
  sua conta tiver vínculo ativo; sem vínculo, o sistema não concede acesso.
- Inativar uma escola encerra o acesso aos seus dados no banco. A interface
  também informa quando o usuário só tem vínculos com escolas inativas.
- Uma sessão que já estava aberta não é automaticamente encerrada pela
  interface; após a migration 0020, o RLS bloqueia as consultas/escritas da
  escola inativa. Um aviso imediato na tela exigiria tratamento de erro de
  acesso na aplicação.
- O slug não funciona como credencial e escolas inativas continuam bloqueadas
  no login e no RLS.

## Implementação

- Frontend: seleção de escola e contexto público em `/e/:slug`.
- Banco: `0019_multiplas_escolas.sql` e `0020_bloquear_escolas_inativas.sql`.
