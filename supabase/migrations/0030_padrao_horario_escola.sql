-- =============================================================================
-- Turmalina - padrão de horário da escola
-- -----------------------------------------------------------------------------
-- Guarda a estrutura base da manhã e da tarde para reutilização nas grades das
-- turmas. Cada escola possui no máximo um padrão.
--
-- Deve ser executado após 0028. É idempotente.
-- =============================================================================

create table if not exists public.padroes_horarios_escola (
  id text primary key,
  institution_id text not null default 'instituicao-padrao',
  inicio_manha time not null default '07:30',
  aulas_manha integer not null default 5
    check (aulas_manha between 1 and 15),
  inicio_tarde time not null default '13:00',
  aulas_tarde integer not null default 5
    check (aulas_tarde between 1 and 15),
  minutos_por_aula integer not null default 50
    check (minutos_por_aula between 1 and 240),
  minutos_intervalo integer not null default 15
    check (minutos_intervalo between 1 and 120),
  intervalo_apos_aulas integer not null default 3
    check (intervalo_apos_aulas between 1 and 15),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint padroes_horarios_escola_unico unique (institution_id)
);

alter table public.padroes_horarios_escola enable row level security;
grant select, insert, update, delete on public.padroes_horarios_escola to authenticated;

drop policy if exists padroes_horarios_escola_leitura on public.padroes_horarios_escola;
create policy padroes_horarios_escola_leitura on public.padroes_horarios_escola
  for select using (institution_id = public.auth_institution());

drop policy if exists padroes_horarios_escola_escrita on public.padroes_horarios_escola;
create policy padroes_horarios_escola_escrita on public.padroes_horarios_escola
  for all
  using (
    institution_id = public.auth_institution()
    and public.eh_administrador()
  )
  with check (
    institution_id = public.auth_institution()
    and public.eh_administrador()
  );

insert into public.padroes_horarios_escola (
  id,
  institution_id,
  inicio_manha,
  aulas_manha,
  inicio_tarde,
  aulas_tarde,
  minutos_por_aula,
  minutos_intervalo,
  intervalo_apos_aulas
)
select
  'padrao-horario-' || instituicao.id,
  instituicao.id,
  '07:30',
  5,
  '13:00',
  5,
  50,
  15,
  3
from public.instituicoes as instituicao
on conflict (institution_id) do nothing;
