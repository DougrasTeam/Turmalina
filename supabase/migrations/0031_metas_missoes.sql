-- =============================================================================
-- Turmalina - metas e missões da gamificação (RF-018 e RF-019)
-- -----------------------------------------------------------------------------
-- Cria:
--   * `metas` - objetivos por turma e disciplina, ligados a um indicador das
--     ações de XP;
--   * `metas_aluno` - concessões de metas, idempotentes por aluno/meta;
--   * `missoes` - desafios por turma e disciplina, individuais ou coletivos;
--   * `missoes_aluno` - conclusões de missões, idempotentes por aluno/missão.
--
-- Também passa a guardar o indicador no histórico de XP. Isso preserva o
-- contexto do lançamento mesmo se a ação de origem for editada ou removida,
-- permitindo calcular o progresso das metas com segurança.
--
-- Regras:
--   * o administrador gerencia metas e missões da própria instituição;
--   * o professor gerencia apenas os contextos de turma + disciplina em que
--     leciona;
--   * o aluno lê as metas ativas e missões publicadas da própria turma, além
--     das próprias concessões/conclusões;
--   * concessões e conclusões são validadas pela equipe e não se duplicam;
--   * recompensas usam os ledgers existentes de XP e moedas e podem ser
--     revertidas por estorno.
--
-- Deve ser executado após 0030. É idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Contexto turma + disciplina na gamifica��o
-- -----------------------------------------------------------------------------

alter table public.acoes_gamificacao
  add column if not exists turma_id text,
  add column if not exists disciplina_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.acoes_gamificacao'::regclass
      and conname = 'acoes_gamificacao_turma_id_fkey'
  ) then
    alter table public.acoes_gamificacao
      add constraint acoes_gamificacao_turma_id_fkey
      foreign key (turma_id) references public.turmas (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.acoes_gamificacao'::regclass
      and conname = 'acoes_gamificacao_disciplina_id_fkey'
  ) then
    alter table public.acoes_gamificacao
      add constraint acoes_gamificacao_disciplina_id_fkey
      foreign key (disciplina_id) references public.disciplinas (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.acoes_gamificacao'::regclass
      and conname = 'acoes_gamificacao_contexto_check'
  ) then
    alter table public.acoes_gamificacao
      add constraint acoes_gamificacao_contexto_check
      check ((turma_id is null) = (disciplina_id is null));
  end if;
end;
$$;

alter table public.acoes_gamificacao
  drop constraint if exists acoes_gamificacao_nome_unico;

create unique index if not exists acoes_gamificacao_nome_contexto_unico
  on public.acoes_gamificacao (
    institution_id,
    coalesce(turma_id, ''),
    coalesce(disciplina_id, ''),
    lower(nome)
  );

create index if not exists idx_acoes_gamificacao_contexto
  on public.acoes_gamificacao (institution_id, turma_id, disciplina_id);

alter table public.eventos_xp
  add column if not exists disciplina_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.eventos_xp'::regclass
      and conname = 'eventos_xp_disciplina_id_fkey'
  ) then
    alter table public.eventos_xp
      add constraint eventos_xp_disciplina_id_fkey
      foreign key (disciplina_id) references public.disciplinas (id) on delete set null;
  end if;
end;
$$;

create index if not exists idx_eventos_xp_contexto
  on public.eventos_xp (institution_id, turma_id, disciplina_id);

-- -----------------------------------------------------------------------------
-- 2. Indicador no hist�rico de XP
-- -----------------------------------------------------------------------------

alter table public.eventos_xp
  add column if not exists indicador text not null default '';

update public.eventos_xp as evento
   set indicador = acao.indicador
  from public.acoes_gamificacao as acao
 where evento.acao_id = acao.id
   and evento.indicador = '';

drop index if exists public.idx_eventos_xp_indicador;

create index if not exists idx_eventos_xp_indicador
  on public.eventos_xp (institution_id, turma_id, disciplina_id, indicador)
  where delta_xp > 0 and estorno_de is null;

-- -----------------------------------------------------------------------------
-- 3. Metas
-- -----------------------------------------------------------------------------

