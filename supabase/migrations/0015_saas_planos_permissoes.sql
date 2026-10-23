-- =============================================================================
-- Turmalina — painel do SaaS: planos, funcionalidades e permissões por papel
-- -----------------------------------------------------------------------------
-- Introduz a camada de administração do SaaS (papel global `super_admin`) e o
-- controle de acesso a funcionalidades. Cria:
--
--   * `funcionalidades` — catálogo de funcionalidades do sistema (chave estável
--     usada no menu, nas rotas e nas flags). É a fonte única.
--   * `planos` — planos comerciais; cada plano inclui um conjunto de
--     funcionalidades (via `planos_funcionalidades`).
--   * `planos_funcionalidades` — funcionalidades incluídas em cada plano.
--   * `permissoes_papel` — matriz (papel × funcionalidade) que define o que cada
--     papel PODE acessar, independente do plano.
--   * `escola_funcionalidades` — override por escola (feature flag): libera ou
--     bloqueia uma funcionalidade para uma instituição específica, permitindo
--     liberar recursos aos poucos.
--
-- Regra de acesso efetivo de uma funcionalidade para um usuário:
--   permitida pelo papel (permissoes_papel) E habilitada para a escola
--   (escola_funcionalidades; na ausência de linha, vale o padrão do papel).
--
-- Papel `super_admin`:
--   * é global: `institution_id` fica como sentinela e não participa das regras
--     de tenant; enxerga todas as escolas.
--   * gerencia planos, funcionalidades, permissões e flags das escolas.
--
-- Deve ser executado no SQL Editor do Supabase após os scripts anteriores.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Papel super_admin
-- -----------------------------------------------------------------------------
-- Amplia a restrição de papel para incluir o administrador global do SaaS.
-- A sentinela de tenant de um super_admin é irrelevante para RLS de escola.

alter table public.perfis
  drop constraint if exists perfis_papel_check;

alter table public.perfis
  add constraint perfis_papel_check
  check (papel in ('super_admin', 'administrador', 'professor', 'aluno'));

-- -----------------------------------------------------------------------------
-- 2. Catálogo de funcionalidades
-- -----------------------------------------------------------------------------
-- A `chave` é o identificador estável usado no código (menu, rotas e flags),
-- por exemplo 'relatorios' ou 'gamificacao.equipes'. Não deve ser renomeada
-- sem migração explícita.

create table if not exists public.funcionalidades (
  chave         text primary key,
  nome          text not null,
  descricao     text not null default '',
  grupo         text not null default 'geral',
  ordem         integer not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3. Planos comerciais
-- -----------------------------------------------------------------------------

create table if not exists public.planos (
  id            text primary key,
  nome          text not null,
  descricao     text not null default '',
  preco_mensal  numeric(10, 2) not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint planos_nome_unico unique (nome)
);

-- Funcionalidades incluídas em cada plano.
create table if not exists public.planos_funcionalidades (
  id             text primary key,
  plano_id       text not null references public.planos (id) on delete cascade,
  funcionalidade text not null references public.funcionalidades (chave) on delete cascade,
  criado_em      timestamptz not null default now(),
  constraint planos_funcionalidades_unico unique (plano_id, funcionalidade)
);

-- Vincula a instituição (escola) ao seu plano comercial.
alter table public.instituicoes
  add column if not exists plano_id text references public.planos (id) on delete set null;

-- -----------------------------------------------------------------------------
-- 4. Permissões por papel
-- -----------------------------------------------------------------------------
-- Matriz configurável pelo super_admin: define o que cada papel pode acessar.
-- Vale como padrão e é combinada com as flags por escola.

create table if not exists public.permissoes_papel (
  id             text primary key,
  papel          text not null
                   check (papel in ('administrador', 'professor', 'aluno')),
  funcionalidade text not null references public.funcionalidades (chave) on delete cascade,
  habilitado     boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  constraint permissoes_papel_unico unique (papel, funcionalidade)
);

-- -----------------------------------------------------------------------------
-- 5. Funcionalidades por escola (feature flags)
-- -----------------------------------------------------------------------------
-- Override individual: libera ou bloqueia uma funcionalidade para uma escola,
-- permitindo liberar recursos aos poucos (por escola ou por plano).

create table if not exists public.escola_funcionalidades (
  id             text primary key,
  institution_id text not null,
  funcionalidade text not null references public.funcionalidades (chave) on delete cascade,
  habilitado     boolean not null default true,
  origem         text not null default 'manual'
                   check (origem in ('manual', 'plano')),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  constraint escola_funcionalidades_unico unique (institution_id, funcionalidade)
);

-- -----------------------------------------------------------------------------
-- 6. Índices de apoio
-- -----------------------------------------------------------------------------

create index if not exists idx_funcionalidades_grupo on public.funcionalidades (grupo, ordem);
create index if not exists idx_planos_func_plano on public.planos_funcionalidades (plano_id);
create index if not exists idx_permissoes_papel on public.permissoes_papel (papel);
create index if not exists idx_escola_func_institution on public.escola_funcionalidades (institution_id);
create index if not exists idx_instituicoes_plano on public.instituicoes (plano_id);

-- -----------------------------------------------------------------------------
-- 7. Atualização automática de `atualizado_em`
-- -----------------------------------------------------------------------------

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'funcionalidades', 'planos', 'permissoes_papel', 'escola_funcionalidades'
  ]
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
-- 8. Funções auxiliares de autorização
-- -----------------------------------------------------------------------------

