// =============================================================================
// Edge Function: admin-usuarios
// =============================================================================
// Cria e redefine contas de acesso (Supabase Auth) em nome do administrador.
//
// Por que uma Edge Function: criar usuários exige a chave `service_role`, que
// nunca pode ir para o frontend. Esta função roda no servidor com essa chave e
// só executa a ação após confirmar que quem chamou é administrador da escola
// ativa no token.
//
// Ações aceitas (campo `acao` no corpo JSON):
//   - criar:          { email, nome, papel, referencia? }
//                     Cria a conta, grava o perfil na escola do administrador e
//                     vincula um registro de domínio (professor/aluno).
//   - redefinir-senha: { userId }
//                     Gera uma nova senha para a conta informada.
//   - excluir-conta:  { userId }
//                     Remove o vínculo (perfil) do usuário com a escola do
//                     administrador. A conta de Auth só é apagada quando o
//                     usuário não possui outros vínculos.
//
// Resposta (sucesso): { userId, email, senha }
// Resposta (erro):    { erro } com status HTTP adequado.
//
// Com múltiplas escolas por usuário, o perfil é identificado por
// `(user_id, institution_id)` (ver migration 0019).
// =============================================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAPEIS_ACEITOS = ['administrador', 'professor', 'aluno'] as const;
const PAPEL_ADMINISTRADOR = 'administrador';
const TABELAS_REFERENCIA = ['professores', 'alunos'] as const;

type Papel = (typeof PAPEIS_ACEITOS)[number];
type TabelaReferencia = (typeof TABELAS_REFERENCIA)[number];

interface ReferenciaAcademica {
  tabela: TabelaReferencia;
  id: string;
}

interface CorpoRequisicao {
  acao?: string;
  email?: string;
  nome?: string;
  papel?: string;
  referencia?: ReferenciaAcademica;
  userId?: string;
}

interface AdministradorAutenticado {
  userId: string;
  /** Escola ativa no contexto do token (ver `auth_institution()`). */
  institutionId: string;
}

const CABECALHOS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respostaJson(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CABECALHOS_CORS, 'Content-Type': 'application/json' },
  });
}

function respostaErro(mensagem: string, status = 400): Response {
  return respostaJson({ erro: mensagem }, status);
}

/** Gera uma senha aleatória razoavelmente forte (letras, dígitos e um símbolo). */
function gerarSenha(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const simbolos = '!@#$%&*';
  const tamanho = 12;
  const bytes = new Uint8Array(tamanho + 2);
  crypto.getRandomValues(bytes);

  let senha = '';
  for (let indice = 0; indice < tamanho; indice += 1) {
    senha += alfabeto[bytes[indice] % alfabeto.length];
  }

  return senha + simbolos[bytes[tamanho] % simbolos.length] + (bytes[tamanho + 1] % 10);
}

function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function ehPapel(papel: string): papel is Papel {
  return (PAPEIS_ACEITOS as readonly string[]).includes(papel);
}

function ehTabelaReferencia(tabela: string): tabela is TabelaReferencia {
  return (TABELAS_REFERENCIA as readonly string[]).includes(tabela);
}

/**
 * Confirma que o chamador está autenticado e é administrador da escola ativa.
 * Usa um cliente com o token do próprio usuário para respeitar as políticas de
 * RLS e a escola selecionada no login (multi-escola).
 */
async function verificarAdministrador(
  url: string,
  anonKey: string,
  authorization: string | null,
): Promise<AdministradorAutenticado | null> {
  if (!authorization) {
    return null;
  }

  const clienteDoChamador = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });

  const { data: dadosUsuario, error: erroUsuario } = await clienteDoChamador.auth.getUser();
  if (erroUsuario || !dadosUsuario.user) {
    return null;
  }

  const { data: institutionId, error: erroInstituicao } =
    await clienteDoChamador.rpc('auth_institution');

  if (erroInstituicao || typeof institutionId !== 'string' || !institutionId) {
    return null;
  }

  const { data: perfil, error: erroPerfil } = await clienteDoChamador
    .from('perfis')
    .select('papel')
    .eq('user_id', dadosUsuario.user.id)
    .eq('institution_id', institutionId)
    .eq('ativo', true)
    .maybeSingle();

  if (erroPerfil || perfil?.papel !== PAPEL_ADMINISTRADOR) {
    return null;
  }

  return { userId: dadosUsuario.user.id, institutionId };
}

