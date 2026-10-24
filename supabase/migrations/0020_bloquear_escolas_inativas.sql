-- -----------------------------------------------------------------------------
-- 0020 — Bloquear acesso a escolas inativas
-- -----------------------------------------------------------------------------
-- A inativação deve revogar o acesso inclusive para sessões já abertas. Todas
-- as policies acadêmicas usam auth_institution(), então a validação central
-- garante o bloqueio sem alterar cada policy.
-- -----------------------------------------------------------------------------

create or replace function public.auth_institution()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    -- Uma seleção existente tem precedência, mesmo quando ficou inativa.
    -- Nesse caso não se troca de escola implicitamente: a sessão perde acesso
    -- até que o usuário escolha explicitamente outra escola ativa.
    when exists (
      select 1
      from public.instituicoes_ativas ia
      where ia.user_id = auth.uid()
    ) then (
      select ia.institution_id
      from public.instituicoes_ativas ia
      join public.perfis p
        on p.user_id = ia.user_id
       and p.institution_id = ia.institution_id
       and p.ativo
      join public.instituicoes i
        on i.institution_id = ia.institution_id
       and coalesce(i.status, 'ativa') = 'ativa'
      where ia.user_id = auth.uid()
      limit 1
    )
    else (
      select case
        when count(*) = 1 then min(p.institution_id)
        else null
      end
      from public.perfis p
      join public.instituicoes i
        on i.institution_id = p.institution_id
       and coalesce(i.status, 'ativa') = 'ativa'
      where p.user_id = auth.uid()
        and p.ativo
    )
  end;
$$;
