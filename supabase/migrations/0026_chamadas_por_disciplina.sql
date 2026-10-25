-- Novas chamadas devem identificar a disciplina da aula.
-- Chamadas históricas com disciplina_id nulo são preservadas.

drop policy if exists frequencias_escrita on public.frequencias;
create policy frequencias_escrita on public.frequencias
  for all
  using (
    institution_id = public.auth_institution()
    and (
      public.eh_administrador()
      or public.professor_pode_frequencia(id)
    )
  )
  with check (
    institution_id = public.auth_institution()
    and disciplina_id is not null
    and (
      public.eh_administrador()
      or public.professor_tem_vinculo(turma_id, disciplina_id)
    )
  );
