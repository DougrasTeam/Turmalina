import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ContextoEscolaService } from '../../../core/services/contexto-escola.service';
import { AutenticacaoErro } from '../../../core/models/autenticacao-erro';
import { rotaInicialPorPapel } from '../../../core/auth/rota-inicial';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly contexto = inject(ContextoEscolaService);
  private readonly router = inject(Router);

  protected readonly escolaContexto = this.contexto.escola;

  protected readonly formulario = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]],
  });

  protected readonly enviando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);

  protected emailInvalido(): boolean {
    const controle = this.formulario.controls.email;
    return controle.touched && controle.invalid;
  }

  protected senhaInvalida(): boolean {
    const controle = this.formulario.controls.senha;
    return controle.touched && controle.invalid;
  }

  protected async entrar(): Promise<void> {
    this.mensagemErro.set(null);

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    try {
      const { email, senha } = this.formulario.getRawValue();
      const usuario = await this.auth.entrar({ email, senha });
      await this.aplicarEscolaDoContexto();
      this.contexto.limpar();

      if (this.auth.precisaTrocarSenha()) {
        await this.router.navigateByUrl('/primeiro-acesso');
        return;
      }

      if (this.auth.precisaSelecionarEscola()) {
        await this.router.navigateByUrl('/selecionar-escola');
        return;
      }

      await this.router.navigateByUrl(rotaInicialPorPapel(this.auth.papel() ?? usuario.papel));
    } catch (erro) {
      const mensagem =
        erro instanceof AutenticacaoErro ? erro.message : 'Não foi possível entrar. Tente novamente.';
      this.mensagemErro.set(mensagem);
    } finally {
      this.enviando.set(false);
    }
  }

  /**
   * Quando o login veio de um link `/e/:slug`, entra direto na escola se o
   * usuário tiver vínculo ativo com ela. Caso contrário, segue o fluxo normal
   * (escolha de escola ou rota inicial).
   */
  private async aplicarEscolaDoContexto(): Promise<void> {
    const escola = this.contexto.escola();
    if (!escola || this.auth.papel() === 'super_admin') return;

    const acesso = this.auth
      .instituicoes()
      .find((vinculo) => vinculo.institutionId === escola.institutionId && vinculo.status === 'ativa');

    if (!acesso || this.auth.escolaAtual()?.institutionId === escola.institutionId) {
      return;
    }

    try {
      await this.auth.selecionarEscola(escola.institutionId);
    } catch {
      // Sem acesso à escola do link: mantém o fluxo padrão de escolha.
    }
  }
}