create table if not exists public.metas (
  id                 text primary key,
  institution_id     text not null default 'instituicao-padrao',
  nome               text not null,
  descricao          text not null default '',
  turma_id           text not null references public.turmas (id) on delete cascade,
  disciplina_id      text not null references public.disciplinas (id) on delete cascade,
  indicador          text not null,
  quantidade         integer not null check (quantidade between 1 and 1000),
  recompensa_xp      integer not null default 0
                       check (recompensa_xp between 0 and 100),
  recompensa_moedas  integer not null default 0
                       check (recompensa_moedas between 0 and 1000),
  ativa              boolean not null default true,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  constraint metas_nome_unico unique (institution_id, turma_id, disciplina_id, nome),
  constraint metas_recompensa_check check (recompensa_xp + recompensa_moedas > 0)
);

-- -----------------------------------------------------------------------------
-- 4. Concessões de metas por aluno
-- -----------------------------------------------------------------------------

create table if not exists public.metas_aluno (
  id                 text primary key,
  institution_id     text not null default 'instituicao-padrao',
  meta_id            text not null references public.metas (id) on delete cascade,
  meta_nome          text not null default '',
  aluno_id           text not null references public.alunos (id) on delete cascade,
  turma_id           text not null references public.turmas (id) on delete cascade,
  disciplina_id      text not null references public.disciplinas (id) on delete cascade,
  indicador          text not null default '',
  quantidade         integer not null default 1,
  recompensa_xp      integer not null default 0,
  recompensa_moedas  integer not null default 0,
  autor_id           text,
  autor_nome         text not null default '',
  idempotency_key    text not null,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  constraint metas_aluno_unico unique (institution_id, meta_id, aluno_id),
  constraint metas_aluno_idempotencia_unica unique (institution_id, idempotency_key)
);

-- -----------------------------------------------------------------------------
-- 5. Missões
-- -----------------------------------------------------------------------------

create table if not exists public.missoes (
  id                 text primary key,
  institution_id     text not null default 'instituicao-padrao',
  nome               text not null,
  descricao          text not null default '',
  instrucoes         text not null default '',
  tipo               text not null default 'individual'
                       check (tipo in ('individual', 'turma')),
  turma_id           text not null references public.turmas (id) on delete cascade,
  disciplina_id      text not null references public.disciplinas (id) on delete cascade,
  indicador          text not null default '',
  xp_recompensa      integer not null default 0
                       check (xp_recompensa between 0 and 100),
  moedas_recompensa  integer not null default 0
                       check (moedas_recompensa between 0 and 1000),
  status             text not null default 'rascunho'
                       check (status in ('rascunho', 'publicada', 'encerrada', 'arquivada')),
  inicio_em          date,
  fim_em             date,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  constraint missoes_nome_unico unique (institution_id, turma_id, disciplina_id, nome),
  constraint missoes_recompensa_check check (xp_recompensa + moedas_recompensa > 0),
  constraint missoes_periodo_check check (
    inicio_em is null or fim_em is null or fim_em >= inicio_em
  )
);

-- -----------------------------------------------------------------------------
-- 6. Conclusões de missões por aluno
-- -----------------------------------------------------------------------------

create table if not exists public.missoes_aluno (
  id               text primary key,
  institution_id   text not null default 'instituicao-padrao',
  missao_id        text not null references public.missoes (id) on delete cascade,
  missao_nome      text not null default '',
  aluno_id         text not null references public.alunos (id) on delete cascade,
  turma_id         text not null references public.turmas (id) on delete cascade,
  disciplina_id    text not null references public.disciplinas (id) on delete cascade,
  autor_id         text,
  autor_nome       text not null default '',
  idempotency_key  text not null,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  constraint missoes_aluno_unico unique (institution_id, missao_id, aluno_id),
  constraint missoes_aluno_idempotencia_unica unique (institution_id, idempotency_key)
);

-- -----------------------------------------------------------------------------
-- 7. Índices de apoio
-- -----------------------------------------------------------------------------

create index if not exists idx_metas_contexto on public.metas (institution_id, turma_id, disciplina_id);
create index if not exists idx_metas_indicador on public.metas (institution_id, disciplina_id, indicador);
create index if not exists idx_metas_aluno_aluno on public.metas_aluno (aluno_id);
create index if not exists idx_metas_aluno_meta on public.metas_aluno (meta_id);
create index if not exists idx_missoes_contexto on public.missoes (institution_id, turma_id, disciplina_id);
create index if not exists idx_missoes_status on public.missoes (status);
create index if not exists idx_missoes_aluno_aluno on public.missoes_aluno (aluno_id);
create index if not exists idx_missoes_aluno_missao on public.missoes_aluno (missao_id);

