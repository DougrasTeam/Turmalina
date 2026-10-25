create table if not exists public.grades_horarias_turmas (
  id text primary key,
  institution_id text not null default 'instituicao-padrao',
  turma_id text not null references public.turmas(id) on delete cascade,
  inicio time not null default '08:00',
  minutos_por_aula integer not null default 50
    check (minutos_por_aula between 1 and 240),
  linhas jsonb not null default '[]'::jsonb
    check (jsonb_typeof(linhas) = 'array'),
  aulas jsonb not null default '[]'::jsonb
    check (jsonb_typeof(aulas) = 'array'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint grades_horarias_turmas_unica unique (institution_id, turma_id)
);

alter table public.grades_horarias_turmas enable row level security;
grant select, insert, update, delete on public.grades_horarias_turmas to authenticated;

drop policy if exists grades_horarias_turmas_leitura on public.grades_horarias_turmas;
create policy grades_horarias_turmas_leitura on public.grades_horarias_turmas
  for select using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_tem_acesso_turma(turma_id)
    )
  );

drop policy if exists grades_horarias_turmas_escrita on public.grades_horarias_turmas;
create policy grades_horarias_turmas_escrita on public.grades_horarias_turmas
  for all
  using (
    institution_id = public.auth_institution()
    and public.eh_administrador()
  )
  with check (
    institution_id = public.auth_institution()
    and public.eh_administrador()
  );

create or replace function public.validar_grade_horaria_turma()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_turma public.turmas%rowtype;
  v_linha record;
  v_aula jsonb;
  v_linha_inicio integer;
  v_linha_atual jsonb;
  v_indice integer;
  v_quantidade integer;
  v_ocupadas text[] := array[]::text[];
  v_chave text;
  v_duracao_total integer := 0;
begin
  select turma.*
    into v_turma
    from public.turmas as turma
   where turma.id = new.turma_id
     and turma.institution_id = new.institution_id;

  if not found then
    raise exception 'A turma não pertence à escola da grade.'
      using errcode = '23503';
  end if;

  if cardinality(v_turma.disciplina_ids) = 0 and jsonb_array_length(new.aulas) > 0 then
    raise exception 'A turma não possui disciplinas ofertadas para a grade.'
      using errcode = '23514';
  end if;

  if jsonb_typeof(new.linhas) <> 'array' or jsonb_typeof(new.aulas) <> 'array' then
    raise exception 'A estrutura da grade é inválida.'
      using errcode = '23514';
  end if;

  for v_linha in
    select linha.value, linha.ordinality
      from jsonb_array_elements(new.linhas) with ordinality as linha(value, ordinality)
  loop
    if coalesce(v_linha.value->>'id', '') = '' then
      raise exception 'Cada linha da grade precisa de um identificador.'
        using errcode = '23514';
    end if;

    if v_linha.value->>'tipo' = 'aula' then
      v_duracao_total := v_duracao_total + new.minutos_por_aula;
    elsif v_linha.value->>'tipo' = 'intervalo'
      and coalesce(v_linha.value->>'duracaoMinutos', '') ~ '^[0-9]+$'
      and (v_linha.value->>'duracaoMinutos')::integer > 0 then
      v_duracao_total := v_duracao_total + (v_linha.value->>'duracaoMinutos')::integer;
    else
      raise exception 'O tipo ou duração de uma linha da grade é inválido.'
        using errcode = '23514';
    end if;
  end loop;

  if extract(epoch from (new.inicio - time '00:00'))::integer / 60 + v_duracao_total > 1440 then
    raise exception 'A grade não pode ultrapassar o fim do dia.'
      using errcode = '23514';
  end if;

  for v_aula in
    select aula.value
      from jsonb_array_elements(new.aulas) as aula(value)
  loop
    if coalesce(v_aula->>'diaSemana', '') not in ('segunda', 'terca', 'quarta', 'quinta', 'sexta') then
      raise exception 'O dia da aula não pertence à semana letiva.'
        using errcode = '23514';
    end if;

    if not exists (
      select 1
        from public.disciplinas as disciplina
       where disciplina.id = v_aula->>'disciplinaId'
         and disciplina.institution_id = new.institution_id
         and disciplina.ativa
         and disciplina.id = any(v_turma.disciplina_ids)
    ) then
      raise exception 'A disciplina da aula deve estar ativa e ofertada na turma.'
        using errcode = '23503';
    end if;

    if coalesce(v_aula->>'quantidadeAulas', '') !~ '^[1-9][0-9]*$' then
      raise exception 'A quantidade de aulas é inválida.'
        using errcode = '23514';
    end if;
    v_quantidade := (v_aula->>'quantidadeAulas')::integer;
    if v_quantidade > jsonb_array_length(new.linhas) then
      raise exception 'A quantidade de aulas excede as linhas disponíveis.'
        using errcode = '23514';
    end if;
    v_linha_inicio := null;

    for v_linha in
      select linha.value, linha.ordinality
        from jsonb_array_elements(new.linhas) with ordinality as linha(value, ordinality)
    loop
      if v_linha.value->>'id' = v_aula->>'linhaInicioId' then
        v_linha_inicio := v_linha.ordinality::integer;
        if v_linha.value->>'tipo' <> 'aula' then
          raise exception 'Uma aula deve começar em uma linha de aula.'
            using errcode = '23514';
        end if;
        exit;
      end if;
    end loop;

    if v_linha_inicio is null then
      raise exception 'A linha inicial da aula não existe na grade.'
        using errcode = '23514';
    end if;

    for v_indice in v_linha_inicio..(v_linha_inicio + v_quantidade - 1)
    loop
      select linha.value
        into v_linha_atual
        from jsonb_array_elements(new.linhas) with ordinality as linha(value, ordinality)
       where linha.ordinality = v_indice;

      if v_linha_atual is null or v_linha_atual->>'tipo' <> 'aula' then
        raise exception 'Uma aula não pode atravessar um intervalo ou o fim da grade.'
          using errcode = '23514';
      end if;

      v_chave := (v_aula->>'diaSemana') || ':' || (v_linha_atual->>'id');
      if v_chave = any(v_ocupadas) then
        raise exception 'Há duas disciplinas ocupando a mesma aula no mesmo dia.'
          using errcode = '23P01';
      end if;
      v_ocupadas := array_append(v_ocupadas, v_chave);
    end loop;
  end loop;

  return new;
