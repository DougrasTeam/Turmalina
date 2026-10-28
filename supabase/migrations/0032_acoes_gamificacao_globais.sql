-- =============================================================================
-- Turmalina - ações globais de gamificação (admin-only) + ajuste de RLS
-- =============================================================================

-- 0) Garantir colunas primeiro
alter table public.acoes_gamificacao
  add column if not exists turma_id text,
  add column if not exists disciplina_id text;

-- 1) Leitura de ações
drop policy if exists acoes_gamificacao_leitura on public.acoes_gamificacao;
create policy acoes_gamificacao_leitura on public.acoes_gamificacao
  for select using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (turma_id is null and disciplina_id is null)
      or (
        turma_id is not null
        and disciplina_id is not null
        and public.professor_tem_vinculo(turma_id, disciplina_id)
      )
      or (
        exists (
          select 1
            from public.alunos as aluno
           where aluno.id = public.auth_aluno_id()
             and aluno.turma_id = acoes_gamificacao.turma_id
             and acoes_gamificacao.turma_id is not null
             and acoes_gamificacao.disciplina_id is not null
        )
      )
    )
  );

-- 2) Escrita de ações
drop policy if exists acoes_gamificacao_escrita on public.acoes_gamificacao;
create policy acoes_gamificacao_escrita on public.acoes_gamificacao
  for all
  using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        turma_id is not null
        and disciplina_id is not null
        and public.professor_tem_vinculo(turma_id, disciplina_id)
      )
    )
  )
  with check (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        turma_id is not null
        and disciplina_id is not null
        and public.professor_tem_vinculo(turma_id, disciplina_id)
      )
    )
  );

-- 3) Semear ações globais por instituição
insert into public.acoes_gamificacao (
  id,
  institution_id,
  nome,
  icone,
  valor_xp,
  indicador,
  ativa,
  turma_id,
  disciplina_id,
  criado_em,
  atualizado_em
)
select
  'acao-global-' || inst.id || '-' || pad.suffix,
  inst.id,
  pad.nome,
  pad.icone,
  pad.valor_xp,
  pad.indicador,
  true,
  null,
  null,
  now(),
  now()
from public.instituicoes as inst
cross join (values
  ('participacao', 'Participação em aula',       'star',              10, 'participacao'),
  ('colaboracao',   'Colaboração com a equipe',   'groups',            15, 'colaboracao'),
  ('organizacao',   'Organização e pontualidade', 'check_circle',      10, 'organizacao'),
  ('ajuda',         'Ajuda a um colega',          'volunteer_activism',20, 'solidariedade'),
  ('esforco',       'Esforço e superação',        'bolt',              15, 'esforco')
) as pad(suffix, nome, icone, valor_xp, indicador)
where not exists (
  select 1
    from public.acoes_gamificacao as acao
   where acao.institution_id = inst.id
     and acao.turma_id is null
     and acao.disciplina_id is null
     and lower(acao.nome) = lower(pad.nome)
);