import type { Session, User } from '@supabase/supabase-js';

import { EMAIL_ADMIN_DEMO, EMAIL_ALUNO_DEMO, EMAIL_PROFESSOR_DEMO } from '../contas-demo';
import {
  mapearSessaoSupabase,
  mapearUsuarioSupabase,
  nomeDoUsuarioSupabase,
  papelDoUsuarioSupabase,
  usuarioSupabaseEstaAtivo,
} from './mapear-usuario-supabase';

function criarUsuario(parcial: Partial<User>): User {
  return {
    id: 'usuario-teste',
    email: EMAIL_ALUNO_DEMO,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    ...parcial,
  } as User;
}

describe('papelDoUsuarioSupabase', () => {
  it('usa o papel de app_metadata quando presente', () => {
    const usuario = criarUsuario({ app_metadata: { papel: 'professor' } });

    expect(papelDoUsuarioSupabase(usuario)).toBe('professor');
  });

  it('usa o papel de user_metadata quando app_metadata não define', () => {
    const usuario = criarUsuario({ user_metadata: { papel: 'administrador' } });

    expect(papelDoUsuarioSupabase(usuario)).toBe('administrador');
  });

  it('recorre ao e-mail da conta de demonstração quando o papel é inválido', () => {
    const usuario = criarUsuario({ email: EMAIL_ADMIN_DEMO, app_metadata: { papel: 'coordenador' } });

    expect(papelDoUsuarioSupabase(usuario)).toBe('administrador');
  });

  it('assume aluno (menor privilégio) para e-mail desconhecido sem metadados', () => {
    const usuario = criarUsuario({ email: 'visitante@exemplo.com' });

    expect(papelDoUsuarioSupabase(usuario)).toBe('aluno');
  });
});

describe('nomeDoUsuarioSupabase', () => {
  it('usa o nome de user_metadata quando presente', () => {
    const usuario = criarUsuario({ user_metadata: { nome: 'Maria Silva' } });

    expect(nomeDoUsuarioSupabase(usuario)).toBe('Maria Silva');
  });

  it('usa a parte local do e-mail quando o nome não está definido', () => {
    const usuario = criarUsuario({ email: EMAIL_PROFESSOR_DEMO });

    expect(nomeDoUsuarioSupabase(usuario)).toBe('professor');
  });

  it('usa um rótulo padrão quando não há nome nem e-mail', () => {
    const usuario = criarUsuario({ email: undefined });

    expect(nomeDoUsuarioSupabase(usuario)).toBe('Usuário');
  });
});

describe('usuarioSupabaseEstaAtivo', () => {
  it('está ativo quando não há banimento', () => {
    const usuario = criarUsuario({});

    expect(usuarioSupabaseEstaAtivo(usuario)).toBeTrue();
  });

  it('está inativo quando o banimento é futuro', () => {
    const usuario = criarUsuario({ banned_until: new Date(Date.now() + 60_000).toISOString() });

    expect(usuarioSupabaseEstaAtivo(usuario)).toBeFalse();
  });

  it('está ativo quando o banimento já passou', () => {
    const usuario = criarUsuario({ banned_until: new Date(Date.now() - 60_000).toISOString() });

    expect(usuarioSupabaseEstaAtivo(usuario)).toBeTrue();
  });
});

describe('mapearSessaoSupabase', () => {
  it('mapeia token, expiração e usuário', () => {
    const expiraEm = Math.floor(Date.now() / 1000) + 3600;
    const sessao = {
      access_token: 'token-abc',
      expires_at: expiraEm,
      user: criarUsuario({ user_metadata: { nome: 'João Souza' } }),
    } as Session;

    const resultado = mapearSessaoSupabase(sessao);

    expect(resultado.token).toBe('token-abc');
    expect(resultado.expiraEm).toBe(new Date(expiraEm * 1000).toISOString());
    expect(resultado.usuario.nome).toBe('João Souza');
  });

  it('usa uma hora de validade quando o provedor não informa a expiração', () => {
    const sessao = {
      access_token: 'token-sem-expiracao',
      expires_at: undefined,
      user: criarUsuario({}),
    } as unknown as Session;

    const resultado = mapearSessaoSupabase(sessao);
    const umaHoraAdiante = Date.now() + 60 * 60 * 1000;

    expect(Math.abs(new Date(resultado.expiraEm).getTime() - umaHoraAdiante)).toBeLessThan(5000);
  });
});

describe('mapearUsuarioSupabase', () => {
  it('mapeia id, nome, e-mail, papel e situação', () => {
    const usuario = criarUsuario({
      id: 'abc-123',
      email: EMAIL_PROFESSOR_DEMO,
      user_metadata: { nome: 'Bruno Professor' },
    });

    expect(mapearUsuarioSupabase(usuario)).toEqual({
      id: 'abc-123',
      nome: 'Bruno Professor',
      email: EMAIL_PROFESSOR_DEMO,
      papel: 'professor',
      ativo: true,
      precisaTrocarSenha: false,
    });
  });
});
