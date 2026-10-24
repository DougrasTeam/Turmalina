import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { CredenciaisAcessoComponent } from '../../../shared/credenciais-acesso/credenciais-acesso.component';
import { AlunosService } from '../../../core/services/alunos.service';
import { GestaoUsuariosService } from '../../../core/services/gestao-usuarios.service';
import { MatriculasService } from '../../../core/services/matriculas.service';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';
import { ToastService } from '../../../core/services/toast.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { Aluno, CredenciaisContaUsuario } from '../../../core/models';

interface AlunoFormData {
  nome: string;
  email: string;
  matricula: string;
  turmaId: string;
  dataNascimento: string;
  responsavel: string;
  telefoneResponsavel: string;
  ativo: boolean;
}

@Component({
  selector: 'app-aluno-form',
  imports: [ModalComponent, CredenciaisAcessoComponent],
  templateUrl: './aluno-form.component.html',
  styleUrl: './aluno-form.component.scss',
})
export class AlunoFormComponent {
  readonly open = input(false);
  readonly aluno = input<Aluno | null>(null);
  readonly turmaIdPadrao = input('');

  readonly salvo = output<void>();
  readonly fechado = output<void>();

  protected readonly turmas = inject(TurmasService);
  private readonly alunos = inject(AlunosService);
  private readonly matriculas = inject(MatriculasService);
  private readonly periodos = inject(PeriodosLetivosService);
  private readonly toast = inject(ToastService);
  private readonly gestao = inject(GestaoUsuariosService);

  protected readonly credenciais = signal<CredenciaisContaUsuario | null>(null);
  protected readonly regenerando = signal(false);

  protected readonly form = linkedSignal<AlunoFormData>(() => {
    this.open();
    return this.paraForm(this.aluno());
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected marcado(evento: Event): boolean {
    return (evento.target as HTMLInputElement).checked;
  }

  protected patch<K extends keyof AlunoFormData>(campo: K, valorCampo: AlunoFormData[K]): void {
    this.form.update((atual) => ({ ...atual, [campo]: valorCampo }));
  }

  protected fechar(): void {
    this.fechado.emit();
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    const dados = this.form();
    if (!dados.nome.trim()) {
      this.toast.mostrar('Informe o nome do aluno.', 'warning');
      return;
    }

    const atual = this.aluno();
    if (atual) {
      await this.alunos.update(atual.id, dados);
      if (dados.turmaId && dados.turmaId !== atual.turmaId) {
        try {
          await this.matriculas.transferir(atual.id, dados.turmaId);
        } catch {
          // Histórico mantido; se matrícula falhar, apenas registra toast abaixo
        }
      }
      this.toast.mostrar('Aluno atualizado com sucesso!');
      this.salvo.emit();
      return;
    }

    const aluno = await this.alunos.create(dados);
    if (dados.turmaId) {
      try {
        await this.matriculas.matricular(aluno.id, dados.turmaId, this.periodos.ativo()?.id);
      } catch {
        // Ignora erro de matrícula na criação para não bloquear cadastro
      }
    }
    this.toast.mostrar('Aluno cadastrado com sucesso!');
    this.salvo.emit();
    await this.provisionarAcesso(aluno, dados);
  }

  protected async gerarNovaSenha(): Promise<void> {
    const atual = this.credenciais();
    if (!atual) return;

    this.regenerando.set(true);
    try {
      const credenciais = await this.gestao.redefinirSenha(atual.userId);
      this.credenciais.set(credenciais);
      this.toast.mostrar('Nova senha gerada.', 'info');
    } catch (erro) {
      this.toast.mostrar(mensagemDeErro(erro, 'Não foi possível gerar uma nova senha.'), 'danger');
    } finally {
      this.regenerando.set(false);
    }
  }

  protected fecharCredenciais(): void {
    this.credenciais.set(null);
  }

  private async provisionarAcesso(aluno: Aluno, dados: AlunoFormData): Promise<void> {
    const email = dados.email.trim();
    if (!this.gestao.disponivel) return;

    if (!email) {
      this.toast.mostrar('Aluno sem e-mail: a conta de acesso não foi criada.', 'warning');
      return;
    }

    try {
      const credenciais = await this.gestao.criarContaAluno(aluno.id, email, dados.nome);
      if ('contaExistente' in credenciais) {
        this.toast.mostrar(
          'Conta existente vinculada a esta escola. O aluno deverá usar a senha que já possui.',
          'info',
        );
        return;
      }

      this.credenciais.set(credenciais);
    } catch (erro) {
      this.toast.mostrar(
        mensagemDeErro(erro, 'Aluno cadastrado, mas a conta de acesso não foi criada.'),
        'warning',
      );
    }
  }

  private paraForm(aluno: Aluno | null): AlunoFormData {
    if (aluno) {
      return {
        nome: aluno.nome,
        email: aluno.email,
        matricula: aluno.matricula,
        turmaId: aluno.turmaId,
        dataNascimento: aluno.dataNascimento,
        responsavel: aluno.responsavel,
        telefoneResponsavel: aluno.telefoneResponsavel,
        ativo: aluno.ativo,
      };
    }
    return {
      nome: '',
      email: '',
      matricula: '',
      turmaId: this.turmaIdPadrao(),
      dataNascimento: '',
      responsavel: '',
      telefoneResponsavel: '',
      ativo: true,
    };
  }
}

function mensagemDeErro(erro: unknown, padrao: string): string {
  return erro instanceof Error && erro.message ? erro.message : padrao;
}
