-- =============================================================================
-- 0014 — Autorização exige perfil ATIVO
-- =============================================================================
-- Motivação: ao excluir um cadastro (ex.: professor), o perfil vinculado em
-- `public.perfis` é removido e a conta de Auth é encerrada. Enquanto o token de
-- acesso não expira, as funções de autorização não consideravam o perfil
-- removido/inativo, então o usuário continuava enxergando dados da instituição.
--
-- Estas funções passam a retornar null/false quando o perfil não existe ou está
-- inativo, esvaziando as políticas de RLS e bloqueando o acesso imediatamente
-- (mesmo com um token de acesso ainda válido).
-- =============================================================================

create or replace function public.auth_papel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select papel from public.perfis where user_id = auth.uid() and ativo
$$;

create or replace function public.auth_institution()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select institution_id from public.perfis where user_id = auth.uid() and ativo
$$;

create or replace function public.auth_aluno_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select a.id
  from public.alunos a
  join public.perfis p on p.user_id = a.user_id and p.ativo
  where a.user_id = auth.uid()
$$;

create or replace function public.auth_turma_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select a.turma_id
  from public.alunos a
  join public.perfis p on p.user_id = a.user_id and p.ativo
  where a.user_id = auth.uid()
$$;

-- `eh_administrador` e `eh_equipe` derivam de `auth_papel`, então passam a
-- respeitar o perfil ativo automaticamente.
