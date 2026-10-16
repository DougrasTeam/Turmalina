import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { ComunicadosService } from '../../../core/services/comunicados.service';
import { ToastService } from '../../../core/services/toast.service';
import { Aluno } from '../../../core/models';
import {
  CONTEUDO_COMUNICADO_MAX,
  DadosComunicado,
  TIPOS_COMUNICADO,
  TITULO_COMUNICADO_MAX,
  TipoComunicado,
  validarComunicado,
} from '../../../core/models/comunicado.model';

interface ComunicadoFormData {
  tipo: TipoComunicado;
  titulo: string;
  conteudo: string;
}

@Component({
  selector: 'app-comunicado-form',
  imports: [ModalComponent],
  templateUrl: './comunicado-form.component.html',
  styleUrl: './comunicado-form.component.scss',
})
export class ComunicadoFormComponent {
  readonly open = input(false);
  readonly aluno = input<Aluno | null>(null);

  readonly salvo = output<void>();
  readonly fechado = output<void>();

  private readonly comunicados = inject(ComunicadosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly tipos = TIPOS_COMUNICADO;
  protected readonly tituloMax = TITULO_COMUNICADO_MAX;
  protected readonly conteudoMax = CONTEUDO_COMUNICADO_MAX;

  protected readonly form = linkedSignal<ComunicadoFormData>(() => {
    this.open();
    return { tipo: 'recado' as TipoComunicado, titulo: '', conteudo: '' };
  });

  protected readonly tipoAtual = computed(
    () => this.tipos.find((opcao) => opcao.value === this.form().tipo) ?? this.tipos[0],
  );

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected patch<K extends keyof ComunicadoFormData>(
    campo: K,
    valorCampo: ComunicadoFormData[K],
  ): void {
    this.form.update((atual) => ({ ...atual, [campo]: valorCampo }));
  }

  protected setTipo(evento: Event): void {
    this.patch('tipo', this.valor(evento) as TipoComunicado);
  }

  protected fechar(): void {
    this.fechado.emit();
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    const aluno = this.aluno();
    const dados: DadosComunicado = {
      tipo: this.form().tipo,
      alunoId: aluno?.id ?? '',
      titulo: this.form().titulo,
      conteudo: this.form().conteudo,
    };

    const erros = validarComunicado(dados);
    if (erros.length) {
      this.toast.mostrar(erros[0], 'warning');
      return;
    }

    const autor = this.auth.usuario();
    if (!autor) {
      this.toast.mostrar('Sessão expirada. Entre novamente.', 'danger');
      return;
    }

    await this.comunicados.criar(dados, autor);
    const mensagem =
      dados.tipo === 'recado' ? 'Recado enviado com sucesso!' : 'Observação registrada!';
    this.toast.mostrar(mensagem);
    this.salvo.emit();
  }
}
