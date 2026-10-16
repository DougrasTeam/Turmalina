-- =============================================================================
-- Turmalina — mural coletivo e comunicados individuais (RF-022)
-- -----------------------------------------------------------------------------
-- Cria as tabelas do mural (`publicacoes`) e dos comunicados individuais
-- (`comunicados`), com segurança por papel (RLS):
--   * publicações: a equipe escreve; o aluno lê as publicadas da sua turma
--     (ou as institucionais, com `turma_id` nulo).
--   * comunicados: a equipe escreve; o aluno lê apenas os recados (`tipo =
--     'recado'`) endereçados a ele. Observações privadas nunca são expostas.
--
-- Deve ser executado no SQL Editor do Supabase após os scripts anteriores.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabelas
-- -----------------------------------------------------------------------------

create table if not exists public.publicacoes (
  id              text primary key,
  institution_id  text not null default 'instituicao-padrao',
  titulo          text not null,
  conteudo        text not null,
  turma_id        text references public.turmas (id) on delete cascade,
  autor_id        text,
  autor_nome      text not null default '',
  publicada_em    timestamptz not null default now(),
  expira_em       date,
  status          text not null default 'publicada'
                    check (status in ('publicada', 'arquivada')),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create table if not exists public.comunicados (
  id              text primary key,
  institution_id  text not null default 'instituicao-padrao',
  tipo            text not null default 'recado'
                    check (tipo in ('recado', 'observacao')),
  aluno_id        text not null references public.alunos (id) on delete cascade,
  titulo          text not null,
  conteudo        text not null,
  autor_id        text,
  autor_nome      text not null default '',
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. Índices de apoio
-- -----------------------------------------------------------------------------

create index if not exists idx_publicacoes_institution on public.publicacoes (institution_id);
create index if not exists idx_publicacoes_turma on public.publicacoes (turma_id);
create index if not exists idx_publicacoes_publicada_em on public.publicacoes (publicada_em desc);
create index if not exists idx_comunicados_institution on public.comunicados (institution_id);
create index if not exists idx_comunicados_aluno on public.comunicados (aluno_id);

-- -----------------------------------------------------------------------------
-- 3. Atualização automática de `atualizado_em`
-- -----------------------------------------------------------------------------

do $$
declare
  tabela text;
begin
  foreach tabela in array array['publicacoes', 'comunicados']
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
-- 4. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.publicacoes enable row level security;
alter table public.comunicados enable row level security;

-- 4.1 Publicações: equipe lê/escreve; aluno lê as publicadas da sua turma ou
-- institucionais (turma_id nulo).
drop policy if exists publicacoes_leitura on public.publicacoes;
create policy publicacoes_leitura on public.publicacoes
  for select using (
    (institution_id = public.auth_institution() and public.eh_equipe())
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
  using (institution_id = public.auth_institution() and public.eh_equipe())
  with check (institution_id = public.auth_institution() and public.eh_equipe());

-- 4.2 Comunicados: equipe lê/escreve; aluno lê apenas os recados endereçados
-- a ele. Observações privadas ficam ocultas.
drop policy if exists comunicados_leitura on public.comunicados;
create policy comunicados_leitura on public.comunicados
  for select using (
    (institution_id = public.auth_institution() and public.eh_equipe())
    or (tipo = 'recado' and aluno_id = public.auth_aluno_id())
  );

drop policy if exists comunicados_escrita on public.comunicados;
create policy comunicados_escrita on public.comunicados
  for all
  using (institution_id = public.auth_institution() and public.eh_equipe())
  with check (institution_id = public.auth_institution() and public.eh_equipe());
