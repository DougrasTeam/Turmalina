-- =============================================================================
-- Turmalina - garantir coluna disciplina_id em eventos_xp e atualizar schema cache
-- =============================================================================

alter table public.eventos_xp
  add column if not exists disciplina_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.eventos_xp'::regclass
      and conname = 'eventos_xp_disciplina_id_fkey'
  ) then
    alter table public.eventos_xp
      add constraint eventos_xp_disciplina_id_fkey
      foreign key (disciplina_id) references public.disciplinas (id) on delete set null;
  end if;
end;
$$;

create index if not exists idx_eventos_xp_contexto
  on public.eventos_xp (institution_id, turma_id, disciplina_id);

-- Forçar PostgREST a recarregar o schema cache
notify pgrst, 'reload schema';
