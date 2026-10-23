import { Usuario } from '../../models/usuario.model';
import { aplicarPerfilSupabase, LinhaPerfil, mapearPerfilSupabase } from './mapear-perfil-supabase';

const LINHA_PERFIL: LinhaPerfil = {
  user_id: 'user-1',
  institution_id: 'instituicao-padrao',
  papel: 'professor',
  nome: 'Bruno Professor',
  ativo: true,
  precisa_trocar_senha: true,
};

describe('mapearPerfilSupabase', () => {
  it('converte a linha de perfis no modelo de domínio', () => {
    expect(mapearPerfilSupabase(LINHA_PERFIL)).toEqual({
      userId: 'user-1',
      institutionId: 'instituicao-padrao',
      papel: 'professor',
      nome: 'Bruno Professor',
      ativo: true,
      precisaTrocarSenha: true,
    });
  });

  it('trata nome nulo como string vazia', () => {
    const perfil = mapearPerfilSupabase({ ...LINHA_PERFIL, nome: null });

    expect(perfil?.nome).toBe('');
  });

  it('recorre ao papel de menor privilégio quando o valor é desconhecido', () => {
    const perfil = mapearPerfilSupabase({ ...LINHA_PERFIL, papel: 'diretor' });

    expect(perfil?.papel).toBe('aluno');
  });

  it('retorna null quando não há linha', () => {
    expect(mapearPerfilSupabase(null)).toBeNull();
  });
});

describe('aplicarPerfilSupabase', () => {
  const usuario: Usuario = {
    id: 'user-1',
    nome: 'Nome dos Metadados',
    email: 'bruno@turmalina.com',
    papel: 'aluno',
    ativo: false,
    institutionId: 'instituicao-padrao',
    precisaTrocarSenha: false,
  };

  it('sobrepõe papel, nome, situação e flag com os dados do perfil', () => {
    const resultado = aplicarPerfilSupabase(usuario, {
      userId: 'user-1',
      institutionId: 'instituicao-padrao',
      papel: 'professor',
      nome: 'Bruno Professor',
      ativo: true,
      precisaTrocarSenha: true,
    });

    expect(resultado).toEqual({
      id: 'user-1',
      nome: 'Bruno Professor',
      email: 'bruno@turmalina.com',
      papel: 'professor',
      ativo: true,
      institutionId: 'instituicao-padrao',
      precisaTrocarSenha: true,
    });
  });

  it('mantém o nome original quando o perfil não informa nome', () => {
    const resultado = aplicarPerfilSupabase(usuario, {
      userId: 'user-1',
      institutionId: 'instituicao-padrao',
      papel: 'professor',
      nome: '   ',
      ativo: true,
      precisaTrocarSenha: false,
    });

    expect(resultado.nome).toBe('Nome dos Metadados');
  });

  it('mantém o usuário quando não há perfil', () => {
    expect(aplicarPerfilSupabase(usuario, null)).toBe(usuario);
  });
});