-- -----------------------------------------------------------------------------
-- 8. Atualização automática de `atualizado_em`
-- -----------------------------------------------------------------------------

do $$
declare
  tabela text;
begin
  foreach tabela in array array['metas', 'metas_aluno', 'missoes', 'missoes_aluno']
  loop
    execute format('drop trigger if exists trg_atualizado_em on public.%I', tabela);
    execute format(
      'create trigger trg_atualizado_em before update on public.%I
       for each row execute function public.definir_atualizado_em()',
      tabela
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. Permissões de acesso às tabelas
-- -----------------------------------------------------------------------------

grant select, insert, update, delete on public.metas to authenticated;
grant select, insert, update, delete on public.metas_aluno to authenticated;
grant select, insert, update, delete on public.missoes to authenticated;
grant select, insert, update, delete on public.missoes_aluno to authenticated;

-- -----------------------------------------------------------------------------
-- 10. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.metas enable row level security;
alter table public.metas_aluno enable row level security;
alter table public.missoes enable row level security;
alter table public.missoes_aluno enable row level security;

-- 10.1 Catálogo de ações: administrador gerencia tudo; professor apenas o
-- contexto turma + disciplina em que leciona. Linhas antigas sem contexto ficam
-- restritas ao administrador.
drop policy if exists acoes_gamificacao_leitura on public.acoes_gamificacao;
create policy acoes_gamificacao_leitura on public.acoes_gamificacao
  for select using (
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

-- 10.2 Eventos de XP: o professor só acessa eventos do contexto em que leciona.
-- Quando houver ação vinculada, a ação precisa pertencer ao mesmo contexto.
drop policy if exists eventos_xp_leitura on public.eventos_xp;
create policy eventos_xp_leitura on public.eventos_xp
  for select using (
    (
      institution_id = public.auth_institution()
      and (
        public.eh_administrador()
        or (
          turma_id is not null
          and disciplina_id is not null
          and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
          and public.professor_tem_vinculo(turma_id, disciplina_id)
        )
        or (
          turma_id is not null
          and disciplina_id is null
          and acao_id is null
          and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
        )
      )
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
        and disciplina_id is not null
        and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
        and public.professor_tem_vinculo(turma_id, disciplina_id)
      )
      or (
        turma_id is not null
        and disciplina_id is null
        and acao_id is null
        and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
      )
    )
    and (
      acao_id is null
      or exists (
        select 1
          from public.acoes_gamificacao as acao
         where acao.id = eventos_xp.acao_id
           and acao.turma_id is not distinct from eventos_xp.turma_id
           and acao.disciplina_id is not distinct from eventos_xp.disciplina_id
      )
    )
  );

drop policy if exists eventos_xp_exclusao on public.eventos_xp;
create policy eventos_xp_exclusao on public.eventos_xp
  for delete using (institution_id = public.auth_institution() and public.eh_administrador());

-- 10.3 Metas: administrador gerencia tudo; professor gerencia o próprio
-- contexto; o aluno lê as metas ativas da própria turma.
drop policy if exists metas_leitura on public.metas;
create policy metas_leitura on public.metas
  for select using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        turma_id is not null
        and disciplina_id is not null
        and public.professor_tem_vinculo(turma_id, disciplina_id)
      )
      or (
        ativa
        and exists (
          select 1
            from public.alunos as aluno
           where aluno.id = public.auth_aluno_id()
             and aluno.turma_id = metas.turma_id
        )
      )
    )
  );

drop policy if exists metas_escrita on public.metas;
create policy metas_escrita on public.metas
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

-- 10.4 Concessões: administrador e professor do contexto gerenciam; o aluno lê
-- as próprias.
drop policy if exists metas_aluno_leitura on public.metas_aluno;
create policy metas_aluno_leitura on public.metas_aluno
  for select using (
    (
      institution_id = public.auth_institution()
      and (
        public.eh_administrador()
        or (
          turma_id is not null
          and disciplina_id is not null
          and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
          and public.professor_tem_vinculo(turma_id, disciplina_id)
        )
      )
    )
    or aluno_id = public.auth_aluno_id()
  );

