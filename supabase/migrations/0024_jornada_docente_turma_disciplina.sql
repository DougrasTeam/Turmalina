-- Turmalina — escopo docente por turma e disciplina.
-- Aplicar depois da migration 0023.

-- Publicações podem ser gerais para a turma ou específicas de uma disciplina.
alter table public.publicacoes
  add column if not exists disciplina_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.publicacoes'::regclass
      and conname = 'publicacoes_disciplina_id_fkey'
  ) then
    alter table public.publicacoes
      add constraint publicacoes_disciplina_id_fkey
      foreign key (disciplina_id)
      references public.disciplinas (id)
      on delete restrict;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.publicacoes'::regclass
      and conname = 'publicacoes_disciplina_exige_turma'
  ) then
    alter table public.publicacoes
      add constraint publicacoes_disciplina_exige_turma
      check (disciplina_id is null or turma_id is not null);
  end if;
end;
$$;

create index if not exists idx_publicacoes_turma_disciplina
  on public.publicacoes (turma_id, disciplina_id);

-- O vínculo por user_id é preferencial. E-mail só serve para cadastros legados
-- sem user_id e nunca substitui um vínculo explícito com outra conta.
create or replace function public.professor_autenticado(p_professor_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    public.auth_papel() = 'professor'
    and exists (
      select 1
      from public.professores as professor
      where professor.id = p_professor_id
        and professor.institution_id = public.auth_institution()
        and professor.ativo
        and (
          professor.user_id = auth.uid()
          or (
            professor.user_id is null
            and lower(btrim(professor.email)) =
              lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
          )
        )
    ),
    false
  );
$$;

-- A designação antiga professor_ids continua permitindo a visão geral da
-- turma; operações disciplinares exigem um vínculo ativo explícito.
create or replace function public.professor_tem_acesso_turma(p_turma_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    public.auth_papel() = 'professor'
    and exists (
      select 1
      from public.turmas as turma
      join public.professores as professor
        on professor.institution_id = turma.institution_id
       and (
         professor.id = any (turma.professor_ids)
         or exists (
           select 1
           from public.vinculos_docentes as vinculo
           where vinculo.professor_id = professor.id
             and vinculo.turma_id = turma.id
             and vinculo.institution_id = turma.institution_id
             and vinculo.ativo
         )
       )
      where turma.id = p_turma_id
        and turma.institution_id = public.auth_institution()
        and professor.ativo
        and (
          professor.user_id = auth.uid()
          or (
            professor.user_id is null
            and lower(btrim(professor.email)) =
              lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
          )
        )
    ),
    false
  );
$$;

create or replace function public.professor_tem_vinculo(
  p_turma_id text,
  p_disciplina_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    public.auth_papel() = 'professor'
    and exists (
      select 1
      from public.vinculos_docentes as vinculo
      join public.professores as professor
        on professor.id = vinculo.professor_id
       and professor.institution_id = vinculo.institution_id
      join public.turmas as turma
        on turma.id = vinculo.turma_id
       and turma.institution_id = vinculo.institution_id
      join public.disciplinas as disciplina
        on disciplina.id = vinculo.disciplina_id
       and disciplina.institution_id = vinculo.institution_id
      where vinculo.turma_id = p_turma_id
        and vinculo.disciplina_id = p_disciplina_id
        and vinculo.institution_id = public.auth_institution()
        and vinculo.ativo
        and professor.ativo
        and disciplina.ativa
        and vinculo.disciplina_id = any (turma.disciplina_ids)
        and (
          professor.user_id = auth.uid()
          or (
            professor.user_id is null
            and lower(btrim(professor.email)) =
              lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
          )
        )
    ),
    false
  );
$$;

create or replace function public.professor_pode_aluno(p_aluno_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    exists (
      select 1
      from public.alunos as aluno
      where aluno.id = p_aluno_id
        and aluno.institution_id = public.auth_institution()
        and aluno.turma_id is not null
        and public.professor_tem_acesso_turma(aluno.turma_id)
    ),
    false
  );
$$;

create or replace function public.professor_pode_aluno_na_turma(
  p_aluno_id text,
  p_turma_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    exists (
      select 1
      from public.alunos as aluno
      where aluno.id = p_aluno_id
        and aluno.institution_id = public.auth_institution()
        and aluno.turma_id = p_turma_id
        and public.professor_tem_acesso_turma(p_turma_id)
    ),
    false
  );
