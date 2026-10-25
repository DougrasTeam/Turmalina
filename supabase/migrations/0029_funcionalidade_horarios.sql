-- =============================================================================
-- Turmalina — funcionalidade de horários
-- -----------------------------------------------------------------------------
-- Adiciona a página administrativa de horários ao catálogo, ao plano padrão e
-- à matriz de permissões. A funcionalidade é exclusiva do administrador; o
-- professor continua consultando/ajustando a grade dentro da turma conforme as
-- permissões já existentes.
--
-- Deve ser executado após 0016 e 0028. É idempotente.
-- =============================================================================

insert into public.funcionalidades (chave, nome, descricao, grupo, ordem)
values (
  'horarios',
  'Horários',
  'Montagem e geração automática das grades horárias das turmas.',
  'administracao',
  19
)
on conflict (chave) do update
  set nome      = excluded.nome,
      descricao = excluded.descricao,
      grupo     = excluded.grupo,
      ordem     = excluded.ordem;

insert into public.planos_funcionalidades (id, plano_id, funcionalidade)
select
  'pf-completo-horarios',
  'plano-completo',
  'horarios'
on conflict (id) do nothing;

insert into public.permissoes_papel (id, papel, funcionalidade, habilitado)
values
  ('perm-adm-horarios', 'administrador', 'horarios', true),
  ('perm-prof-horarios', 'professor', 'horarios', false),
  ('perm-aluno-horarios', 'aluno', 'horarios', false)
on conflict (id) do update
  set habilitado = excluded.habilitado;
