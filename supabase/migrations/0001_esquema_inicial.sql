-- =============================================================================
-- Turmalina — esquema inicial do banco (Supabase / PostgreSQL)
-- -----------------------------------------------------------------------------
-- Este script cria as tabelas do domínio, a camada de segurança (RLS por
-- papel) e os gatilhos de atualização. Ele deve ser executado no SQL Editor
-- do Supabase ANTES do script de dados iniciais (0002).
--
-- Convenções:
--   * Colunas em snake_case.
--   * `id` é texto (os identificadores são gerados pela aplicação).
--   * `institution_id` isola o tenant (multi-tenant ready).
--   * `criado_em` / `atualizado_em` são timestamptz com atualização por gatilho.
--   * As listas antes embutidas (notas de avaliação e registros de presença)
--     foram normalizadas em tabelas próprias para permitir RLS por papel.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabelas de domínio
-- -----------------------------------------------------------------------------

-- Instituição (tenant). É a raiz de configuração acadêmica.
create table if not exists public.instituicoes (
  id                       text primary key,
  institution_id           text not null default 'instituicao-padrao',
  nome                     text not null default '',
  fuso_horario             text not null default 'America/Sao_Paulo',
  status                   text not null default 'ativa'
                             check (status in ('ativa', 'inativa')),
  frequencia_minima        numeric(5, 1) not null default 75,
  falta_justificada_abona  boolean not null default true,
  nota_maxima              numeric(5, 2) not null default 10,
  media_minima             numeric(5, 2) not null default 6,
  casas_decimais_nota      smallint not null default 1
                             check (casas_decimais_nota between 0 and 2),
  criado_em                timestamptz not null default now(),
  atualizado_em            timestamptz not null default now()
);

create table if not exists public.disciplinas (
  id              text primary key,
  institution_id  text not null default 'instituicao-padrao',
  nome            text not null,
  codigo          text not null,
  carga_horaria   integer not null default 80,
  cor             text not null default '#2563eb',
  ativa           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint disciplinas_codigo_unico unique (institution_id, codigo)
);

create table if not exists public.professores (
  id              text primary key,
  institution_id  text not null default 'instituicao-padrao',
  user_id         uuid unique references auth.users (id) on delete set null,
  nome            text not null,
  email           text not null,
  telefone        text not null default '',
  disciplinas     text[] not null default '{}',
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create table if not exists public.turmas (
  id              text primary key,
  institution_id  text not null default 'instituicao-padrao',
  nome            text not null,
  serie           text not null default '',
  turno           text not null default 'manha'
                    check (turno in ('manha', 'tarde', 'noite', 'integral')),
  ano_letivo      integer not null,
  codigo          text not null,
  descricao       text not null default '',
  professor_ids   text[] not null default '{}',
  disciplina_ids  text[] not null default '{}',
  ativa           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint turmas_codigo_unico unique (institution_id, codigo)
);

create table if not exists public.alunos (
  id                    text primary key,
  institution_id        text not null default 'instituicao-padrao',
  user_id               uuid unique references auth.users (id) on delete set null,
  nome                  text not null,
  email                 text not null,
  matricula             text not null,
  turma_id              text references public.turmas (id) on delete set null,
  data_nascimento       text not null default '',
  responsavel           text not null default '',
  telefone_responsavel  text not null default '',
  ativo                 boolean not null default true,
  xp                    integer not null default 0,
  moedas                integer not null default 0,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),
  constraint alunos_matricula_unica unique (institution_id, matricula)
);

