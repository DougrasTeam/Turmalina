-- =============================================================================
-- Turmalina — contratação pública de planos
-- -----------------------------------------------------------------------------
-- A página `/contratar` é acessível sem login (vinda da landing). Para listar os
-- planos disponíveis, a leitura de `planos` precisa permitir o papel `anon`.
-- Apenas planos ativos e seus campos comerciais ficam expostos.
-- =============================================================================

drop policy if exists planos_leitura_publica on public.planos;

create policy planos_leitura_publica
  on public.planos
  for select
  to anon, authenticated
  using (ativo = true);

-- `PlanosService.load()` também lê `planos_funcionalidades` para montar o que
-- cada plano inclui. Sem esta policy a leitura anônima falha e a página
-- `/contratar` fica sem planos.
drop policy if exists planos_funcionalidades_leitura_publica on public.planos_funcionalidades;

create policy planos_funcionalidades_leitura_publica
  on public.planos_funcionalidades
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.planos
      where planos.id = planos_funcionalidades.plano_id
        and planos.ativo = true
    )
  );
