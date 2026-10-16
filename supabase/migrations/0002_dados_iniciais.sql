-- =============================================================================
-- Turmalina — dados iniciais (demonstração)
-- -----------------------------------------------------------------------------
-- Execute DEPOIS de 0001_esquema_inicial.sql e DEPOIS de criar os três usuários
-- no painel Authentication > Users:
--     adm@turmalina.com        (administrador)
--     professor@turmalina.com  (professor)
--     aluno@turmalina.com      (aluno)
--
-- O script é idempotente: pode ser reexecutado sem duplicar registros.
-- Espelha o que a aplicação cria localmente (DadosDemoService).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Instituição, disciplinas, professor, turma e aluno
-- -----------------------------------------------------------------------------

insert into public.instituicoes (id, institution_id, nome, fuso_horario, status)
values (
  'instituicao-padrao',
  'instituicao-padrao',
  'Escola Turmalina (Demonstração)',
  'America/Sao_Paulo',
  'ativa'
)
on conflict (id) do nothing;

insert into public.disciplinas (id, institution_id, nome, codigo, carga_horaria, cor, ativa)
values
  ('disc-matematica', 'instituicao-padrao', 'Matemática',       'MAT', 80, '#2563eb', true),
  ('disc-portugues',  'instituicao-padrao', 'Português',        'POR', 80, '#16a34a', true),
  ('disc-ciencias',   'instituicao-padrao', 'Ciências',         'CIE', 80, '#db2777', true),
  ('disc-historia',   'instituicao-padrao', 'História',         'HIS', 80, '#f59e0b', true),
  ('disc-geografia',  'instituicao-padrao', 'Geografia',        'GEO', 80, '#7c3aed', true),
  ('disc-ingles',     'instituicao-padrao', 'Inglês',           'ING', 80, '#0891b2', true),
  ('disc-arte',       'instituicao-padrao', 'Arte',             'ART', 80, '#dc2626', true),
  ('disc-ed-fisica',  'instituicao-padrao', 'Educação Física',  'EF',  80, '#65a30d', true)
on conflict (id) do nothing;

insert into public.professores (id, institution_id, nome, email, telefone, disciplinas, ativo)
values (
  'prof-bruno',
  'instituicao-padrao',
  'Bruno Professor',
  'professor@turmalina.com',
  '',
  array['disc-matematica', 'disc-portugues'],
  true
)
on conflict (id) do nothing;

insert into public.turmas (
  id, institution_id, nome, serie, turno, ano_letivo, codigo, descricao,
  professor_ids, disciplina_ids, ativa
)
values (
  'turma-demo',
  'instituicao-padrao',
  'Turma Demonstração',
  '1º Ano',
  'manha',
  extract(year from now())::int,
  'DEMO01',
  'Turma sintética para testar os fluxos de demonstração.',
  array['prof-bruno'],
  array['disc-matematica', 'disc-portugues'],
  true
)
on conflict (id) do nothing;

