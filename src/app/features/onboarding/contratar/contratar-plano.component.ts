import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { formatarPrecoMensal } from '../../../core/models/plano.model';
import { ContratacaoService } from '../../../core/services/contratacao.service';
import { PlanosService } from '../../../core/services/planos.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-contratar-plano',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './contratar-plano.component.html',
  styleUrl: './contratar-plano.component.scss',
})
export class ContratarPlanoComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly contratacao = inject(ContratacaoService);
  private readonly planosService = inject(PlanosService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);
  protected readonly carregandoPlanos = signal(true);
  protected readonly etapa = signal<1 | 2>(1);
  protected readonly planoSelecionadoId = signal<string | null>(null);

  protected readonly planos = computed(() =>
    this.planosService.planos().filter((plano) => plano.ativo),
  );

  protected readonly planoSelecionado = computed(() =>
    this.planos().find((plano) => plano.id === this.planoSelecionadoId()) ?? null,
  );

  protected readonly formatarPreco = formatarPrecoMensal;

  protected readonly formulario = this.formBuilder.nonNullable.group({
    nomeEscola: ['', [Validators.required, Validators.minLength(3)]],
    nomeAdmin: ['', [Validators.required, Validators.minLength(3)]],
    emailAdmin: ['', [Validators.required, Validators.email]],
    senhaAdmin: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    void this.carregarPlanos();
  }

  protected selecionarPlano(planoId: string): void {
    this.planoSelecionadoId.set(planoId);
    this.etapa.set(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected voltar(): void {
    this.etapa.set(1);
  }

  protected async contratar(): Promise<void> {
    const plano = this.planoSelecionado();
    if (this.formulario.invalid || !plano) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    try {
      const valores = this.formulario.getRawValue();
      await this.contratacao.contratar({
        planoId: plano.id,
        escola: { nome: valores.nomeEscola },
        admin: {
          nome: valores.nomeAdmin,
          email: valores.emailAdmin,
          senha: valores.senhaAdmin,
        },
      });

      this.toast.mostrar(
        'Escola criada com sucesso! Faça login com o e-mail e senha do administrador.',
        'success',
      );
      await this.router.navigateByUrl('/login');
    } catch (erro) {
      console.error(erro);
      this.toast.mostrar('Não foi possível concluir a contratação. Tente novamente.', 'danger');
    } finally {
      this.enviando.set(false);
    }
  }

  private async carregarPlanos(): Promise<void> {
    try {
      await this.planosService.load();
    } catch (erro) {
      console.error(erro);
      this.toast.mostrar('Não foi possível carregar os planos disponíveis.', 'danger');
    } finally {
      this.carregandoPlanos.set(false);
    }
  }
}