end;
$$;

drop trigger if exists grades_horarias_turmas_validar on public.grades_horarias_turmas;
create trigger grades_horarias_turmas_validar
  before insert or update on public.grades_horarias_turmas
  for each row execute function public.validar_grade_horaria_turma();

create or replace function public.limpar_grade_apos_excluir_disciplina()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.grades_horarias_turmas as grade
     set aulas = coalesce(
       (
         select jsonb_agg(aula.value)
           from jsonb_array_elements(grade.aulas) as aula(value)
          where aula.value->>'disciplinaId' <> old.id
       ),
       '[]'::jsonb
     ),
         atualizado_em = now()
   where grade.institution_id = old.institution_id
     and grade.aulas @> jsonb_build_array(jsonb_build_object('disciplinaId', old.id));
  return old;
end;
$$;

drop trigger if exists disciplinas_limpar_grade_horaria on public.disciplinas;
create trigger disciplinas_limpar_grade_horaria
  after delete on public.disciplinas
  for each row execute function public.limpar_grade_apos_excluir_disciplina();

drop trigger if exists disciplinas_inativar_grade_horaria on public.disciplinas;
create trigger disciplinas_inativar_grade_horaria
  after update of ativa on public.disciplinas
  for each row
  when (old.ativa and not new.ativa)
  execute function public.limpar_grade_apos_excluir_disciplina();

create or replace function public.limpar_grade_apos_atualizar_oferta_turma()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.grades_horarias_turmas as grade
     set aulas = coalesce(
       (
         select jsonb_agg(aula.value)
           from jsonb_array_elements(grade.aulas) as aula(value)
          where aula.value->>'disciplinaId' = any(new.disciplina_ids)
       ),
       '[]'::jsonb
     ),
         atualizado_em = now()
   where grade.institution_id = new.institution_id
     and grade.turma_id = new.id
     and exists (
       select 1
         from jsonb_array_elements(grade.aulas) as aula(value)
        where not (aula.value->>'disciplinaId' = any(new.disciplina_ids))
     );
  return new;
end;
$$;

drop trigger if exists turmas_limpar_grade_horaria on public.turmas;
create trigger turmas_limpar_grade_horaria
  after update of disciplina_ids on public.turmas
  for each row
  when (old.disciplina_ids is distinct from new.disciplina_ids)
  execute function public.limpar_grade_apos_atualizar_oferta_turma();
