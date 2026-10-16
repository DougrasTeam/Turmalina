-- =============================================================================
-- Turmalina — fotos nas publicações do mural (RF-022)
-- -----------------------------------------------------------------------------
-- 1. Adiciona a coluna `imagem_url` em `public.publicacoes`.
-- 2. Cria o bucket público `mural-publicacoes` no Supabase Storage, usado para
--    guardar as fotos anexadas às publicações.
-- 3. Aplica RLS no Storage:
--      * leitura liberada (bucket público, para o `<img>` funcionar sem URL
--        assinada);
--      * escrita (insert/update/delete) restrita à equipe (administrador e
--        professor), reutilizando `public.eh_equipe()`.
--
-- Deve ser executado no SQL Editor do Supabase após os scripts anteriores.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Coluna de imagem na tabela de publicações
-- -----------------------------------------------------------------------------

alter table public.publicacoes
  add column if not exists imagem_url text;

-- -----------------------------------------------------------------------------
-- 2. Bucket de Storage das fotos do mural
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mural-publicacoes',
  'mural-publicacoes',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 3. Row Level Security do Storage para o bucket do mural
-- -----------------------------------------------------------------------------

drop policy if exists mural_leitura on storage.objects;
create policy mural_leitura on storage.objects
  for select
  using (bucket_id = 'mural-publicacoes');

drop policy if exists mural_escrita_equipe on storage.objects;
create policy mural_escrita_equipe on storage.objects
  for all
  to authenticated
  using (bucket_id = 'mural-publicacoes' and public.eh_equipe())
  with check (bucket_id = 'mural-publicacoes' and public.eh_equipe());
