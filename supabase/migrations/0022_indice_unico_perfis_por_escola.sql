-- -----------------------------------------------------------------------------
-- 0022 — Garantir unicidade do vínculo perfil/usuário/escola
-- -----------------------------------------------------------------------------
-- Cada conta pode ter no máximo um perfil por escola. Este índice também é o
-- alvo de conflito para operações que precisem fazer upsert desse vínculo.
-- -----------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from public.perfis
    group by user_id, institution_id
    having count(*) > 1
  ) then
    raise exception
      'Não é possível criar perfis_user_institution_unico: existem vínculos de perfil duplicados por usuário e escola. Revise-os manualmente antes de reaplicar a migration.';
  end if;
end;
$$;

create unique index if not exists perfis_user_institution_unico
  on public.perfis (user_id, institution_id);
