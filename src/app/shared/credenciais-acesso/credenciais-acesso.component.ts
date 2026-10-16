import { Component, input, output, signal } from '@angular/core';

import { ModalComponent } from '../modal/modal.component';
import { CredenciaisContaUsuario } from '../../core/models/conta-usuario.model';

type CampoCredencial = 'email' | 'senha';

/**
 * Exibe as credenciais de acesso geradas pelo sistema (e-mail e senha
 * provisória) para o administrador repassar ao usuário. Todo o estado pertence
 * ao componente pai; este componente é apenas de apresentação.
 */
@Component({
  selector: 'app-credenciais-acesso',
  imports: [ModalComponent],
  templateUrl: './credenciais-acesso.component.html',
  styleUrl: './credenciais-acesso.component.scss',
})
export class CredenciaisAcessoComponent {
  readonly open = input(false);
  readonly titulo = input('Conta de acesso');
  readonly credenciais = input<CredenciaisContaUsuario | null>(null);
  readonly regenerando = input(false);

  readonly fechado = output<void>();
  readonly gerarNovaSenha = output<void>();

  protected readonly campoCopiado = signal<CampoCredencial | null>(null);

  protected async copiar(campo: CampoCredencial, valor: string): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(valor);
    this.campoCopiado.set(campo);
    setTimeout(() => this.campoCopiado.set(null), 2000);
  }

  protected emitirGerarNovaSenha(): void {
    this.gerarNovaSenha.emit();
  }

  protected emitirFechado(): void {
    this.fechado.emit();
  }
}
