-- =============================================================================
-- 0019 — Múltiplas escolas por usuário
-- -----------------------------------------------------------------------------
-- Até aqui cada conta de Auth tinha um único perfil (`perfis.user_id` era a
-- chave primária), portanto pertencia a exatamente uma escola. Esta migration:
--
--   1. cria um `slug` público e estável em `instituicoes` (usado em `/e/:slug`);
--   2. permite vários perfis por usuário (um por escola);
--   3. cria `instituicoes_ativas`, que guarda a escola selecionada após o login;
--   4. ajusta as funções de autorização para respeitar a escola selecionada;
--   5. expõe RPCs para listar/selecionar escola e resolver escola por slug.
--
-- Regra central: quando o usuário tem mais de uma escola ativa e nenhuma foi
-- selecionada, `auth_institution()` retorna null e o RLS bloqueia os dados até
-- a escolha. Com exatamente uma escola, a seleção é automática.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Slug público da escola
-- -----------------------------------------------------------------------------

alter table public.instituicoes
  add column if not exists slug text;

-- Remove acentos, troca espaços/símbolos por hífen e devolve minúsculas.
-- `immutable` porque só depende do texto de entrada.
create or replace function public.gerar_slug(texto text)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(
    both '-' from regexp_replace(
      translate(
        lower(coalesce(texto, '')),
        'áàâãäåéèêëíìîïóòôõöúùûüçñ',
        'aaaaaaeeeeiiiiooooouuuucn'
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  );
$$;

-- Preenche o slug das escolas existentes, resolvendo colisões com sufixo
-- numérico (o mesmo critério usado pelo gatilho de novos registros).
do $$
declare
  escola record;
  base text;
  candidato text;
  contador integer;
begin
  for escola in select id, nome from public.instituicoes order by criado_em
  loop
    base := public.gerar_slug(escola.nome);
    if base = '' then
      base := 'escola';
    end if;

    candidato := base;
    contador := 0;

    while exists (
      select 1
      from public.instituicoes
      where slug = candidato
        and id <> escola.id
    )
    loop
      contador := contador + 1;
      candidato := base || '-' || contador;
    end loop;

    update public.instituicoes
       set slug = candidato
     where id = escola.id;
  end loop;
end;
$$;

alter table public.instituicoes
  alter column slug set not null;

create unique index if not exists instituicoes_slug_unico
  on public.instituicoes (slug);

-- Gera/valida o slug no servidor. A Edge Function de contratação pode enviar
-- um slug sugerido ou deixar o campo nulo; em ambos os casos ele é único.
create or replace function public.definir_slug_instituicao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidato text;
  contador integer := 0;
begin
  base := public.gerar_slug(coalesce(nullif(new.slug, ''), new.nome));
  if base = '' then
    base := 'escola';
  end if;

  candidato := base;

  while exists (
    select 1
    from public.instituicoes
    where slug = candidato
      and id <> new.id
  )
  loop
    contador := contador + 1;
    candidato := base || '-' || contador;
  end loop;

  new.slug := candidato;
  return new;
end;
$$;

drop trigger if exists trg_slug_instituicao on public.instituicoes;

create trigger trg_slug_instituicao
  before insert or update of nome, slug on public.instituicoes
  for each row execute function public.definir_slug_instituicao();

-- -----------------------------------------------------------------------------
-- 2. Vários perfis por usuário (um por escola)
-- -----------------------------------------------------------------------------

alter table public.perfis
  add column if not exists id uuid;

update public.perfis
   set id = gen_random_uuid()
 where id is null;

alter table public.perfis
  alter column id set default gen_random_uuid();

alter table public.perfis
  alter column id set not null;

-- Troca a chave primária de `user_id` para `id`, preservando o vínculo único
-- entre usuário e escola.
do $$
declare
  colunas_pk text;
  nome_pk text;
begin
  select c.conname, string_agg(a.attname, ',' order by a.attname)
    into nome_pk, colunas_pk
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any (c.conkey)
   where c.conrelid = 'public.perfis'::regclass
     and c.contype = 'p'
   group by c.conname;

  if colunas_pk is distinct from 'id' then
    if nome_pk is not null then
      execute format('alter table public.perfis drop constraint %I', nome_pk);
    end if;

    alter table public.perfis add constraint perfis_pkey primary key (id);
  end if;
end;
$$;

create unique index if not exists perfis_user_institution_unico
  on public.perfis (user_id, institution_id);

-- -----------------------------------------------------------------------------
-- 3. Escola selecionada pelo usuário
-- -----------------------------------------------------------------------------
-- Tabela auxiliar sem policies de RLS: só as funções `security definer` abaixo
-- a manipulam. Assim o usuário não consegue forjar uma seleção por escrita
-- direta; ele passa por `selecionar_instituicao`, que valida o vínculo.

create table if not exists public.instituicoes_ativas (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  institution_id text not null,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

alter table public.instituicoes_ativas enable row level security;

drop trigger if exists trg_atualizado_em on public.instituicoes_ativas;

create trigger trg_atualizado_em
  before update on public.instituicoes_ativas
  for each row execute function public.definir_atualizado_em();

-- -----------------------------------------------------------------------------
-- 4. Funções de autorização cientes da escola selecionada
-- -----------------------------------------------------------------------------

create or replace function public.auth_institution()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select ia.institution_id
      from public.instituicoes_ativas ia
      join public.perfis p
        on p.user_id = ia.user_id
       and p.institution_id = ia.institution_id
       and p.ativo
      where ia.user_id = auth.uid()
      limit 1
    ),
    (
      select case
               when count(*) = 1 then min(p.institution_id)
               else null
             end
      from public.perfis p
      where p.user_id = auth.uid()
        and p.ativo
    )
  );
$$;

create or replace function public.auth_papel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.perfis as perfil
      where perfil.user_id = auth.uid()
        and perfil.ativo
        and perfil.papel = 'super_admin'
    ) then 'super_admin'
    else (
      select perfil.papel
      from public.perfis as perfil
      where perfil.user_id = auth.uid()
        and perfil.ativo
        and perfil.institution_id = public.auth_institution()
      limit 1
    )
  end;
