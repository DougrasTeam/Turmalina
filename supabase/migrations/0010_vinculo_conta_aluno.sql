-- =============================================================================
-- Turmalina — vínculo da conta de acesso ao cadastro do aluno
-- -----------------------------------------------------------------------------
-- O vínculo `alunos.user_id` liga um registro de aluno à conta de Auth
-- (Supabase). Ele é gravado pela Edge Function `admin-usuarios` ao criar a
-- conta, e é o que permite ao RLS liberar `alunos_leitura` para o próprio aluno
-- (`user_id = auth.uid()`).
--
-- Problema corrigido: o trigger `proteger_alunos_exceto_xp` bloqueava qualquer
-- UPDATE em `alunos` que não fosse feito por um administrador autenticado
-- (`eh_administrador()` exige `auth.uid()`). Como a Edge Function usa a chave
-- `service_role` — sem `auth.uid()` — o vínculo de `user_id` nunca era gravado.
--
-- Correção: o trigger passa a permitir a alteração exclusiva de `user_id`
-- quando a requisição vem de `service_role` (backend), mantendo a proteção para
-- todos os demais campos e chamadores.
--
-- Deve ser executado no SQL Editor do Supabase após os scripts anteriores.
-- =============================================================================

create or replace function public.proteger_alunos_exceto_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  papel_requisicao text := current_setting('request.jwt.claim.role', true);
  veio_do_backend  boolean := papel_requisicao = 'service_role';
begin
  -- O backend (service_role) pode vincular a conta de acesso ao cadastro.
  if veio_do_backend and (to_jsonb(new) - 'user_id') is not distinct from (to_jsonb(old) - 'user_id') then
    return new;
  end if;

  if public.eh_administrador() then
    return new;
  end if;

  if public.eh_equipe() then
    if (to_jsonb(new) - 'xp' - 'moedas' - 'atualizado_em')
       is distinct from (to_jsonb(old) - 'xp' - 'moedas' - 'atualizado_em') then
      raise exception 'A equipe só pode atualizar XP e moedas do aluno.';
    end if;
    return new;
  end if;

  raise exception 'Sem permissão para atualizar alunos.';
end;
$$;

drop trigger if exists trg_proteger_alunos_exceto_xp on public.alunos;
create trigger trg_proteger_alunos_exceto_xp before update on public.alunos
  for each row execute function public.proteger_alunos_exceto_xp();
