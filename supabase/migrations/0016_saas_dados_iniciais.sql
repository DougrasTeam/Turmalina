-- =============================================================================
-- Turmalina — catálogo de funcionalidades, plano padrão e super admin
-- -----------------------------------------------------------------------------
-- Popula o catálogo de funcionalidades do sistema e um plano padrão, e vincula
-- a instituição de demonstração a esse plano. Também promove um usuário de
-- e-mail conhecido a super_admin, se ele existir.
--
-- As `chave`s abaixo espelham os itens de menu/rotas do app. O super admin pode
-- renomear rótulos depois; a `chave` é estável.
--
-- Deve ser executado após 0015. É idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Catálogo de funcionalidades
-- -----------------------------------------------------------------------------

insert into public.funcionalidades (chave, nome, descricao, grupo, ordem)
values
  ('dashboard',              'Painel',               'Visão geral da escola.',                         'principal', 1),
  ('turmas',                 'Turmas',               'Gestão de turmas e seus detalhes.',              'principal', 2),
  ('mural',                  'Mural e recados',      'Publicações e comunicados.',                     'principal', 3),
  ('alunos',                 'Alunos',               'Consulta e gestão de alunos.',                   'consulta',  4),
  ('professores',            'Professores',          'Consulta e gestão de professores.',              'consulta',  5),
  ('frequencia',             'Frequência',           'Registro e acompanhamento de frequência.',       'academico', 6),
  ('avaliacoes',             'Avaliações e notas',   'Lançamento de avaliações e notas.',              'academico', 7),
  ('agenda',                 'Agenda',               'Eventos e calendário escolar.',                  'academico', 8),
  ('gamificacao.pontuar',    'Pontuar',              'Atribuição de XP e moedas.',                     'gamificacao', 9),
  ('gamificacao.equipes',    'Equipes',              'Equipes e sorteios da gamificação.',             'gamificacao', 10),
  ('gamificacao.acoes',      'Ações de XP',          'Configuração das ações de XP.',                  'gamificacao', 11),
  ('gamificacao.conquistas', 'Conquistas',           'Configuração de conquistas.',                    'gamificacao', 12),
  ('gamificacao.moedas',     'Loja de moedas',       'Loja de moedas virtuais.',                       'gamificacao', 13),
  ('instituicao',            'Instituição',          'Configurações acadêmicas da escola.',            'administracao', 14),
  ('periodos-letivos',       'Períodos letivos',     'Períodos e etapas de avaliação.',                'administracao', 15),
  ('disciplinas',            'Disciplinas',          'Catálogo de disciplinas.',                       'administracao', 16),
  ('relatorios',             'Relatórios',           'Relatórios e indicadores.',                      'administracao', 17),
  ('auditoria',              'Auditoria',            'Trilha de auditoria do sistema.',                'administracao', 18),
  ('aluno.inicio',           'Área do aluno',        'Início do portal do aluno.',                     'aluno', 19),
  ('aluno.boletim',          'Boletim',              'Boletim do aluno.',                              'aluno', 20),
  ('aluno.mural',            'Mural do aluno',       'Mural visto pelo aluno.',                        'aluno', 21),
  ('aluno.agenda',           'Agenda do aluno',      'Agenda vista pelo aluno.',                       'aluno', 22),
  ('aluno.gamificacao',      'Meu XP',               'XP e moedas do aluno.',                          'aluno', 23),
  ('aluno.moedas',           'Moedas do aluno',      'Loja de moedas do aluno.',                       'aluno', 24),
  ('aluno.conquistas',       'Álbum de conquistas',  'Conquistas do aluno.',                           'aluno', 25)
on conflict (chave) do update
  set nome      = excluded.nome,
      descricao = excluded.descricao,
      grupo     = excluded.grupo,
      ordem     = excluded.ordem;

-- -----------------------------------------------------------------------------
-- 2. Plano padrão (inclui todas as funcionalidades)
-- -----------------------------------------------------------------------------

insert into public.planos (id, nome, descricao, preco_mensal, ativo)
values (
  'plano-completo',
  'Completo',
  'Acesso a todas as funcionalidades do sistema.',
  0,
  true
)
on conflict (id) do nothing;

insert into public.planos_funcionalidades (id, plano_id, funcionalidade)
select
  'pf-completo-' || f.chave,
  'plano-completo',
  f.chave
from public.funcionalidades f
on conflict (id) do nothing;

-- Vincula a instituição de demonstração ao plano padrão, se ainda não tiver.
update public.instituicoes
   set plano_id = 'plano-completo'
 where plano_id is null;

-- -----------------------------------------------------------------------------
-- 3. Matriz de permissões por papel (padrões iniciais)
-- -----------------------------------------------------------------------------
-- Define o estado padrão conhecido hoje: administrador acessa tudo; professor
-- acessa a equipe docente sem as áreas administrativas e sem o portal do aluno;
-- aluno acessa apenas o próprio portal.

insert into public.permissoes_papel (id, papel, funcionalidade, habilitado)
select
  'perm-adm-' || f.chave,
  'administrador',
  f.chave,
  true
from public.funcionalidades f
on conflict (id) do nothing;

insert into public.permissoes_papel (id, papel, funcionalidade, habilitado)
select
  'perm-prof-' || f.chave,
  'professor',
  f.chave,
  f.chave in (
    'dashboard', 'turmas', 'mural', 'alunos', 'professores', 'frequencia',
    'avaliacoes', 'agenda', 'gamificacao.pontuar', 'gamificacao.equipes',
    'gamificacao.acoes', 'gamificacao.conquistas', 'gamificacao.moedas'
  )
from public.funcionalidades f
on conflict (id) do nothing;

insert into public.permissoes_papel (id, papel, funcionalidade, habilitado)
select
  'perm-aluno-' || f.chave,
  'aluno',
  f.chave,
  f.chave like 'aluno.%'
from public.funcionalidades f
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 4. Super admin (opcional)
-- -----------------------------------------------------------------------------
-- Promove o usuário informado a super_admin, se existir no Auth. Ajuste o
-- e-mail conforme necessário e reexecute.

update public.perfis
   set papel = 'super_admin',
       institution_id = 'saas'
 where user_id = (select id from auth.users where email = 'adm@turmalina.com' limit 1)
   and exists (select 1 from auth.users where email = 'adm@turmalina.com');
