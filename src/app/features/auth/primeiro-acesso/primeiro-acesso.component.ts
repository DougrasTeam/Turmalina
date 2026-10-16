import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { AutenticacaoErro } from '../../../core/models/autenticacao-erro';
import { rotaInicialPorPapel } from '../../../core/auth/rota-inicial';

const TAMANHO_MINIMO_SENHA = 8;

/**
 * Primeiro acesso: usuários criados pelo painel administrativo recebem uma
 * senha provisória e precisam definir uma nova senha pessoal antes de usar o
 * sistema. Até concluir, o guard de primeiro acesso mantém o usuário aqui.
 */
@Component({
  selector: 'app-primeiro-acesso',
  imports: [ReactiveFormsModule],
  templateUrl: './primeiro-acesso.component.html',
  styleUrl: './primeiro-acesso.component.scss',
})
export class PrimeiroAcessoComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly usuario = this.auth.usuario;
  protected readonly enviando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);

  protected readonly formulario = this.formBuilder.nonNullable.group({
    novaSenha: ['', [Validators.required, Validators.minLength(TAMANHO_MINIMO_SENHA)]],
    confirmarSenha: ['', [Validators.required]],
  });

  protected novaSenhaInvalida(): boolean {
    const controle = this.formulario.controls.novaSenha;
    return controle.touched && controle.invalid;
  }

  protected confirmacaoInvalida(): boolean {
    const controle = this.formulario.controls.confirmarSenha;
    return controle.touched && controle.invalid;
  }

  protected async concluir(): Promise<void> {
    this.mensagemErro.set(null);

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { novaSenha, confirmarSenha } = this.formulario.getRawValue();
    if (novaSenha !== confirmarSenha) {
      this.mensagemErro.set('As senhas não coincidem.');
      return;
    }

    this.enviando.set(true);
    try {
      await this.auth.alterarSenhaPrimeiroAcesso(novaSenha);
      const papel = this.auth.papel();
      await this.router.navigateByUrl(papel ? rotaInicialPorPapel(papel) : '/login');
    } catch (erro) {
      const mensagem =
        erro instanceof AutenticacaoErro
          ? erro.message
          : 'Não foi possível salvar a nova senha. Tente novamente.';
      this.mensagemErro.set(mensagem);
    } finally {
      this.enviando.set(false);
    }
  }
}
