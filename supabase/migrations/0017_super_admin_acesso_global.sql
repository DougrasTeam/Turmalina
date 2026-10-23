-- =============================================================================
-- Turmalina — super_admin com acesso global
-- -----------------------------------------------------------------------------
-- O papel global `super_admin` administra o SaaS e não pertence a uma escola.
-- As policies existentes nas tabelas acadêmicas usam `auth_institution()` e,
-- portanto, negam escrita para esse papel. Esta migration adiciona policies
-- permissivas para `super_admin` nas tabelas que o app pode tocar ao carregar
-- ou operar o painel.
--
-- Executar após 0015 e 0016.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Função auxiliar (idempotente)
-- -----------------------------------------------------------------------------

create or replace function public.auth_eh_super_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $fn$
begin
  return coalesce(public.auth_papel() = 'super_admin', false);
exception
  when others then
    return false;
end;
$fn$;

-- -----------------------------------------------------------------------------
-- Policies de acesso global
-- -----------------------------------------------------------------------------

alter table public.disciplinas enable row level security;

drop policy if exists disciplinas_super_admin on public.disciplinas;
create policy disciplinas_super_admin
  on public.disciplinas
  for all
  using (public.auth_eh_super_admin())
  with check (public.auth_eh_super_admin());

alter table public.acoes_gamificacao enable row level security;

drop policy if exists acoes_gamificacao_super_admin on public.acoes_gamificacao;
create policy acoes_gamificacao_super_admin
  on public.acoes_gamificacao
  for all
  using (public.auth_eh_super_admin())
  with check (public.auth_eh_super_admin());

alter table public.conquistas enable row level security;

drop policy if exists conquistas_super_admin on public.conquistas;
create policy conquistas_super_admin
  on public.conquistas
  for all
  using (public.auth_eh_super_admin())
  with check (public.auth_eh_super_admin());

alter table public.professores enable row level security;

drop policy if exists professores_super_admin on public.professores;
create policy professores_super_admin
  on public.professores
  for all
  using (public.auth_eh_super_admin())
  with check (public.auth_eh_super_admin());