insert into public.alunos (
  id, institution_id, nome, email, matricula, turma_id, data_nascimento,
  responsavel, telefone_responsavel, ativo, xp, moedas
)
values (
  'aluno-carla',
  'instituicao-padrao',
  'Carla Aluna',
  'aluno@turmalina.com',
  'DEMO-0001',
  'turma-demo',
  '',
  '',
  '',
  true,
  120,
  40
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Período letivo e etapas
-- -----------------------------------------------------------------------------

insert into public.periodos_letivos (id, institution_id, nome, data_inicio, data_fim, status)
values (
  'periodo-demo',
  'instituicao-padrao',
  'Ano Letivo (Demonstração)',
  make_date(extract(year from now())::int, 2, 1),
  make_date(extract(year from now())::int, 12, 15),
  'ativo'
)
on conflict (id) do nothing;

insert into public.etapas_avaliacao (id, institution_id, periodo_letivo_id, nome, tipo, data_inicio, data_fim)
values
  ('etapa-1', 'instituicao-padrao', 'periodo-demo', '1º Bimestre', 'bimestre',
     make_date(extract(year from now())::int, 2, 1), make_date(extract(year from now())::int, 4, 30)),
  ('etapa-2', 'instituicao-padrao', 'periodo-demo', '2º Bimestre', 'bimestre',
     make_date(extract(year from now())::int, 5, 1), make_date(extract(year from now())::int, 7, 15)),
  ('etapa-3', 'instituicao-padrao', 'periodo-demo', '3º Bimestre', 'bimestre',
     make_date(extract(year from now())::int, 8, 1), make_date(extract(year from now())::int, 9, 30)),
  ('etapa-4', 'instituicao-padrao', 'periodo-demo', '4º Bimestre', 'bimestre',
     make_date(extract(year from now())::int, 10, 1), make_date(extract(year from now())::int, 12, 15))
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 3. Vínculos docentes, matrícula, avaliações, notas e frequência
-- -----------------------------------------------------------------------------

insert into public.vinculos_docentes (id, institution_id, professor_id, turma_id, disciplina_id, ativo)
values
  ('vinculo-matematica', 'instituicao-padrao', 'prof-bruno', 'turma-demo', 'disc-matematica', true),
  ('vinculo-portugues',  'instituicao-padrao', 'prof-bruno', 'turma-demo', 'disc-portugues',  true)
on conflict (id) do nothing;

insert into public.matriculas (
  id, institution_id, aluno_id, turma_id, periodo_letivo_id, status, inicio_em
)
values (
  'matricula-demo',
  'instituicao-padrao',
  'aluno-carla',
  'turma-demo',
  'periodo-demo',
  'ativa',
  make_date(extract(year from now())::int, 2, 1)
)
on conflict (id) do nothing;

insert into public.avaliacoes (
  id, institution_id, nome, turma_id, disciplina_id, periodo_letivo_id, etapa_id,
  data, nota_maxima, peso, status, descricao
)
values
  ('aval-matematica', 'instituicao-padrao', 'Avaliação diagnóstica — Matemática',
     'turma-demo', 'disc-matematica', 'periodo-demo', 'etapa-1', current_date, 10, 1,
     'publicada', 'Nota sintética para demonstração.'),
  ('aval-portugues', 'instituicao-padrao', 'Avaliação diagnóstica — Português',
     'turma-demo', 'disc-portugues', 'periodo-demo', 'etapa-1', current_date, 10, 1,
     'publicada', 'Nota sintética para demonstração.')
on conflict (id) do nothing;

insert into public.notas (id, institution_id, avaliacao_id, aluno_id, valor)
values
  ('nota-matematica-carla', 'instituicao-padrao', 'aval-matematica', 'aluno-carla', 8.5),
  ('nota-portugues-carla',  'instituicao-padrao', 'aval-portugues',  'aluno-carla', 8.5)
on conflict (id) do nothing;

insert into public.frequencias (
  id, institution_id, turma_id, periodo_letivo_id, disciplina_id, data, observacao
)
values (
  'freq-demo',
  'instituicao-padrao',
  'turma-demo',
  'periodo-demo',
  null,
  current_date,
  'Chamada sintética para demonstração.'
)
on conflict (id) do nothing;

insert into public.presencas (id, institution_id, frequencia_id, aluno_id, status)
values (
  'presenca-demo',
  'instituicao-padrao',
  'freq-demo',
  'aluno-carla',
  'presente'
)
on conflict (id) do nothing;

-- Alguns eventos de auditoria para a tela de auditoria.
insert into public.eventos_auditoria (id, institution_id, ator_id, ator_nome, acao, entidade, referencia, detalhes)
values
  ('auditoria-demo-1', 'instituicao-padrao', null, 'Ana Administradora', 'periodo.ativado',
     'PeriodoLetivo', 'periodo-demo', 'Ano Letivo (Demonstração)'),
  ('auditoria-demo-2', 'instituicao-padrao', null, 'Bruno Professor', 'avaliacao.publicada',
     'Avaliacao', 'aval-matematica', 'Avaliação diagnóstica — Matemática')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 4. Vínculo entre usuários do Auth e o domínio (papel + registros)
-- -----------------------------------------------------------------------------
-- Requer que os três usuários já existam em autenticação. Se ainda não existirem,
-- reexecute este trecho após criá-los.

insert into public.perfis (user_id, institution_id, papel, nome, ativo)
select
  u.id,
  'instituicao-padrao',
  case u.email
    when 'adm@turmalina.com'       then 'administrador'
    when 'professor@turmalina.com' then 'professor'
    when 'aluno@turmalina.com'     then 'aluno'
  end,
  coalesce(u.raw_user_meta_data ->> 'nome', split_part(u.email, '@', 1)),
  true
from auth.users u
where u.email in ('adm@turmalina.com', 'professor@turmalina.com', 'aluno@turmalina.com')
on conflict (user_id) do update
  set institution_id = excluded.institution_id,
      papel          = excluded.papel,
      nome           = excluded.nome,
      ativo          = excluded.ativo;

update public.professores p
   set user_id = u.id
  from auth.users u
 where u.email = p.email;

update public.alunos a
   set user_id = u.id
  from auth.users u
 where u.email = a.email;
