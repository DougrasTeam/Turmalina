create table if not exists public.horarios_turma (
  id text primary key,
  institution_id text not null default 'instituicao-padrao',
  turma_id text not null references public.turmas(id) on delete cascade,
  dia_semana text not null
    check (dia_semana in ('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo')),
  inicio time not null,
  fim time not null,
  disciplina_id text not null references public.disciplinas(id) on delete cascade,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint horarios_turma_faixa_valida check (fim > inicio)
);

create index if not exists horarios_turma_busca_idx
  on public.horarios_turma (institution_id, turma_id, dia_semana, inicio);

create or replace function public.validar_horario_turma()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.turmas as turma
    join public.disciplinas as disciplina
      on disciplina.id = new.disciplina_id
     and disciplina.institution_id = new.institution_id
     and disciplina.ativa
    where turma.id = new.turma_id
      and turma.institution_id = new.institution_id
      and new.disciplina_id = any(turma.disciplina_ids)
  ) then
    raise exception 'A disciplina precisa estar ativa e ofertada nesta turma.'
      using errcode = '23514';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(new.institution_id || ':' || new.turma_id || ':' || new.dia_semana, 0)
  );

  if exists (
    select 1
    from public.horarios_turma as horario
    where horario.institution_id = new.institution_id
      and horario.turma_id = new.turma_id
      and horario.dia_semana = new.dia_semana
      and horario.id <> new.id
      and new.inicio < horario.fim
      and new.fim > horario.inicio
  ) then
    raise exception 'Este horário se sobrepõe a outra aula da turma.'
      using errcode = '23P01';
  end if;

  return new;
end;
$$;

drop trigger if exists horarios_turma_validar on public.horarios_turma;
create trigger horarios_turma_validar
  before insert or update on public.horarios_turma
  for each row execute function public.validar_horario_turma();

alter table public.horarios_turma enable row level security;

drop policy if exists horarios_turma_leitura on public.horarios_turma;
create policy horarios_turma_leitura on public.horarios_turma
  for select using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_tem_vinculo(turma_id, disciplina_id)
    )
  );

drop policy if exists horarios_turma_escrita on public.horarios_turma;
create policy horarios_turma_escrita on public.horarios_turma
  for all
  using (
    institution_id = public.auth_institution()
    and public.eh_administrador()
  )
  with check (
    institution_id = public.auth_institution()
    and public.eh_administrador()
  );
