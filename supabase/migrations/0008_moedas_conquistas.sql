-- =============================================================================
-- Turmalina — moedas e conquistas: ledger de moedas e álbum (RF-016 e RF-020)
-- -----------------------------------------------------------------------------
-- Cria:
--   * `movimentacoes_moedas` — ledger imutável de moedas virtuais;
--   * `conquistas` — catálogo de conquistas (álbum);
--   * `conquistas_aluno` — desbloqueios de conquistas por aluno.
--
-- Regras:
--   * moedas são um saldo interno de gamificação, nunca dinheiro real;
--   * todo o saldo é a soma das movimentações; não há saldo negativo;
--   * a equipe lê e lança movimentações; correções acontecem por estorno;
--   * o aluno lê apenas as próprias movimentações e o próprio álbum;
--   * desbloqueios de conquista são idempotentes por aluno/conquista.
--
-- Deve ser executado no SQL Editor do Supabase após os scripts anteriores.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Ledger de moedas virtuais
-- -----------------------------------------------------------------------------

create table if not exists public.movimentacoes_moedas (
  id               text primary key,
  institution_id   text not null default 'instituicao-padrao',
  aluno_id         text not null references public.alunos (id) on delete cascade,
  turma_id         text references public.turmas (id) on delete set null,
  delta            integer not null check (delta <> 0),
  origem           text not null default 'manual'
                     check (origem in ('nivel', 'manual', 'recompensa', 'estorno')),
  descricao        text not null default '',
  autor_id         text,
  autor_nome       text not null default '',
  idempotency_key  text not null,
  estorno_de       text references public.movimentacoes_moedas (id) on delete set null,
  referencia_id    text,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  constraint movimentacoes_moedas_idempotencia_unica unique (institution_id, idempotency_key)
);

-- -----------------------------------------------------------------------------
-- 2. Catálogo de conquistas (álbum)
-- -----------------------------------------------------------------------------

create table if not exists public.conquistas (
  id              text primary key,
  institution_id  text not null default 'instituicao-padrao',
  nome            text not null,
  emoji           text not null default '🌟',
  descricao       text not null default '',
  bonus_xp        integer not null default 0 check (bonus_xp >= 0),
  ativa           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint conquistas_nome_unico unique (institution_id, nome)
);

-- -----------------------------------------------------------------------------
-- 3. Desbloqueios de conquista por aluno
-- -----------------------------------------------------------------------------

create table if not exists public.conquistas_aluno (
  id               text primary key,
  institution_id   text not null default 'instituicao-padrao',
  aluno_id         text not null references public.alunos (id) on delete cascade,
  conquista_id     text not null references public.conquistas (id) on delete cascade,
  conquista_nome   text not null default '',
  origem           text not null default 'manual',
  autor_id         text,
  autor_nome       text not null default '',
  idempotency_key  text not null,
  estorno_de       text,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  constraint conquistas_aluno_unico unique (institution_id, aluno_id, conquista_id)
);

-- -----------------------------------------------------------------------------
-- 4. Índices de apoio
-- -----------------------------------------------------------------------------

create index if not exists idx_movimentacoes_moedas_institution
  on public.movimentacoes_moedas (institution_id);
create index if not exists idx_movimentacoes_moedas_aluno
  on public.movimentacoes_moedas (aluno_id);
create index if not exists idx_movimentacoes_moedas_turma
  on public.movimentacoes_moedas (turma_id);
create index if not exists idx_conquistas_institution on public.conquistas (institution_id);
create index if not exists idx_conquistas_aluno_aluno on public.conquistas_aluno (aluno_id);
create index if not exists idx_conquistas_aluno_conquista
  on public.conquistas_aluno (conquista_id);

-- -----------------------------------------------------------------------------
-- 5. Atualização automática de `atualizado_em`
-- -----------------------------------------------------------------------------

drop trigger if exists trg_atualizado_em on public.conquistas;
create trigger trg_atualizado_em before update on public.conquistas
  for each row execute function public.definir_atualizado_em();

-- -----------------------------------------------------------------------------
-- 6. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.movimentacoes_moedas enable row level security;
alter table public.conquistas enable row level security;
alter table public.conquistas_aluno enable row level security;

-- 6.1 Moedas: equipe lê tudo; aluno lê as próprias movimentações.
drop policy if exists movimentacoes_moedas_leitura on public.movimentacoes_moedas;
create policy movimentacoes_moedas_leitura on public.movimentacoes_moedas
  for select using (
    (institution_id = public.auth_institution() and public.eh_equipe())
    or aluno_id = public.auth_aluno_id()
  );

drop policy if exists movimentacoes_moedas_insercao on public.movimentacoes_moedas;
create policy movimentacoes_moedas_insercao on public.movimentacoes_moedas
  for insert with check (institution_id = public.auth_institution() and public.eh_equipe());

drop policy if exists movimentacoes_moedas_exclusao on public.movimentacoes_moedas;
create policy movimentacoes_moedas_exclusao on public.movimentacoes_moedas
  for delete using (institution_id = public.auth_institution() and public.eh_administrador());

-- 6.2 Catálogo de conquistas: equipe lê; administrador escreve.
drop policy if exists conquistas_leitura on public.conquistas;
create policy conquistas_leitura on public.conquistas
  for select using (institution_id = public.auth_institution() and public.eh_equipe());

drop policy if exists conquistas_escrita on public.conquistas;
create policy conquistas_escrita on public.conquistas
  for all
  using (institution_id = public.auth_institution() and public.eh_administrador())
  with check (institution_id = public.auth_institution() and public.eh_administrador());

-- 6.3 Desbloqueios: equipe lê tudo; aluno lê os próprios.
drop policy if exists conquistas_aluno_leitura on public.conquistas_aluno;
create policy conquistas_aluno_leitura on public.conquistas_aluno
  for select using (
    (institution_id = public.auth_institution() and public.eh_equipe())
    or aluno_id = public.auth_aluno_id()
  );

drop policy if exists conquistas_aluno_insercao on public.conquistas_aluno;
create policy conquistas_aluno_insercao on public.conquistas_aluno
  for insert with check (institution_id = public.auth_institution() and public.eh_equipe());

drop policy if exists conquistas_aluno_exclusao on public.conquistas_aluno;
create policy conquistas_aluno_exclusao on public.conquistas_aluno
  for delete using (institution_id = public.auth_institution() and public.eh_administrador());
