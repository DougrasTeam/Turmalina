-- A policy de leitura não deve consultar a própria linha de frequencias por ID.
-- INSERT ... RETURNING (usado pelo SupabaseRepository) pode avaliar a policy
-- antes de a linha recém-criada estar visível para essa consulta interna.
-- Validar diretamente o escopo da linha mantém os mesmos limites de acesso.

drop policy if exists frequencias_leitura on public.frequencias;
create policy frequencias_leitura on public.frequencias
  for select using (
    (
      institution_id = public.auth_institution()
      and (
        public.eh_administrador()
        or (
          (
            disciplina_id is null
            and public.professor_tem_acesso_turma(turma_id)
          )
          or public.professor_tem_vinculo(turma_id, disciplina_id)
        )
      )
    )
    or turma_id = public.auth_turma_id()
  );