$$;

create or replace function public.professor_pode_avaliacao(p_avaliacao_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    exists (
      select 1
      from public.avaliacoes as avaliacao
      where avaliacao.id = p_avaliacao_id
        and avaliacao.institution_id = public.auth_institution()
        and public.professor_tem_vinculo(avaliacao.turma_id, avaliacao.disciplina_id)
    ),
    false
  );
$$;

create or replace function public.professor_pode_lancar_nota(
  p_avaliacao_id text,
  p_aluno_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    exists (
      select 1
      from public.avaliacoes as avaliacao
      join public.alunos as aluno
        on aluno.turma_id = avaliacao.turma_id
       and aluno.institution_id = avaliacao.institution_id
      where avaliacao.id = p_avaliacao_id
        and avaliacao.institution_id = public.auth_institution()
        and aluno.id = p_aluno_id
        and public.professor_tem_vinculo(avaliacao.turma_id, avaliacao.disciplina_id)
    ),
    false
  );
$$;

create or replace function public.professor_pode_frequencia(p_frequencia_id text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    exists (
      select 1
      from public.frequencias as frequencia
      where frequencia.id = p_frequencia_id
        and frequencia.institution_id = public.auth_institution()
        and (
          (
            frequencia.disciplina_id is null
            and public.professor_tem_acesso_turma(frequencia.turma_id)
          )
          or public.professor_tem_vinculo(
            frequencia.turma_id,
            frequencia.disciplina_id
          )
        )
    ),
    false
  );
$$;

create or replace function public.professor_pode_presenca(
  p_frequencia_id text,
  p_aluno_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    exists (
      select 1
      from public.frequencias as frequencia
      join public.alunos as aluno
        on aluno.turma_id = frequencia.turma_id
       and aluno.institution_id = frequencia.institution_id
      where frequencia.id = p_frequencia_id
        and frequencia.institution_id = public.auth_institution()
        and aluno.id = p_aluno_id
        and public.professor_pode_frequencia(frequencia.id)
    ),
    false
  );
$$;

create or replace function public.professor_pode_equipe(
  p_equipe_id text,
  p_turma_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    exists (
      select 1
      from public.equipes as equipe
      where equipe.id = p_equipe_id
        and equipe.turma_id = p_turma_id
        and equipe.institution_id = public.auth_institution()
        and (
          (
            equipe.disciplina_id is null
            and public.professor_tem_acesso_turma(equipe.turma_id)
          )
          or public.professor_tem_vinculo(equipe.turma_id, equipe.disciplina_id)
        )
    ),
    false
  );
$$;

revoke all on function public.professor_autenticado(text) from public;
revoke all on function public.professor_tem_acesso_turma(text) from public;
revoke all on function public.professor_tem_vinculo(text, text) from public;
revoke all on function public.professor_pode_aluno(text) from public;
revoke all on function public.professor_pode_aluno_na_turma(text, text) from public;
revoke all on function public.professor_pode_avaliacao(text) from public;
revoke all on function public.professor_pode_lancar_nota(text, text) from public;
revoke all on function public.professor_pode_frequencia(text) from public;
revoke all on function public.professor_pode_presenca(text, text) from public;
revoke all on function public.professor_pode_equipe(text, text) from public;

grant execute on function public.professor_autenticado(text) to authenticated;
grant execute on function public.professor_tem_acesso_turma(text) to authenticated;
grant execute on function public.professor_tem_vinculo(text, text) to authenticated;
grant execute on function public.professor_pode_aluno(text) to authenticated;
grant execute on function public.professor_pode_aluno_na_turma(text, text) to authenticated;
grant execute on function public.professor_pode_avaliacao(text) to authenticated;
grant execute on function public.professor_pode_lancar_nota(text, text) to authenticated;
grant execute on function public.professor_pode_frequencia(text) to authenticated;
grant execute on function public.professor_pode_presenca(text, text) to authenticated;
grant execute on function public.professor_pode_equipe(text, text) to authenticated;

-- Cadastro escolar visível ao professor apenas nas turmas sob sua responsabilidade.
drop policy if exists turmas_leitura on public.turmas;
create policy turmas_leitura on public.turmas
  for select using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_tem_acesso_turma(id)
    )
  );

