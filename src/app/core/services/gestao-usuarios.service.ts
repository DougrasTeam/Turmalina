import { Injectable, inject } from '@angular/core';

import { SupabaseService } from './supabase.service';
import { CredenciaisContaUsuario, NovaContaUsuario } from '../models/conta-usuario.model';
import { environment } from '../../../environments/environment';

const NOME_FUNCAO = 'admin-usuarios';

interface RespostaCredenciais {
  userId: string;
  email: string;
  senha: string;
}

interface RespostaErro {
  erro: string;
}

/**
 * Cria e gerencia contas de acesso (Supabase Auth) via Edge Function.
 *
 * A criação real de usuários exige a chave `service_role`, que só pode rodar no
 * servidor. Este serviço apenas chama a Edge Function `admin-usuarios`, que
 * valida que o chamador é administrador antes de agir.
 */
@Injectable({ providedIn: 'root' })
export class GestaoUsuariosService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Só é possível criar contas quando o app está operando com o Supabase real
   * (não no modo de demonstração/testes) e no navegador.
   */
  readonly disponivel = this.supabase.disponivel && environment.usarSupabaseDados;

  /** Cria uma conta de acesso e devolve as credenciais para exibir uma vez. */
  async criarConta(novaConta: NovaContaUsuario): Promise<CredenciaisContaUsuario> {
    const dados = await this.invocar<RespostaCredenciais>({
      acao: 'criar',
      email: novaConta.email,
      nome: novaConta.nome,
      papel: novaConta.papel,
      referencia: novaConta.referencia,
    });

    return { userId: dados.userId, email: dados.email, senha: dados.senha };
  }

  /** Cria a conta de um professor vinculada ao cadastro existente. */
  criarContaProfessor(
    professorId: string,
    email: string,
    nome: string,
  ): Promise<CredenciaisContaUsuario> {
    return this.criarConta({
      email,
      nome,
      papel: 'professor',
      referencia: { tabela: 'professores', id: professorId },
    });
  }

  /** Cria a conta de um aluno vinculada ao cadastro existente. */
  criarContaAluno(alunoId: string, email: string, nome: string): Promise<CredenciaisContaUsuario> {
    return this.criarConta({
      email,
      nome,
      papel: 'aluno',
      referencia: { tabela: 'alunos', id: alunoId },
    });
  }

  /** Gera uma nova senha provisória para a conta informada e devolve as credenciais. */
  async redefinirSenha(userId: string): Promise<CredenciaisContaUsuario> {
    const dados = await this.invocar<RespostaCredenciais>({
      acao: 'redefinir-senha',
      userId,
    });

    return { userId: dados.userId, email: dados.email, senha: dados.senha };
  }

  private async invocar<T>(corpo: Record<string, unknown>): Promise<T> {
    if (!this.supabase.disponivel) {
      throw new Error('A gestão de usuários só está disponível no navegador.');
    }

    const cliente = await this.supabase.obterCliente();
    const { data, error } = await cliente.functions.invoke<T & RespostaErro>(NOME_FUNCAO, {
      body: corpo,
    });

    if (error) {
      throw new Error(await this.mensagemDoErro(error));
    }

    if (!data) {
      throw new Error('A função de gestão de usuários não retornou dados.');
    }

    return data as T;
  }

  private async mensagemDoErro(erro: { message?: string; context?: unknown }): Promise<string> {
    const contexto = erro.context;

    if (contexto instanceof Response) {
      try {
        const corpo = (await contexto.json()) as RespostaErro;
        if (corpo?.erro) {
          return corpo.erro;
        }
      } catch {
        // Corpo não é JSON; usa a mensagem padrão abaixo.
      }
    }

    return erro.message ?? 'Não foi possível concluir a operação.';
  }
}