async function criarConta(
  admin: SupabaseClient,
  corpo: CorpoRequisicao,
  institutionId: string,
): Promise<Response> {
  const email = (corpo.email ?? '').trim().toLowerCase();
  const nome = (corpo.nome ?? '').trim();
  const papel = corpo.papel ?? '';

  if (!emailValido(email)) {
    return respostaErro('Informe um e-mail válido.');
  }
  if (!nome) {
    return respostaErro('Informe o nome do usuário.');
  }
  if (!ehPapel(papel)) {
    return respostaErro('Papel inválido.');
  }

  const senha = gerarSenha();

  const { data: criado, error: erroCriacao } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    app_metadata: { papel },
    user_metadata: { nome },
  });

  if (erroCriacao || !criado.user) {
    return respostaErro(erroCriacao?.message ?? 'Não foi possível criar a conta.', 409);
  }

  const { error: erroPerfil } = await admin.from('perfis').upsert(
    {
      user_id: criado.user.id,
      institution_id: institutionId,
      papel,
      nome,
      ativo: true,
      precisa_trocar_senha: true,
    },
    { onConflict: 'user_id,institution_id' },
  );

  if (erroPerfil) {
    await admin.auth.admin.deleteUser(criado.user.id);
    return respostaErro('Não foi possível registrar o perfil do usuário.', 500);
  }

  const referencia = corpo.referencia;
  if (referencia && ehTabelaReferencia(referencia.tabela) && referencia.id) {
    const { error: erroVinculo } = await admin
      .from(referencia.tabela)
      .update({ user_id: criado.user.id })
      .eq('id', referencia.id)
      .eq('institution_id', institutionId);

    if (erroVinculo) {
      return respostaErro('Conta criada, mas não foi possível vincular ao cadastro.', 500);
    }
  }

  return respostaJson({ userId: criado.user.id, email, senha });
}

async function redefinirSenha(
  admin: SupabaseClient,
  corpo: CorpoRequisicao,
  institutionId: string,
): Promise<Response> {
  const userId = (corpo.userId ?? '').trim();
  if (!userId) {
    return respostaErro('Informe o usuário.');
  }

  const senha = gerarSenha();

  const { data: atualizado, error: erroAtualizacao } = await admin.auth.admin.updateUserById(
    userId,
    { password: senha },
  );

  if (erroAtualizacao || !atualizado.user) {
    return respostaErro(erroAtualizacao?.message ?? 'Não foi possível redefinir a senha.', 400);
  }

  await admin
    .from('perfis')
    .update({ precisa_trocar_senha: true })
    .eq('user_id', userId)
    .eq('institution_id', institutionId);

  return respostaJson({ userId, email: atualizado.user.email ?? '', senha });
}

/**
 * Remove o vínculo do usuário com a escola do administrador.
 *
 * A conta de Auth só é apagada quando o usuário não pertence a nenhuma outra
 * escola. Assim a exclusão de um cadastro encerra o acesso àquela escola sem
 * derrubar vínculos legítimos em outras. Idempotente.
 */
async function excluirConta(
  admin: SupabaseClient,
  corpo: CorpoRequisicao,
  institutionId: string,
): Promise<Response> {
  const userId = (corpo.userId ?? '').trim();
  if (!userId) {
    return respostaErro('Informe o usuário.');
  }

  await admin
    .from('perfis')
    .delete()
    .eq('user_id', userId)
    .eq('institution_id', institutionId);

  const { count, error: erroContagem } = await admin
    .from('perfis')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (erroContagem) {
    return respostaErro('Não foi possível verificar os vínculos do usuário.', 500);
  }

  if ((count ?? 0) > 0) {
    return respostaJson({ userId, removido: true, contaMantida: true });
  }

  const { error: erroRemocao } = await admin.auth.admin.deleteUser(userId);

  if (erroRemocao && !ehUsuarioInexistente(erroRemocao.message)) {
    return respostaErro(erroRemocao.message, 400);
  }

  return respostaJson({ userId, removido: true });
}

/** Detecta a mensagem do GoTrue quando a conta não existe mais. */
function ehUsuarioInexistente(mensagem: string): boolean {
  return mensagem.toLowerCase().includes('not found');
}

Deno.serve(async (requisicao) => {
  if (requisicao.method === 'OPTIONS') {
    return new Response('ok', { headers: CABECALHOS_CORS });
  }
  if (requisicao.method !== 'POST') {
    return respostaErro('Método não permitido.', 405);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !anonKey || !serviceRoleKey) {
    return respostaErro('Configuração do servidor incompleta.', 500);
  }

  const administrador = await verificarAdministrador(
    url,
    anonKey,
    requisicao.headers.get('Authorization'),
  );

  if (!administrador) {
    return respostaErro('Ação permitida apenas para administradores.', 403);
  }

  let corpo: CorpoRequisicao;
  try {
    corpo = (await requisicao.json()) as CorpoRequisicao;
  } catch {
    return respostaErro('Corpo da requisição inválido.');
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  switch (corpo.acao) {
    case 'criar':
      return criarConta(admin, corpo, administrador.institutionId);
    case 'redefinir-senha':
      return redefinirSenha(admin, corpo, administrador.institutionId);
    case 'excluir-conta':
      return excluirConta(admin, corpo, administrador.institutionId);
    default:
      return respostaErro('Ação desconhecida.');
  }
});
