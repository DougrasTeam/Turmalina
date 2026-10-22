-- =============================================================================
-- Turmalina - professor gerencia os vínculos de alunos com equipes (RF-017)
-- -----------------------------------------------------------------------------
-- A migração `0011` liberou a escrita em `equipes` para a equipe docente
-- (administrador e professor), mas manteve `equipe_membros` restrita ao
-- administrador. Com isso, o professor conseguia criar a equipe, mas recebia
-- "new row violates row-level security policy for table equipe_membros" ao
-- associar, transferir ou desassociar alunos.
--
-- Esta migração alinha os vínculos de membros às equipes: a equipe docente
-- (administrador/professor) gerencia os vínculos da própria instituição,
-- igual à política de `equipes`. O aluno continua apenas lendo os próprios
-- vínculos (política `equipe_membros_leitura`).
--
-- Deve ser executado no SQL Editor do Supabase após a migração `0012`.
-- =============================================================================

drop policy if exists equipe_membros_escrita on public.equipe_membros;
create policy equipe_membros_escrita on public.equipe_membros
  for all
  using (institution_id = public.auth_institution() and public.eh_equipe())
  with check (institution_id = public.auth_institution() and public.eh_equipe());