$$;

create or replace function public.auth_aluno_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select a.id
  from public.alunos a
  join public.perfis p
    on p.user_id = a.user_id
   and p.ativo
   and p.institution_id = a.institution_id
  where a.user_id = auth.uid()
    and a.institution_id = public.auth_institution()
$$;

create or replace function public.auth_turma_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select a.turma_id
  from public.alunos a
  join public.perfis p
    on p.user_id = a.user_id
   and p.ativo
   and p.institution_id = a.institution_id
  where a.user_id = auth.uid()
    and a.institution_id = public.auth_institution()
$$;

-- A flag de primeiro acesso é da conta: limpa em todos os vínculos.
create or replace function public.concluir_primeiro_acesso()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  update public.perfis
     set precisa_trocar_senha = false
   where user_id = auth.uid();
end;
$$;

grant execute on function public.concluir_primeiro_acesso() to authenticated;

-- -----------------------------------------------------------------------------
-- 5. RPCs de apoio ao frontend
-- -----------------------------------------------------------------------------

create or replace function public.minhas_instituicoes()
returns table (
  institution_id        text,
  nome_instituicao      text,
  slug                  text,
  papel                 text,
  nome_usuario          text,
  status_instituicao    text,
  selecionada           boolean,
  precisa_trocar_senha  boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  -- O super_admin é global: participa de uma membresia sintética sem escola.
  if exists (
    select 1
    from public.perfis
    where perfis.user_id = auth.uid()
      and perfis.ativo
      and perfis.papel = 'super_admin'
  ) then
    return query
      select
        'saas'::text,
        'Turmalina SaaS'::text,
        null::text,
        'super_admin'::text,
        coalesce(
          (
            select perfil.nome
            from public.perfis as perfil
            where perfil.user_id = auth.uid()
              and perfil.ativo
              and perfil.papel = 'super_admin'
            limit 1
          ),
          'Administrador SaaS'
        )::text,
        'ativa'::text,
        true,
        false;
    return;
  end if;

  return query
    select
      p.institution_id,
      coalesce(nullif(i.nome, ''), 'Escola')::text,
      i.slug,
      p.papel,
      coalesce(nullif(p.nome, ''), 'Usuário')::text,
      coalesce(i.status, 'ativa')::text,
      (ia.institution_id = p.institution_id),
      p.precisa_trocar_senha
    from public.perfis p
    left join public.instituicoes i
      on i.institution_id = p.institution_id
    left join public.instituicoes_ativas ia
      on ia.user_id = p.user_id
    where p.user_id = auth.uid()
      and p.ativo
    order by i.nome, p.institution_id;
end;
$$;

revoke all on function public.minhas_instituicoes() from public;
grant execute on function public.minhas_instituicoes() to authenticated;

create or replace function public.selecionar_instituicao(p_institution_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  escola record;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '28000';
  end if;

  select p.institution_id, i.status
    into escola
    from public.perfis p
    join public.instituicoes i
      on i.institution_id = p.institution_id
   where p.user_id = auth.uid()
     and p.ativo
     and p.institution_id = p_institution_id
   limit 1;

  if not found then
    raise exception 'Usuário sem vínculo com a escola informada.' using errcode = '42501';
  end if;

  if escola.status <> 'ativa' then
    raise exception 'A escola informada está inativa.' using errcode = '42501';
  end if;

  insert into public.instituicoes_ativas (user_id, institution_id, atualizado_em)
  values (auth.uid(), p_institution_id, now())
  on conflict (user_id) do update
    set institution_id = excluded.institution_id,
        atualizado_em = now();
end;
$$;

revoke all on function public.selecionar_instituicao(text) from public;
grant execute on function public.selecionar_instituicao(text) to authenticated;

create or replace function public.limpar_instituicao_ativa()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '28000';
  end if;

  delete from public.instituicoes_ativas
   where user_id = auth.uid();
end;
$$;

revoke all on function public.limpar_instituicao_ativa() from public;
grant execute on function public.limpar_instituicao_ativa() to authenticated;

-- Resolve a escola de um link público `/e/:slug`. Devolve também escolas
-- inativas, para a interface explicar o motivo do bloqueio.
create or replace function public.escola_por_slug(p_slug text)
returns table (
  institution_id text,
  nome           text,
  slug           text,
  status         text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.institution_id,
    i.nome,
    i.slug,
    i.status
  from public.instituicoes i
  where i.slug = public.gerar_slug(p_slug)
  limit 1;
$$;

revoke all on function public.escola_por_slug(text) from public;
grant execute on function public.escola_por_slug(text) to anon, authenticated;
