-- =============================================================================
-- 0003 — Primeiro acesso (troca de senha obrigatória)
-- =============================================================================
-- Ao criar uma conta pelo painel administrativo (via Edge Function), o usuário
-- recebe uma senha gerada pelo sistema e é marcado com `precisa_trocar_senha`.
-- No primeiro login o frontend exige a definição de uma nova senha pessoal.
--
-- O papel do usuário e a própria flag são lidos de `public.perfis`, que é a
-- fonte única usada também pelas políticas de RLS. Assim, ao adicionar novos
-- cargos no futuro (diretor, coordenação, secretaria...), basta estender o
-- domínio de `papel` e as funções de autorização, mantendo a mesma estrutura.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Flag de primeiro acesso
-- -----------------------------------------------------------------------------

alter table public.perfis
  add column if not exists precisa_trocar_senha boolean not null default false;

comment on column public.perfis.precisa_trocar_senha is
  'Quando verdadeiro, o usuário precisa definir uma nova senha antes de usar o sistema.';

-- -----------------------------------------------------------------------------
-- 2. Conclusão do primeiro acesso
-- -----------------------------------------------------------------------------
-- Chamada pelo próprio usuário autenticado logo após trocar a senha. É
-- `security definer` para poder limpar a flag sem depender de política de
-- escrita em `perfis`, mas restringe a alteração à linha do próprio usuário.

create or replace function public.concluir_primeiro_acesso()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  update public.perfis
     set precisa_trocar_senha = false
   where user_id = auth.uid();
end;
$$;

grant execute on function public.concluir_primeiro_acesso() to authenticated;