drop policy if exists metas_aluno_escrita on public.metas_aluno;
create policy metas_aluno_escrita on public.metas_aluno
  for all
  using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        turma_id is not null
        and disciplina_id is not null
        and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
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
        and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
        and public.professor_tem_vinculo(turma_id, disciplina_id)
      )
    )
  );

-- 10.5 Missões: administrador gerencia tudo; professor gerencia o próprio
-- contexto; o aluno lê as publicadas da própria turma.
drop policy if exists missoes_leitura on public.missoes;
create policy missoes_leitura on public.missoes
  for select using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        turma_id is not null
        and disciplina_id is not null
        and public.professor_tem_vinculo(turma_id, disciplina_id)
      )
      or (
        status = 'publicada'
        and exists (
          select 1
            from public.alunos as aluno
           where aluno.id = public.auth_aluno_id()
             and aluno.turma_id = missoes.turma_id
        )
      )
    )
  );

drop policy if exists missoes_escrita on public.missoes;
create policy missoes_escrita on public.missoes
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

-- 10.6 Conclusões: administrador e professor do contexto gerenciam; o aluno lê
-- as próprias.
drop policy if exists missoes_aluno_leitura on public.missoes_aluno;
create policy missoes_aluno_leitura on public.missoes_aluno
  for select using (
    (
      institution_id = public.auth_institution()
      and (
        public.eh_administrador()
        or (
          turma_id is not null
          and disciplina_id is not null
          and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
          and public.professor_tem_vinculo(turma_id, disciplina_id)
        )
      )
    )
    or aluno_id = public.auth_aluno_id()
  );

drop policy if exists missoes_aluno_escrita on public.missoes_aluno;
create policy missoes_aluno_escrita on public.missoes_aluno
  for all
  using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or (
        turma_id is not null
        and disciplina_id is not null
        and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
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
        and public.professor_pode_aluno_na_turma(aluno_id, turma_id)
        and public.professor_tem_vinculo(turma_id, disciplina_id)
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 11. Funcionalidades, plano padrão e permissões por papel
-- -----------------------------------------------------------------------------

insert into public.funcionalidades (chave, nome, descricao, grupo, ordem)
values
  ('gamificacao.metas', 'Metas', 'Metas por indicador e concessão de recompensas.', 'gamificacao', 26),
  ('gamificacao.missoes', 'Missões', 'Missões individuais e coletivas da turma.', 'gamificacao', 27)
on conflict (chave) do update
  set nome = excluded.nome,
      descricao = excluded.descricao,
      grupo = excluded.grupo,
      ordem = excluded.ordem;

insert into public.planos_funcionalidades (id, plano_id, funcionalidade)
select
  'pf-' || plano.id || '-' || funcionalidade.chave,
  plano.id,
  funcionalidade.chave
from public.planos as plano
cross join public.funcionalidades as funcionalidade
where funcionalidade.chave in ('gamificacao.metas', 'gamificacao.missoes')
on conflict (plano_id, funcionalidade) do nothing;

insert into public.permissoes_papel (id, papel, funcionalidade, habilitado)
select
  'perm-adm-' || funcionalidade.chave,
  'administrador',
  funcionalidade.chave,
  true
from public.funcionalidades as funcionalidade
where funcionalidade.chave in ('gamificacao.metas', 'gamificacao.missoes')
on conflict (papel, funcionalidade) do update
  set habilitado = excluded.habilitado;

insert into public.permissoes_papel (id, papel, funcionalidade, habilitado)
select
  'perm-prof-' || funcionalidade.chave,
  'professor',
  funcionalidade.chave,
  true
from public.funcionalidades as funcionalidade
where funcionalidade.chave in ('gamificacao.metas', 'gamificacao.missoes')
on conflict (papel, funcionalidade) do update
  set habilitado = excluded.habilitado;

insert into public.permissoes_papel (id, papel, funcionalidade, habilitado)
select
  'perm-aluno-' || funcionalidade.chave,
  'aluno',
  funcionalidade.chave,
  false
from public.funcionalidades as funcionalidade
where funcionalidade.chave in ('gamificacao.metas', 'gamificacao.missoes')
on conflict (papel, funcionalidade) do update
  set habilitado = excluded.habilitado;