drop policy if exists professores_leitura on public.professores;
create policy professores_leitura on public.professores
  for select using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_autenticado(id)
      or exists (
        select 1
        from public.turmas as turma
        where turma.institution_id = professores.institution_id
          and professores.id = any (turma.professor_ids)
          and public.professor_tem_acesso_turma(turma.id)
      )
      or exists (
        select 1
        from public.vinculos_docentes as vinculo
        where vinculo.professor_id = professores.id
          and vinculo.institution_id = professores.institution_id
          and public.professor_tem_acesso_turma(vinculo.turma_id)
      )
    )
  );

drop policy if exists vinculos_docentes_leitura on public.vinculos_docentes;
create policy vinculos_docentes_leitura on public.vinculos_docentes
  for select using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_tem_acesso_turma(turma_id)
    )
  );

drop policy if exists alunos_leitura on public.alunos;
create policy alunos_leitura on public.alunos
  for select using (
    (
      institution_id = public.auth_institution()
      and (
        public.eh_administrador()
        or public.professor_tem_acesso_turma(turma_id)
      )
    )
    or user_id = auth.uid()
  );

drop policy if exists matriculas_leitura on public.matriculas;
create policy matriculas_leitura on public.matriculas
  for select using (
    (
      institution_id = public.auth_institution()
      and (
        public.eh_administrador()
        or public.professor_tem_acesso_turma(turma_id)
      )
    )
    or aluno_id = public.auth_aluno_id()
  );

-- Avaliações e notas ficam limitadas ao vínculo ativo turma-disciplina.
drop policy if exists avaliacoes_leitura on public.avaliacoes;
create policy avaliacoes_leitura on public.avaliacoes
  for select using (
    (
      institution_id = public.auth_institution()
      and (
        public.eh_administrador()
        or public.professor_tem_vinculo(turma_id, disciplina_id)
      )
    )
    or (
      institution_id = public.auth_institution()
      and status = 'publicada'
      and turma_id = public.auth_turma_id()
    )
  );

drop policy if exists avaliacoes_escrita on public.avaliacoes;
create policy avaliacoes_escrita on public.avaliacoes
  for all
  using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_tem_vinculo(turma_id, disciplina_id)
    )
  )
  with check (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_tem_vinculo(turma_id, disciplina_id)
    )
  );

drop policy if exists notas_leitura on public.notas;
create policy notas_leitura on public.notas
  for select using (
    (
      institution_id = public.auth_institution()
      and (
        public.eh_administrador()
        or public.professor_pode_lancar_nota(avaliacao_id, aluno_id)
      )
    )
    or aluno_id = public.auth_aluno_id()
  );

drop policy if exists notas_escrita on public.notas;
create policy notas_escrita on public.notas
  for all
  using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_pode_lancar_nota(avaliacao_id, aluno_id)
    )
  )
  with check (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_pode_lancar_nota(avaliacao_id, aluno_id)
    )
  );

-- Frequência nula continua geral para a turma; frequência disciplinar exige
-- vínculo ativo específico. Registros de presença também precisam pertencer
-- a um aluno da turma da chamada.
drop policy if exists frequencias_leitura on public.frequencias;
create policy frequencias_leitura on public.frequencias
  for select using (
    (
      institution_id = public.auth_institution()
      and (
        public.eh_administrador()
        or (
          (
            disciplina_id is null
            and public.professor_tem_acesso_turma(turma_id)
          )
          or public.professor_tem_vinculo(turma_id, disciplina_id)
        )
      )
    )
    or turma_id = public.auth_turma_id()
  );

drop policy if exists frequencias_escrita on public.frequencias;
create policy frequencias_escrita on public.frequencias
  for all
  using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_pode_frequencia(id)
    )
  )
  with check (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        (
          disciplina_id is null
          and public.professor_tem_acesso_turma(turma_id)
        )
        or public.professor_tem_vinculo(turma_id, disciplina_id)
      )
    )
  );

drop policy if exists presencas_leitura on public.presencas;
create policy presencas_leitura on public.presencas
  for select using (
    (
      institution_id = public.auth_institution()
      and (
        public.eh_administrador()
        or public.professor_pode_presenca(frequencia_id, aluno_id)
      )
    )
    or aluno_id = public.auth_aluno_id()
  );