create table if not exists public.periodos_letivos (
  id              text primary key,
  institution_id  text not null default 'instituicao-padrao',
  nome            text not null,
  data_inicio     date not null,
  data_fim        date not null,
  status          text not null default 'planejado'
                    check (status in ('planejado', 'ativo', 'encerrado')),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create table if not exists public.etapas_avaliacao (
  id                  text primary key,
  institution_id      text not null default 'instituicao-padrao',
  periodo_letivo_id   text not null references public.periodos_letivos (id) on delete cascade,
  nome                text not null,
  tipo                text not null default 'etapa'
                        check (tipo in ('bimestre', 'trimestre', 'semestre', 'etapa')),
  data_inicio         date not null,
  data_fim            date not null,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

create table if not exists public.matriculas (
  id                  text primary key,
  institution_id      text not null default 'instituicao-padrao',
  aluno_id            text not null references public.alunos (id) on delete cascade,
  turma_id            text not null references public.turmas (id) on delete cascade,
  periodo_letivo_id   text references public.periodos_letivos (id) on delete set null,
  status              text not null default 'ativa'
                        check (status in ('ativa', 'transferida', 'encerrada')),
  inicio_em           date not null,
  fim_em              date,
  motivo_saida        text,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

create table if not exists public.vinculos_docentes (
  id              text primary key,
  institution_id  text not null default 'instituicao-padrao',
  professor_id    text not null references public.professores (id) on delete cascade,
  turma_id        text not null references public.turmas (id) on delete cascade,
  disciplina_id   text not null references public.disciplinas (id) on delete cascade,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint vinculos_docentes_unico unique (professor_id, turma_id, disciplina_id)
);

create table if not exists public.avaliacoes (
  id                  text primary key,
  institution_id      text not null default 'instituicao-padrao',
  nome                text not null,
  turma_id            text not null references public.turmas (id) on delete cascade,
  disciplina_id       text not null references public.disciplinas (id) on delete cascade,
  periodo_letivo_id   text not null references public.periodos_letivos (id) on delete cascade,
  etapa_id            text references public.etapas_avaliacao (id) on delete set null,
  data                date,
  nota_maxima         numeric(5, 2) not null default 10,
  peso                numeric(5, 2) not null default 1,
  status              text not null default 'rascunho'
                        check (status in ('rascunho', 'publicada', 'arquivada')),
  descricao           text,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

-- Nota de um aluno em uma avaliação. `valor` nulo significa "não lançada"
-- (nunca convertida em zero automaticamente).
create table if not exists public.notas (
  id              text primary key,
  institution_id  text not null default 'instituicao-padrao',
  avaliacao_id    text not null references public.avaliacoes (id) on delete cascade,
  aluno_id        text not null references public.alunos (id) on delete cascade,
  valor           numeric(6, 2),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint notas_avaliacao_aluno_unico unique (avaliacao_id, aluno_id)
);

-- Chamada (registro de frequência) de uma turma em uma data.
-- `disciplina_id` nulo = frequência global por aula/dia.
create table if not exists public.frequencias (
  id                  text primary key,
  institution_id      text not null default 'instituicao-padrao',
  turma_id            text not null references public.turmas (id) on delete cascade,
  periodo_letivo_id   text references public.periodos_letivos (id) on delete set null,
  disciplina_id       text references public.disciplinas (id) on delete set null,
  data                date not null,
  observacao          text,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

-- Presença de um aluno em uma chamada.
create table if not exists public.presencas (
  id              text primary key,
  institution_id  text not null default 'instituicao-padrao',
  frequencia_id   text not null references public.frequencias (id) on delete cascade,
  aluno_id        text not null references public.alunos (id) on delete cascade,
  status          text not null default 'presente'
                    check (status in ('presente', 'falta', 'falta_justificada')),
  justificativa   text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  constraint presencas_frequencia_aluno_unico unique (frequencia_id, aluno_id)
);

create table if not exists public.eventos_auditoria (
  id              text primary key,
  institution_id  text not null default 'instituicao-padrao',
  ator_id         text,
  ator_nome       text,
  acao            text not null,
  entidade        text not null,
  referencia      text,
  detalhes        text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- Liga um usuário do Supabase Auth (`auth.users`) ao papel e à instituição no
-- domínio. É a base das políticas de RLS por papel.
create table if not exists public.perfis (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  institution_id  text not null default 'instituicao-padrao',
  papel           text not null
                    check (papel in ('administrador', 'professor', 'aluno')),
  nome            text,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. Índices de apoio (tenant e chaves estrangeiras)
-- -----------------------------------------------------------------------------

create index if not exists idx_disciplinas_institution on public.disciplinas (institution_id);
create index if not exists idx_professores_institution on public.professores (institution_id);
create index if not exists idx_turmas_institution on public.turmas (institution_id);
create index if not exists idx_alunos_institution on public.alunos (institution_id);
create index if not exists idx_alunos_turma on public.alunos (turma_id);
create index if not exists idx_periodos_institution on public.periodos_letivos (institution_id);
create index if not exists idx_etapas_periodo on public.etapas_avaliacao (periodo_letivo_id);
create index if not exists idx_matriculas_aluno on public.matriculas (aluno_id);
create index if not exists idx_matriculas_turma on public.matriculas (turma_id);
create index if not exists idx_vinculos_turma on public.vinculos_docentes (turma_id);
create index if not exists idx_avaliacoes_turma on public.avaliacoes (turma_id);
create index if not exists idx_avaliacoes_periodo on public.avaliacoes (periodo_letivo_id);
create index if not exists idx_notas_aluno on public.notas (aluno_id);
create index if not exists idx_notas_avaliacao on public.notas (avaliacao_id);
create index if not exists idx_frequencias_turma on public.frequencias (turma_id, data);
create index if not exists idx_presencas_aluno on public.presencas (aluno_id);
create index if not exists idx_presencas_frequencia on public.presencas (frequencia_id);
create index if not exists idx_auditoria_institution on public.eventos_auditoria (institution_id, criado_em desc);

-- Garante uma única chamada por turma/data/disciplina, tratando disciplina
-- nula (frequência global) como um valor próprio.
create unique index if not exists frequencias_turma_data_disciplina_unica
  on public.frequencias (turma_id, data, coalesce(disciplina_id, ''));

-- -----------------------------------------------------------------------------
-- 3. Atualização automática de `atualizado_em`
-- -----------------------------------------------------------------------------

create or replace function public.definir_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'instituicoes', 'disciplinas', 'professores', 'turmas', 'alunos',
    'periodos_letivos', 'etapas_avaliacao', 'matriculas', 'vinculos_docentes',
    'avaliacoes', 'notas', 'frequencias', 'presencas', 'eventos_auditoria',
    'perfis'
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
-- 4. Funções auxiliares de autorização (RLS)
-- -----------------------------------------------------------------------------
-- São `security definer` para poderem ler o papel/instituição do usuário sem
-- esbarrar nas próprias políticas de RLS.

create or replace function public.auth_papel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select papel from public.perfis where user_id = auth.uid()
$$;

create or replace function public.auth_institution()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select institution_id from public.perfis where user_id = auth.uid()
$$;

create or replace function public.auth_aluno_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id from public.alunos where user_id = auth.uid()
$$;

create or replace function public.auth_turma_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select turma_id from public.alunos where user_id = auth.uid()
$$;

create or replace function public.eh_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_papel() = 'administrador', false)
$$;

create or replace function public.eh_equipe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_papel() in ('administrador', 'professor'), false)
$$;

-- -----------------------------------------------------------------------------
-- 5. Row Level Security
-- -----------------------------------------------------------------------------
-- Regras gerais:
--   * administrador: acesso total dentro da própria instituição.
--   * professor: leitura dos dados acadêmicos e escrita em avaliações, notas,
--     frequências e presenças.
--   * aluno: leitura apenas dos próprios dados (matrícula, notas, presenças) e
--     dos dados públicos da própria turma (avaliações publicadas).
-- -----------------------------------------------------------------------------

alter table public.instituicoes       enable row level security;
alter table public.disciplinas        enable row level security;
alter table public.professores        enable row level security;
alter table public.turmas             enable row level security;
alter table public.alunos             enable row level security;
alter table public.periodos_letivos   enable row level security;
alter table public.etapas_avaliacao   enable row level security;
alter table public.matriculas         enable row level security;
alter table public.vinculos_docentes  enable row level security;
alter table public.avaliacoes         enable row level security;
alter table public.notas              enable row level security;
alter table public.frequencias        enable row level security;
alter table public.presencas          enable row level security;
alter table public.eventos_auditoria  enable row level security;
alter table public.perfis             enable row level security;

-- 5.1 Dados de referência sem informação pessoal: qualquer membro da
-- instituição lê; só o admin escreve. São necessários para o aluno montar o
-- próprio boletim (nome da turma, disciplinas, períodos e etapas).
do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'disciplinas', 'turmas', 'periodos_letivos', 'etapas_avaliacao'
  ]
  loop
    execute format('drop policy if exists %I_leitura on public.%I', tabela, tabela);
    execute format('drop policy if exists %I_escrita on public.%I', tabela, tabela);
    execute format(
      'create policy %I_leitura on public.%I for select
         using (institution_id = public.auth_institution())',
      tabela, tabela
    );
    execute format(
      'create policy %I_escrita on public.%I for all
         using (institution_id = public.auth_institution() and public.eh_administrador())
         with check (institution_id = public.auth_institution() and public.eh_administrador())',
      tabela, tabela
    );
  end loop;
end;
$$;

-- 5.1.1 Dados de referência com informação de contato: apenas a equipe lê.
do $$
declare
  tabela text;
begin
  foreach tabela in array array['professores', 'vinculos_docentes']
  loop
    execute format('drop policy if exists %I_leitura on public.%I', tabela, tabela);
    execute format('drop policy if exists %I_escrita on public.%I', tabela, tabela);
    execute format(
      'create policy %I_leitura on public.%I for select
         using (institution_id = public.auth_institution() and public.eh_equipe())',
      tabela, tabela
    );
    execute format(
      'create policy %I_escrita on public.%I for all
         using (institution_id = public.auth_institution() and public.eh_administrador())
         with check (institution_id = public.auth_institution() and public.eh_administrador())',
      tabela, tabela
    );
  end loop;
end;
$$;

-- 5.2 Instituição: leitura para membros; escrita só para admin.
drop policy if exists instituicoes_leitura on public.instituicoes;
create policy instituicoes_leitura on public.instituicoes
  for select using (institution_id = public.auth_institution());

drop policy if exists instituicoes_escrita on public.instituicoes;
create policy instituicoes_escrita on public.instituicoes
  for all
  using (institution_id = public.auth_institution() and public.eh_administrador())
  with check (institution_id = public.auth_institution() and public.eh_administrador());

-- 5.3 Alunos: a equipe vê os da instituição; o aluno vê só a si mesmo.
drop policy if exists alunos_leitura on public.alunos;
create policy alunos_leitura on public.alunos
  for select using (
    (institution_id = public.auth_institution() and public.eh_equipe())
    or user_id = auth.uid()
  );

drop policy if exists alunos_escrita on public.alunos;
create policy alunos_escrita on public.alunos
  for all
  using (institution_id = public.auth_institution() and public.eh_administrador())
  with check (institution_id = public.auth_institution() and public.eh_administrador());

-- 5.4 Matrículas: equipe vê da instituição; aluno vê as próprias.
drop policy if exists matriculas_leitura on public.matriculas;
create policy matriculas_leitura on public.matriculas
  for select using (
    (institution_id = public.auth_institution() and public.eh_equipe())
    or aluno_id = public.auth_aluno_id()
  );

drop policy if exists matriculas_escrita on public.matriculas;
create policy matriculas_escrita on public.matriculas
  for all
  using (institution_id = public.auth_institution() and public.eh_administrador())
  with check (institution_id = public.auth_institution() and public.eh_administrador());

-- 5.5 Avaliações: equipe vê da instituição; aluno vê as publicadas da sua turma.
drop policy if exists avaliacoes_leitura on public.avaliacoes;
create policy avaliacoes_leitura on public.avaliacoes
  for select using (
    (institution_id = public.auth_institution() and public.eh_equipe())
    or (status = 'publicada' and turma_id = public.auth_turma_id())
  );

drop policy if exists avaliacoes_escrita on public.avaliacoes;
create policy avaliacoes_escrita on public.avaliacoes
  for all
  using (institution_id = public.auth_institution() and public.eh_equipe())
  with check (institution_id = public.auth_institution() and public.eh_equipe());

-- 5.6 Notas: equipe vê da instituição; aluno vê só as próprias.
drop policy if exists notas_leitura on public.notas;
create policy notas_leitura on public.notas
  for select using (
    (institution_id = public.auth_institution() and public.eh_equipe())
    or aluno_id = public.auth_aluno_id()
  );

drop policy if exists notas_escrita on public.notas;
create policy notas_escrita on public.notas
  for all
  using (institution_id = public.auth_institution() and public.eh_equipe())
  with check (institution_id = public.auth_institution() and public.eh_equipe());

-- 5.7 Frequências: equipe vê da instituição; aluno vê as da sua turma.
drop policy if exists frequencias_leitura on public.frequencias;
create policy frequencias_leitura on public.frequencias
  for select using (
    (institution_id = public.auth_institution() and public.eh_equipe())
    or turma_id = public.auth_turma_id()
  );

drop policy if exists frequencias_escrita on public.frequencias;
create policy frequencias_escrita on public.frequencias
  for all
  using (institution_id = public.auth_institution() and public.eh_equipe())
  with check (institution_id = public.auth_institution() and public.eh_equipe());

-- 5.8 Presenças: equipe vê da instituição; aluno vê só as próprias.
drop policy if exists presencas_leitura on public.presencas;
create policy presencas_leitura on public.presencas
  for select using (
    (institution_id = public.auth_institution() and public.eh_equipe())
    or aluno_id = public.auth_aluno_id()
  );

drop policy if exists presencas_escrita on public.presencas;
create policy presencas_escrita on public.presencas
  for all
  using (institution_id = public.auth_institution() and public.eh_equipe())
  with check (institution_id = public.auth_institution() and public.eh_equipe());

-- 5.9 Auditoria: leitura e escrita apenas para a equipe (aluno não acessa).
drop policy if exists eventos_auditoria_leitura on public.eventos_auditoria;
create policy eventos_auditoria_leitura on public.eventos_auditoria
  for select using (institution_id = public.auth_institution() and public.eh_equipe());

drop policy if exists eventos_auditoria_escrita on public.eventos_auditoria;
create policy eventos_auditoria_escrita on public.eventos_auditoria
  for insert with check (institution_id = public.auth_institution() and public.eh_equipe());

-- 5.10 Perfis: cada usuário lê o próprio perfil; admin gerencia os da instituição.
drop policy if exists perfis_leitura on public.perfis;
create policy perfis_leitura on public.perfis
  for select using (
    user_id = auth.uid()
    or (institution_id = public.auth_institution() and public.eh_administrador())
  );

drop policy if exists perfis_escrita on public.perfis;
create policy perfis_escrita on public.perfis
  for all
  using (institution_id = public.auth_institution() and public.eh_administrador())
  with check (institution_id = public.auth_institution() and public.eh_administrador());
