-- Turmalina - equipes por disciplina (adendo ao RF-017)
-- As equipes passam a pertencer ao contexto turma + disciplina + período letivo.

-- Adiciona disciplina_id às equipes
alter table public.equipes
  add column if not exists disciplina_id text references public.disciplinas(id) on delete set null;

-- Remove restrição antiga e cria nova considerando disciplina
alter table public.equipes drop constraint if exists equipes_nome_unico;

create unique index if not exists equipes_nome_unico_por_contexto
  on public.equipes (institution_id, turma_id, periodo_letivo_id, coalesce(disciplina_id, ''), nome);

-- Índice para filtrar por disciplina
create index if not exists idx_equipes_disciplina on public.equipes (disciplina_id);
