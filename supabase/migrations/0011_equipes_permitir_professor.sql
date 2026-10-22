-- Turmalina - permitir que professores gerenciem equipes (RF-017)
-- A equipe docente precisa criar, editar e excluir equipes por turma/período.

-- Atualiza policy de escrita para permitir administrador e professor
drop policy if exists equipes_escrita on public.equipes;
create policy equipes_escrita on public.equipes
  for all
  using (institution_id = public.auth_institution() and public.eh_equipe())
  with check (institution_id = public.auth_institution() and public.eh_equipe());

-- Vínculos de membros: manter restrito ao administrador
drop policy if exists equipe_membros_escrita on public.equipe_membros;
create policy equipe_membros_escrita on public.equipe_membros
  for all
  using (institution_id = public.auth_institution() and public.eh_administrador())
  with check (institution_id = public.auth_institution() and public.eh_administrador());