drop policy if exists presencas_escrita on public.presencas;
create policy presencas_escrita on public.presencas
  for all
  using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_pode_presenca(frequencia_id, aluno_id)
    )
  )
  with check (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_pode_presenca(frequencia_id, aluno_id)
    )
  );

-- Mural: professores veem posts gerais da escola e posts das turmas acessíveis;
-- posts disciplinares e gravações exigem vínculo ativo. Aluno mantém acesso
-- somente às publicações vigentes da própria turma.
drop policy if exists publicacoes_leitura on public.publicacoes;
create policy publicacoes_leitura on public.publicacoes
  for select using (
    (
      institution_id = public.auth_institution()
      and public.eh_administrador()
      and (
        disciplina_id is null
        or exists (
          select 1
          from public.turmas as turma
          join public.disciplinas as disciplina
            on disciplina.id = publicacoes.disciplina_id
           and disciplina.institution_id = turma.institution_id
          where turma.id = publicacoes.turma_id
            and turma.institution_id = publicacoes.institution_id
            and disciplina.id = any (turma.disciplina_ids)
        )
      )
    )
    or (
      institution_id = public.auth_institution()
      and public.auth_papel() = 'professor'
      and (
        turma_id is null
        or (
          public.professor_tem_acesso_turma(turma_id)
          and (
            disciplina_id is null
            or public.professor_tem_vinculo(turma_id, disciplina_id)
          )
        )
      )
    )
    or (
      institution_id = public.auth_institution()
      and status = 'publicada'
      and (turma_id is null or turma_id = public.auth_turma_id())
      and (expira_em is null or expira_em >= current_date)
    )
  );

drop policy if exists publicacoes_escrita on public.publicacoes;
create policy publicacoes_escrita on public.publicacoes
  for all
  using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      and (
        disciplina_id is null
        or exists (
          select 1
          from public.turmas as turma
          join public.disciplinas as disciplina
            on disciplina.id = publicacoes.disciplina_id
           and disciplina.institution_id = turma.institution_id
          where turma.id = publicacoes.turma_id
            and turma.institution_id = publicacoes.institution_id
            and disciplina.id = any (turma.disciplina_ids)
        )
      )
      or (
        public.auth_papel() = 'professor'
        and turma_id is not null
        and public.professor_tem_acesso_turma(turma_id)
        and (
          disciplina_id is null
          or public.professor_tem_vinculo(turma_id, disciplina_id)
        )
      )
    )
  )
  with check (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      and (
        disciplina_id is null
        or exists (
          select 1
          from public.turmas as turma
          join public.disciplinas as disciplina
            on disciplina.id = publicacoes.disciplina_id
           and disciplina.institution_id = turma.institution_id
          where turma.id = publicacoes.turma_id
            and turma.institution_id = publicacoes.institution_id
            and disciplina.id = any (turma.disciplina_ids)
        )
      )
      or (
        public.auth_papel() = 'professor'
        and turma_id is not null
        and public.professor_tem_acesso_turma(turma_id)
        and (
          disciplina_id is null
          or public.professor_tem_vinculo(turma_id, disciplina_id)
        )
      )
    )
  );

-- Agenda e comunicados são da turma, não da disciplina. Professores só operam
-- nos dados de turmas às quais estão vinculados/designados.
drop policy if exists eventos_leitura on public.eventos;
create policy eventos_leitura on public.eventos
  for select using (
    (
      institution_id = public.auth_institution()
      and public.eh_administrador()
    )
    or (
      institution_id = public.auth_institution()
      and public.auth_papel() = 'professor'
      and (
        turma_id is null
        or public.professor_tem_acesso_turma(turma_id)
      )
    )
    or (
      institution_id = public.auth_institution()
      and (turma_id is null or turma_id = public.auth_turma_id())
    )
  );

drop policy if exists eventos_escrita on public.eventos;
create policy eventos_escrita on public.eventos
  for all
  using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        public.auth_papel() = 'professor'
        and turma_id is not null
        and public.professor_tem_acesso_turma(turma_id)
      )
    )
  )
  with check (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        public.auth_papel() = 'professor'
        and turma_id is not null
        and public.professor_tem_acesso_turma(turma_id)
      )
    )
  );

