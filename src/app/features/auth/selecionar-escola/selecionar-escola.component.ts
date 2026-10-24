import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { rotaInicialPorPapel } from '../../../core/auth/rota-inicial';
import { AcessoEscola } from '../../../core/models/acesso-escola.model';
import { AutenticacaoErro } from '../../../core/models/autenticacao-erro';
import { rotuloPapel } from '../../../core/models/papel.model';
import { AuthService } from '../../../core/services/auth.service';
import { ContextoEscolaService } from '../../../core/services/contexto-escola.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Escolha da escola após o login quando a conta possui mais de um vínculo.
 *
 * A escola selecionada é gravada no servidor (`instituicoes_ativas`) e passa a
 * definir o tenant usado pelo RLS.
 */
@Component({
  selector: 'app-selecionar-escola',
  templateUrl: './selecionar-escola.component.html',
  styleUrl: './selecionar-escola.component.scss',
})
export class SelecionarEscolaComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly contexto = inject(ContextoEscolaService);
  private readonly toast = inject(ToastService);

  protected readonly selecionandoId = signal<string | null>(null);

  protected readonly escolas = computed(() => this.auth.instituicoes());

  protected rotuloDoPapel(acesso: AcessoEscola): string {
    return rotuloPapel(acesso.papel);
  }

  protected podeSelecionar(acesso: AcessoEscola): boolean {
    return acesso.status === 'ativa' && this.selecionandoId() === null;
  }

  protected async selecionar(acesso: AcessoEscola): Promise<void> {
    if (!this.podeSelecionar(acesso)) return;

    this.selecionandoId.set(acesso.institutionId);
    try {
      await this.auth.selecionarEscola(acesso.institutionId);
      this.contexto.limpar();

      const papel = this.auth.papel() ?? acesso.papel;
      const destino = this.auth.precisaTrocarSenha()
        ? '/primeiro-acesso'
        : rotaInicialPorPapel(papel);
      await this.router.navigateByUrl(destino);
    } catch (erro) {
      const mensagem =
        erro instanceof AutenticacaoErro
          ? erro.message
          : 'Não foi possível selecionar a escola. Tente novamente.';
      this.toast.mostrar(mensagem, 'danger');
    } finally {
      this.selecionandoId.set(null);
    }
  }

  protected async sair(): Promise<void> {
    await this.auth.sair();
    this.contexto.limpar();
    await this.router.navigateByUrl('/login');
  }
}
