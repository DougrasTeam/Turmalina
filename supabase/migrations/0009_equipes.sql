-- =============================================================================
-- Turmalina — equipes de gamificação (RF-017)
-- -----------------------------------------------------------------------------
-- Cria:
--   * `equipes` — equipes por turma/período (nome, emoji, cor e status);
--   * `equipe_membros` — vínculos de alunos com equipes, com vigência.
--
-- Regras:
--   * a equipe existe dentro de um contexto de turma/período;
--   * um aluno tem no máximo um vínculo ATIVO por turma/período;
--   * transferir um aluno encerra o vínculo anterior, preservando o histórico;
--   * a equipe é um recurso de gamificação; não altera matrícula nem notas;
--   * a cor é apenas reforço visual — nome e emoji sempre identificam a equipe.
--
-- Deve ser executado no SQL Editor do Supabase após os scripts anteriores.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Equipes
-- -----------------------------------------------------------------------------

create table if not exists public.equipes (
  id                text primary key,
  institution_id    text not null default 'instituicao-padrao',
  nome              text not null,
  emoji             text not null default '🦁',
  cor               text not null default '#2563EB',
  ativa             boolean not null default true,
  turma_id          text not null references public.turmas (id) on delete cascade,
  periodo_letivo_id text references public.periodos_letivos (id) on delete set null,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  constraint equipes_nome_unico unique (institution_id, turma_id, periodo_letivo_id, nome)
);

-- -----------------------------------------------------------------------------
-- 2. Vínculos de alunos com equipes (com vigência)
-- -----------------------------------------------------------------------------

create table if not exists public.equipe_membros (
  id                text primary key,
  institution_id    text not null default 'instituicao-padrao',
  equipe_id         text not null references public.equipes (id) on delete cascade,
  equipe_nome       text not null default '',
  aluno_id          text not null references public.alunos (id) on delete cascade,
  aluno_nome        text not null default '',
  turma_id          text not null,
  periodo_letivo_id text,
  ativa             boolean not null default true,
  inicio_em         timestamptz not null default now(),
  fim_em            timestamptz,
  autor_id          text,
  autor_nome        text not null default '',
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

-- Garante no máximo um vínculo ativo por aluno em cada turma/período.
create unique index if not exists equipe_membros_ativo_unico
  on public.equipe_membros (institution_id, turma_id, coalesce(periodo_letivo_id, ''), aluno_id)
  where ativa;

-- -----------------------------------------------------------------------------
-- 3. Índices de apoio
-- -----------------------------------------------------------------------------

create index if not exists idx_equipes_institution on public.equipes (institution_id);
create index if not exists idx_equipes_turma on public.equipes (turma_id);
create index if not exists idx_equipe_membros_institution on public.equipe_membros (institution_id);
create index if not exists idx_equipe_membros_equipe on public.equipe_membros (equipe_id);
create index if not exists idx_equipe_membros_aluno on public.equipe_membros (aluno_id);

-- -----------------------------------------------------------------------------
-- 4. Atualização automática de `atualizado_em`
-- -----------------------------------------------------------------------------

drop trigger if exists trg_atualizado_em on public.equipes;
create trigger trg_atualizado_em before update on public.equipes
  for each row execute function public.definir_atualizado_em();

-- -----------------------------------------------------------------------------
-- 5. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.equipes enable row level security;
alter table public.equipe_membros enable row level security;

-- 5.1 Equipes: equipe lê; administrador escreve.
drop policy if exists equipes_leitura on public.equipes;
create policy equipes_leitura on public.equipes
  for select using (institution_id = public.auth_institution() and public.eh_equipe());

drop policy if exists equipes_escrita on public.equipes;
create policy equipes_escrita on public.equipes
  for all
  using (institution_id = public.auth_institution() and public.eh_administrador())
  with check (institution_id = public.auth_institution() and public.eh_administrador());

-- 5.2 Vínculos: equipe lê tudo; aluno lê os próprios; administrador escreve.
drop policy if exists equipe_membros_leitura on public.equipe_membros;
create policy equipe_membros_leitura on public.equipe_membros
  for select using (
    (institution_id = public.auth_institution() and public.eh_equipe())
    or aluno_id = public.auth_aluno_id()
  );

drop policy if exists equipe_membros_escrita on public.equipe_membros;
create policy equipe_membros_escrita on public.equipe_membros
  for all
  using (institution_id = public.auth_institution() and public.eh_administrador())
  with check (institution_id = public.auth_institution() and public.eh_administrador());