drop policy if exists comunicados_leitura on public.comunicados;
create policy comunicados_leitura on public.comunicados
  for select using (
    (
      institution_id = public.auth_institution()
      and public.eh_administrador()
    )
    or (
      institution_id = public.auth_institution()
      and public.auth_papel() = 'professor'
      and public.professor_pode_aluno(aluno_id)
    )
    or (
      institution_id = public.auth_institution()
      and tipo = 'recado'
      and aluno_id = public.auth_aluno_id()
    )
  );

drop policy if exists comunicados_escrita on public.comunicados;
create policy comunicados_escrita on public.comunicados
  for all
  using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        public.auth_papel() = 'professor'
        and public.professor_pode_aluno(aluno_id)
      )
    )
  )
  with check (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        public.auth_papel() = 'professor'
        and public.professor_pode_aluno(aluno_id)
      )
    )
  );

-- Gamificação e equipes são recursos de turma; equipes disciplinares exigem
-- o vínculo da disciplina correspondente.
drop policy if exists eventos_xp_leitura on public.eventos_xp;
create policy eventos_xp_leitura on public.eventos_xp
  for select using (
    (
      institution_id = public.auth_institution()
      and public.eh_administrador()
    )
    or (
      institution_id = public.auth_institution()
      and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
    )
    or aluno_id = public.auth_aluno_id()
  );

drop policy if exists eventos_xp_insercao on public.eventos_xp;
create policy eventos_xp_insercao on public.eventos_xp
  for insert with check (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        turma_id is not null
        and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
      )
    )
  );

drop policy if exists alunos_xp_escrita on public.alunos;
create policy alunos_xp_escrita on public.alunos
  for update
  using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_tem_acesso_turma(turma_id)
    )
  )
  with check (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_tem_acesso_turma(turma_id)
    )
  );

drop policy if exists movimentacoes_moedas_leitura on public.movimentacoes_moedas;
create policy movimentacoes_moedas_leitura on public.movimentacoes_moedas
  for select using (
    (
      institution_id = public.auth_institution()
      and public.eh_administrador()
    )
    or (
      institution_id = public.auth_institution()
      and turma_id is not null
      and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
    )
    or aluno_id = public.auth_aluno_id()
  );

drop policy if exists movimentacoes_moedas_insercao on public.movimentacoes_moedas;
create policy movimentacoes_moedas_insercao on public.movimentacoes_moedas
  for insert with check (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        turma_id is not null
        and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
      )
    )
  );

drop policy if exists conquistas_aluno_leitura on public.conquistas_aluno;
create policy conquistas_aluno_leitura on public.conquistas_aluno
  for select using (
    (
      institution_id = public.auth_institution()
      and public.eh_administrador()
    )
    or (
      institution_id = public.auth_institution()
      and public.professor_pode_aluno(aluno_id)
    )
    or aluno_id = public.auth_aluno_id()
  );

drop policy if exists conquistas_aluno_insercao on public.conquistas_aluno;
create policy conquistas_aluno_insercao on public.conquistas_aluno
  for insert with check (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_pode_aluno(aluno_id)
    )
  );

drop policy if exists equipes_leitura on public.equipes;
create policy equipes_leitura on public.equipes
  for select using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        disciplina_id is null
        and public.professor_tem_acesso_turma(turma_id)
      )
      or public.professor_tem_vinculo(turma_id, disciplina_id)
    )
  );

drop policy if exists equipes_escrita on public.equipes;
create policy equipes_escrita on public.equipes
  for all
  using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        disciplina_id is null
        and public.professor_tem_acesso_turma(turma_id)
      )
      or public.professor_tem_vinculo(turma_id, disciplina_id)
    )
  )
  with check (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        disciplina_id is null
        and public.professor_tem_acesso_turma(turma_id)
      )
      or public.professor_tem_vinculo(turma_id, disciplina_id)
    )
  );

drop policy if exists equipe_membros_leitura on public.equipe_membros;
create policy equipe_membros_leitura on public.equipe_membros
  for select using (
    (
      institution_id = public.auth_institution()
      and (
        public.eh_administrador()
        or public.professor_pode_equipe(equipe_id, turma_id)
          and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
      )
    )
    or aluno_id = public.auth_aluno_id()
  );

drop policy if exists equipe_membros_escrita on public.equipe_membros;
create policy equipe_membros_escrita on public.equipe_membros
  for all
  using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_pode_equipe(equipe_id, turma_id)
        and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
    )
  )
  with check (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_pode_equipe(equipe_id, turma_id)
    )
  );
