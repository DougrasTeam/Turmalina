import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let instituicaoId: string | null = null;
  let usuarioId: string | null = null;

  try {
    const { planoId, escola, admin } = await req.json();

    if (!planoId || !escola?.nome || !admin?.nome || !admin?.email || !admin?.senha) {
      return new Response(JSON.stringify({ error: 'Dados inválidos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // O plano precisa existir e estar ativo.
    const { data: plano, error: erroPlano } = await supabaseAdmin
      .from('planos')
      .select('id')
      .eq('id', planoId)
      .eq('ativo', true)
      .maybeSingle();

    if (erroPlano || !plano) {
      return new Response(JSON.stringify({ error: 'Plano inválido ou inativo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1) Criar instituição
    instituicaoId = crypto.randomUUID();
    const { error: erroInstituicao } = await supabaseAdmin.from('instituicoes').insert({
      id: instituicaoId,
      institution_id: instituicaoId,
      nome: escola.nome.trim(),
      plano_id: planoId,
      status: 'ativa',
    });

    if (erroInstituicao) throw erroInstituicao;

    // 2) Criar usuário no Auth
    const email = admin.email.trim().toLowerCase();
    const { data: usuarioCriado, error: erroAuth } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: admin.senha,
      email_confirm: true,
      user_metadata: { nome: admin.nome.trim() },
    });

    if (erroAuth || !usuarioCriado.user) throw erroAuth;
    usuarioId = usuarioCriado.user.id;

    // 3) Criar perfil do administrador
    const { error: erroPerfil } = await supabaseAdmin.from('perfis').insert({
      user_id: usuarioId,
      institution_id: instituicaoId,
      papel: 'administrador',
      nome: admin.nome.trim(),
      ativo: true,
      precisa_trocar_senha: false,
    });

    if (erroPerfil) throw erroPerfil;

    // 4) Herdar funcionalidades do plano para a escola
    const { data: planoFuncoes } = await supabaseAdmin
      .from('planos_funcionalidades')
      .select('funcionalidade')
      .eq('plano_id', planoId);

    if (planoFuncoes && planoFuncoes.length > 0) {
      const registros = planoFuncoes.map((item) => ({
        id: crypto.randomUUID(),
        institution_id: instituicaoId,
        funcionalidade: item.funcionalidade,
        habilitado: true,
        origem: 'plano',
      }));
      const { error: erroFuncionalidades } = await supabaseAdmin
        .from('escola_funcionalidades')
        .insert(registros);
      if (erroFuncionalidades) throw erroFuncionalidades;
    }

    return new Response(JSON.stringify({ ok: true, instituicaoId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (erro) {
    console.error(erro);

    if (usuarioId) {
      await supabaseAdmin.auth.admin.deleteUser(usuarioId);
    }
    if (instituicaoId) {
      await supabaseAdmin.from('instituicoes').delete().eq('id', instituicaoId);
    }

    return new Response(JSON.stringify({ error: 'Erro ao contratar plano' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