create or replace function public.auth_eh_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_papel() = 'super_admin', false)
$$;

-- -----------------------------------------------------------------------------
-- 9. Row Level Security
-- -----------------------------------------------------------------------------
-- Super admin gerencia o catálogo (funcionalidades, planos, permissões e flags).
-- Membros de uma escola leem apenas o plano/flags da própria instituição.

alter table public.funcionalidades          enable row level security;
alter table public.planos                   enable row level security;
alter table public.planos_funcionalidades   enable row level security;
alter table public.permissoes_papel         enable row level security;
alter table public.escola_funcionalidades   enable row level security;

-- 9.1 Catálogo de funcionalidades: qualquer autenticado lê; super admin escreve.
drop policy if exists funcionalidades_leitura on public.funcionalidades;
create policy funcionalidades_leitura on public.funcionalidades
  for select using (auth.uid() is not null);

drop policy if exists funcionalidades_escrita on public.funcionalidades;
create policy funcionalidades_escrita on public.funcionalidades
  for all
  using (public.auth_eh_super_admin())
  with check (public.auth_eh_super_admin());

-- 9.2 Planos: qualquer autenticado lê; super admin escreve.
drop policy if exists planos_leitura on public.planos;
create policy planos_leitura on public.planos
  for select using (auth.uid() is not null);

drop policy if exists planos_escrita on public.planos;
create policy planos_escrita on public.planos
  for all
  using (public.auth_eh_super_admin())
  with check (public.auth_eh_super_admin());

-- 9.3 Funcionalidades por plano: leitura ampla; escrita do super admin.
drop policy if exists planos_funcionalidades_leitura on public.planos_funcionalidades;
create policy planos_funcionalidades_leitura on public.planos_funcionalidades
  for select using (auth.uid() is not null);

drop policy if exists planos_funcionalidades_escrita on public.planos_funcionalidades;
create policy planos_funcionalidades_escrita on public.planos_funcionalidades
  for all
  using (public.auth_eh_super_admin())
  with check (public.auth_eh_super_admin());

-- 9.4 Permissões por papel: leitura ampla (a UI precisa resolver o acesso);
--     escrita apenas do super admin.
drop policy if exists permissoes_papel_leitura on public.permissoes_papel;
create policy permissoes_papel_leitura on public.permissoes_papel
  for select using (auth.uid() is not null);

drop policy if exists permissoes_papel_escrita on public.permissoes_papel;
create policy permissoes_papel_escrita on public.permissoes_papel
  for all
  using (public.auth_eh_super_admin())
  with check (public.auth_eh_super_admin());

-- 9.5 Funcionalidades por escola: membros leem as da própria escola; o super
--     admin lê e escreve todas.
drop policy if exists escola_funcionalidades_leitura on public.escola_funcionalidades;
create policy escola_funcionalidades_leitura on public.escola_funcionalidades
  for select using (
    institution_id = public.auth_institution()
    or public.auth_eh_super_admin()
  );

drop policy if exists escola_funcionalidades_escrita on public.escola_funcionalidades;
create policy escola_funcionalidades_escrita on public.escola_funcionalidades
  for all
  using (public.auth_eh_super_admin())
  with check (public.auth_eh_super_admin());

-- 9.6 Instituições: o super admin enxerga e gerencia todas as escolas.
drop policy if exists instituicoes_super_admin on public.instituicoes;
create policy instituicoes_super_admin on public.instituicoes
  for all
  using (public.auth_eh_super_admin())
  with check (public.auth_eh_super_admin());

-- 9.7 Perfis: o super admin lê/gerencia todos os perfis (gestão do SaaS).
drop policy if exists perfis_super_admin on public.perfis;
create policy perfis_super_admin on public.perfis
  for all
  using (public.auth_eh_super_admin())
  with check (public.auth_eh_super_admin());
