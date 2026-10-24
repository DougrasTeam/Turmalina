-- -----------------------------------------------------------------------------
-- 0021 — Corrigir referências ambíguas na RPC minhas_instituicoes
-- -----------------------------------------------------------------------------
-- Em funções PL/pgSQL RETURNS TABLE, os nomes das colunas de saída também são
-- variáveis PL/pgSQL. Qualifique as referências a `papel` e às demais colunas
-- de perfis para evitar ambiguidade ao chamar a RPC.
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
            select perfis.nome
            from public.perfis
            where perfis.user_id = auth.uid()
              and perfis.ativo
              and perfis.papel = 'super_admin'
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
      perfil.institution_id,
      coalesce(nullif(instituicao.nome, ''), 'Escola')::text,
      instituicao.slug,
      perfil.papel,
      coalesce(nullif(perfil.nome, ''), 'Usuário')::text,
      coalesce(instituicao.status, 'ativa')::text,
      (instituicao_ativa.institution_id = perfil.institution_id),
      perfil.precisa_trocar_senha
    from public.perfis as perfil
    left join public.instituicoes as instituicao
      on instituicao.institution_id = perfil.institution_id
    left join public.instituicoes_ativas as instituicao_ativa
      on instituicao_ativa.user_id = perfil.user_id
    where perfil.user_id = auth.uid()
      and perfil.ativo
    order by instituicao.nome, perfil.institution_id;
end;
$$;

revoke all on function public.minhas_instituicoes() from public;
grant execute on function public.minhas_instituicoes() to authenticated;
