-- =============================================================================
-- Turmalina - corrigir unicidade de ações de gamificação por contexto
-- =============================================================================

-- Remover constraint antiga globalmente única se existir
do $$
begin
  if exists (
    select 1
      from pg_constraint
     where conrelid = 'public.acoes_gamificacao'::regclass
       and conname = 'acoes_gamificacao_nome_unico'
  ) then
    alter table public.acoes_gamificacao
      drop constraint acoes_gamificacao_nome_unico;
  end if;
end;
$$;

-- Remover índices únicos antigos relacionados a nome se existirem
drop index if exists public.acoes_gamificacao_nome_unique;
drop index if exists public.idx_acoes_gamificacao_nome_unico;
drop index if exists public.acoes_gamificacao_nome_instituicao_unico;

-- Garantir índice único contextual (permite mesmo nome in contextos diferentes e in global)
create unique index if not exists acoes_gamificacao_nome_contexto_unico
  on public.acoes_gamificacao (
    institution_id,
    coalesce(turma_id, ''),
    coalesce(disciplina_id, ''),
    lower(nome)
  );