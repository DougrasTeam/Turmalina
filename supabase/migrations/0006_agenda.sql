-- =============================================================================
-- Turmalina — agenda de eventos (RF-023)
-- -----------------------------------------------------------------------------
-- Cria a tabela `eventos` da agenda escolar, com segurança por papel (RLS):
--   * a equipe lê e escreve todos os eventos da instituição;
--   * o aluno lê os eventos da sua turma e os institucionais (`turma_id` nulo).
-- Eventos passados permanecem consultáveis (histórico) — não há expiração.
--
-- Deve ser executado no SQL Editor do Supabase após os scripts anteriores.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela
-- -----------------------------------------------------------------------------

create table if not exists public.eventos (
  id              text primary key,
  institution_id  text not null default 'instituicao-padrao',
  titulo          text not null,
  descricao       text not null default '',
  tipo            text not null default 'aula'
                    check (tipo in ('aula', 'avaliacao', 'entrega', 'atividade', 'aviso')),
  inicio_em       timestamptz not null,
  turma_id        text references public.turmas (id) on delete cascade,
  autor_id        text,
  autor_nome      text not null default '',
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. Índices de apoio
-- -----------------------------------------------------------------------------

create index if not exists idx_eventos_institution on public.eventos (institution_id);
create index if not exists idx_eventos_turma on public.eventos (turma_id);
create index if not exists idx_eventos_inicio_em on public.eventos (inicio_em);

-- -----------------------------------------------------------------------------
-- 3. Atualização automática de `atualizado_em`
-- -----------------------------------------------------------------------------

drop trigger if exists trg_atualizado_em on public.eventos;
create trigger trg_atualizado_em before update on public.eventos
  for each row execute function public.definir_atualizado_em();

-- -----------------------------------------------------------------------------
-- 4. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.eventos enable row level security;

-- 4.1 Leitura: equipe lê tudo; aluno lê os eventos da sua turma ou institucionais.
drop policy if exists eventos_leitura on public.eventos;
create policy eventos_leitura on public.eventos
  for select using (
    (institution_id = public.auth_institution() and public.eh_equipe())
    or (
      institution_id = public.auth_institution()
      and (turma_id is null or turma_id = public.auth_turma_id())
    )
  );

-- 4.2 Escrita: apenas a equipe.
drop policy if exists eventos_escrita on public.eventos;
create policy eventos_escrita on public.eventos
  for all
  using (institution_id = public.auth_institution() and public.eh_equipe())
  with check (institution_id = public.auth_institution() and public.eh_equipe());
