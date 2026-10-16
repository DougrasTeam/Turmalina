import { Component, inject, input, linkedSignal, output } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { PublicacoesService } from '../../../core/services/publicacoes.service';
import { ToastService } from '../../../core/services/toast.service';
import { Turma } from '../../../core/models';
import {
  CONTEUDO_PUBLICACAO_MAX,
  DadosPublicacao,
  Publicacao,
  TITULO_PUBLICACAO_MAX,
  validarPublicacao,
} from '../../../core/models/publicacao.model';

interface PublicacaoFormData {
  titulo: string;
  conteudo: string;
  turmaId: string;
  expiraEm: string;
}

@Component({
  selector: 'app-publicacao-form',
  imports: [ModalComponent],
  templateUrl: './publicacao-form.component.html',
  styleUrl: './publicacao-form.component.scss',
})
export class PublicacaoFormComponent {
  readonly open = input(false);
  readonly publicacao = input<Publicacao | null>(null);
  readonly turmas = input<readonly Turma[]>([]);

  readonly salvo = output<void>();
  readonly fechado = output<void>();

  private readonly publicacoes = inject(PublicacoesService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly tituloMax = TITULO_PUBLICACAO_MAX;
  protected readonly conteudoMax = CONTEUDO_PUBLICACAO_MAX;

  protected readonly form = linkedSignal<PublicacaoFormData>(() => {
    this.open();
    return this.paraForm(this.publicacao());
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected patch<K extends keyof PublicacaoFormData>(
    campo: K,
    valorCampo: PublicacaoFormData[K],
  ): void {
    this.form.update((atual) => ({ ...atual, [campo]: valorCampo }));
  }

  protected fechar(): void {
    this.fechado.emit();
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    const dados = this.paraDados(this.form());
    const erros = validarPublicacao(dados);
    if (erros.length) {
      this.toast.mostrar(erros[0], 'warning');
      return;
    }

    const autor = this.auth.usuario();
    if (!autor) {
      this.toast.mostrar('Sessão expirada. Entre novamente.', 'danger');
      return;
    }

    const atual = this.publicacao();
    if (atual) {
      await this.publicacoes.atualizar(atual.id, dados);
      this.toast.mostrar('Publicação atualizada com sucesso!');
    } else {
      await this.publicacoes.criar(dados, autor);
      this.toast.mostrar('Publicação criada com sucesso!');
    }
    this.salvo.emit();
  }

  private paraDados(form: PublicacaoFormData): DadosPublicacao {
    return {
      titulo: form.titulo,
      conteudo: form.conteudo,
      turmaId: form.turmaId || null,
      publicadaEm: this.publicacao()?.publicadaEm ?? new Date().toISOString(),
      expiraEm: form.expiraEm || null,
    };
  }

  private paraForm(publicacao: Publicacao | null): PublicacaoFormData {
    if (publicacao) {
      return {
        titulo: publicacao.titulo,
        conteudo: publicacao.conteudo,
        turmaId: publicacao.turmaId ?? '',
        expiraEm: publicacao.expiraEm ?? '',
      };
    }
    return { titulo: '', conteudo: '', turmaId: '', expiraEm: '' };
  }
}
