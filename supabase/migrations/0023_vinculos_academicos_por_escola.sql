-- -----------------------------------------------------------------------------
-- 0023 — Permitir o mesmo usuário Auth em registros de diferentes escolas
-- -----------------------------------------------------------------------------
-- O vínculo é único dentro de cada instituição, não globalmente: professores e
-- alunos podem usar uma única conta Auth em mais de uma escola.
-- -----------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from public.professores
    where user_id is not null
    group by user_id, institution_id
    having count(*) > 1
  ) then
    raise exception
      'Não é possível criar professores_user_institution_unico: existem vínculos duplicados por usuário e escola. Revise-os manualmente antes de reaplicar a migration.';
  end if;

  if exists (
    select 1
    from public.alunos
    where user_id is not null
    group by user_id, institution_id
    having count(*) > 1
  ) then
    raise exception
      'Não é possível criar alunos_user_institution_unico: existem vínculos duplicados por usuário e escola. Revise-os manualmente antes de reaplicar a migration.';
  end if;
end;
$$;

create unique index if not exists professores_user_institution_unico
  on public.professores (user_id, institution_id);

create unique index if not exists alunos_user_institution_unico
  on public.alunos (user_id, institution_id);

alter table public.professores
  drop constraint if exists professores_user_id_key;

alter table public.alunos
  drop constraint if exists alunos_user_id_key;
