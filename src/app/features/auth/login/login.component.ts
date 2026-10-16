import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
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
  private readonly router = inject(Router);

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
      const destino = usuario.precisaTrocarSenha
        ? '/primeiro-acesso'
        : rotaInicialPorPapel(usuario.papel);
      await this.router.navigateByUrl(destino);
    } catch (erro) {
      const mensagem =
        erro instanceof AutenticacaoErro ? erro.message : 'Não foi possível entrar. Tente novamente.';
      this.mensagemErro.set(mensagem);
    } finally {
      this.enviando.set(false);
    }
  }
}
