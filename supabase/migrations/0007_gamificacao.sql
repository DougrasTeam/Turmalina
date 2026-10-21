-- =============================================================================
-- Turmalina — gamificação: ações e lançamentos de XP (RF-015)
-- -----------------------------------------------------------------------------
-- Cria o catálogo de ações (`acoes_gamificacao`) e o histórico imutável de
-- lançamentos de XP (`eventos_xp`).
--
-- Regras:
--   * a equipe lê o catálogo e lança XP; apenas o administrador o edita;
--   * o aluno lê os próprios lançamentos;
--   * lançamentos são apenas inseridos ou removidos pelo administrador em uma
--     limpeza completa; correções acontecem por estorno (novo lançamento);
--   * o XP do aluno é consequência do histórico e nunca altera notas,
--     frequência ou aprovação.
--
-- Deve ser executado no SQL Editor do Supabase após os scripts anteriores.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Catálogo de ações
-- -----------------------------------------------------------------------------

create table if not exists public.acoes_gamificacao (
  id              text primary key,
  institution_id  text not null default 'instituicao-padrao',
  nome            text not null,
  icone           text not null default 'star',
  valor_xp        integer not null default 0 check (valor_xp <> 0),
  indicador       text not null default 'geral',
  ativa           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint acoes_gamificacao_nome_unico unique (institution_id, nome)
);

-- -----------------------------------------------------------------------------
-- 2. Histórico de lançamentos de XP
-- -----------------------------------------------------------------------------

create table if not exists public.eventos_xp (
  id               text primary key,
  institution_id   text not null default 'instituicao-padrao',
  aluno_id         text not null references public.alunos (id) on delete cascade,
  turma_id         text references public.turmas (id) on delete set null,
  acao_id          text references public.acoes_gamificacao (id) on delete set null,
  acao_nome        text not null,
  delta_xp         integer not null check (delta_xp <> 0),
  origem           text not null default 'manual'
                     check (origem in ('manual', 'estorno', 'sistema')),
  autor_id         text,
  autor_nome       text not null default '',
  idempotency_key  text not null,
  estorno_de       text references public.eventos_xp (id) on delete set null,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  constraint eventos_xp_idempotencia_unica unique (institution_id, idempotency_key)
);

-- -----------------------------------------------------------------------------
-- 3. Índices de apoio
-- -----------------------------------------------------------------------------

create index if not exists idx_acoes_gamificacao_institution
  on public.acoes_gamificacao (institution_id);
create index if not exists idx_eventos_xp_institution on public.eventos_xp (institution_id);
create index if not exists idx_eventos_xp_aluno on public.eventos_xp (aluno_id);
create index if not exists idx_eventos_xp_turma on public.eventos_xp (turma_id);
create index if not exists idx_eventos_xp_criado_em on public.eventos_xp (criado_em);

-- -----------------------------------------------------------------------------
-- 4. Atualização automática de `atualizado_em`
-- -----------------------------------------------------------------------------

drop trigger if exists trg_atualizado_em on public.acoes_gamificacao;
create trigger trg_atualizado_em before update on public.acoes_gamificacao
  for each row execute function public.definir_atualizado_em();

-- -----------------------------------------------------------------------------
-- 5. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.acoes_gamificacao enable row level security;
alter table public.eventos_xp enable row level security;

-- 5.1 Catálogo: a equipe lê; o administrador escreve.
drop policy if exists acoes_gamificacao_leitura on public.acoes_gamificacao;
create policy acoes_gamificacao_leitura on public.acoes_gamificacao
  for select using (institution_id = public.auth_institution() and public.eh_equipe());

drop policy if exists acoes_gamificacao_escrita on public.acoes_gamificacao;
create policy acoes_gamificacao_escrita on public.acoes_gamificacao
  for all
  using (institution_id = public.auth_institution() and public.eh_administrador())
  with check (institution_id = public.auth_institution() and public.eh_administrador());

-- 5.2 Lançamentos: equipe lê tudo; aluno lê os próprios.
drop policy if exists eventos_xp_leitura on public.eventos_xp;
create policy eventos_xp_leitura on public.eventos_xp
  for select using (
    (institution_id = public.auth_institution() and public.eh_equipe())
    or aluno_id = public.auth_aluno_id()
  );

-- 5.3 Inserção: apenas a equipe (inclusive estornos).
drop policy if exists eventos_xp_insercao on public.eventos_xp;
create policy eventos_xp_insercao on public.eventos_xp
  for insert with check (institution_id = public.auth_institution() and public.eh_equipe());

-- 5.4 Exclusão: apenas o administrador, em limpeza de dados.
drop policy if exists eventos_xp_exclusao on public.eventos_xp;
create policy eventos_xp_exclusao on public.eventos_xp
  for delete using (institution_id = public.auth_institution() and public.eh_administrador());

-- -----------------------------------------------------------------------------
-- 6. Atualização de XP do aluno pela equipe
-- -----------------------------------------------------------------------------
-- A política original de `alunos` permite escrita apenas ao administrador.
-- A gamificação precisa que professores atualizem o XP. A política abaixo
-- libera o UPDATE para a equipe, e o gatilho garante que, fora do XP/moedas,
-- nenhum outro campo seja alterado por quem não é administrador.

drop policy if exists alunos_xp_escrita on public.alunos;
create policy alunos_xp_escrita on public.alunos
  for update
  using (institution_id = public.auth_institution() and public.eh_equipe())
  with check (institution_id = public.auth_institution() and public.eh_equipe());

create or replace function public.proteger_alunos_exceto_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.eh_administrador() then
    return new;
  end if;

  if public.eh_equipe() then
    if (to_jsonb(new) - 'xp' - 'moedas' - 'atualizado_em')
       is distinct from (to_jsonb(old) - 'xp' - 'moedas' - 'atualizado_em') then
      raise exception 'A equipe só pode atualizar XP e moedas do aluno.';
    end if;
    return new;
  end if;

  raise exception 'Sem permissão para atualizar alunos.';
end;
$$;

drop trigger if exists trg_proteger_alunos_exceto_xp on public.alunos;
create trigger trg_proteger_alunos_exceto_xp before update on public.alunos
  for each row execute function public.proteger_alunos_exceto_xp();
