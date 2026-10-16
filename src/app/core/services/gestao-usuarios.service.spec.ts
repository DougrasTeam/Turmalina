import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { GestaoUsuariosService } from './gestao-usuarios.service';
import { SupabaseService } from './supabase.service';

function criarSupabaseStub(invoke: jasmine.Spy): Partial<SupabaseService> {
  return {
    disponivel: true,
    obterCliente: () => Promise.resolve({ functions: { invoke } } as never),
  };
}

function configurar(invoke: jasmine.Spy): GestaoUsuariosService {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      GestaoUsuariosService,
      { provide: SupabaseService, useValue: criarSupabaseStub(invoke) },
    ],
  });
  return TestBed.inject(GestaoUsuariosService);
}

describe('GestaoUsuariosService', () => {
  it('cria a conta do professor com o vínculo correto', async () => {
    const invoke = jasmine
      .createSpy('invoke')
      .and.resolveTo({ data: { userId: 'u1', email: 'p@x.com', senha: 'abc123' }, error: null });
    const servico = configurar(invoke);

    const credenciais = await servico.criarContaProfessor('prof-1', 'p@x.com', 'Professor X');

    expect(invoke).toHaveBeenCalledWith('admin-usuarios', {
      body: {
        acao: 'criar',
        email: 'p@x.com',
        nome: 'Professor X',
        papel: 'professor',
        referencia: { tabela: 'professores', id: 'prof-1' },
      },
    });
    expect(credenciais).toEqual({ userId: 'u1', email: 'p@x.com', senha: 'abc123' });
  });

  it('cria a conta do aluno com o vínculo correto', async () => {
    const invoke = jasmine
      .createSpy('invoke')
      .and.resolveTo({ data: { userId: 'u2', email: 'a@x.com', senha: 'xyz789' }, error: null });
    const servico = configurar(invoke);

    await servico.criarContaAluno('aluno-1', 'a@x.com', 'Aluno Y');

    expect(invoke).toHaveBeenCalledWith('admin-usuarios', {
      body: {
        acao: 'criar',
        email: 'a@x.com',
        nome: 'Aluno Y',
        papel: 'aluno',
        referencia: { tabela: 'alunos', id: 'aluno-1' },
      },
    });
  });

  it('redefine a senha e devolve as credenciais atualizadas', async () => {
    const invoke = jasmine.createSpy('invoke').and.resolveTo({
      data: { userId: 'u1', email: 'p@x.com', senha: 'nova-senha' },
      error: null,
    });
    const servico = configurar(invoke);

    const credenciais = await servico.redefinirSenha('u1');

    expect(invoke).toHaveBeenCalledWith('admin-usuarios', {
      body: { acao: 'redefinir-senha', userId: 'u1' },
    });
    expect(credenciais).toEqual({ userId: 'u1', email: 'p@x.com', senha: 'nova-senha' });
  });

  it('propaga a mensagem de erro retornada pela função', async () => {
    const contexto = new Response(
      JSON.stringify({ erro: 'Ação permitida apenas para administradores.' }),
      {
        status: 403,
      },
    );
    const invoke = jasmine
      .createSpy('invoke')
      .and.resolveTo({ data: null, error: { message: 'Edge Function error', context: contexto } });
    const servico = configurar(invoke);

    await expectAsync(servico.redefinirSenha('u1')).toBeRejectedWithError(
      'Ação permitida apenas para administradores.',
    );
  });

  it('exige que o Supabase esteja disponível', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        GestaoUsuariosService,
        {
          provide: SupabaseService,
          useValue: { disponivel: false, obterCliente: () => Promise.reject(new Error('x')) },
        },
      ],
    });
    const servico = TestBed.inject(GestaoUsuariosService);

    await expectAsync(
      servico.criarConta({ email: 'a@x.com', nome: 'A', papel: 'aluno' }),
    ).toBeRejected();
  });
});
