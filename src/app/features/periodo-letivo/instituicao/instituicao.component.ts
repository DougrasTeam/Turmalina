import { Component, inject, linkedSignal } from '@angular/core';

import { ToastService } from '../../../core/services/toast.service';
import {
  FUSO_PADRAO,
  FUSOS_SUGERIDOS,
  STATUS_INSTITUICAO,
  StatusInstituicao,
} from '../../../core/models/instituicao.model';
import { InstituicaoService } from '../../../core/services/instituicao.service';

interface InstituicaoFormData {
  nome: string;
  fusoHorario: string;
  status: StatusInstituicao;
}

function mensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : 'NÃ£o foi possÃ­vel salvar.';
}

@Component({
  selector: 'app-instituicao',
  templateUrl: './instituicao.component.html',
  styleUrl: './instituicao.component.scss',
})
export class InstituicaoComponent {
  protected readonly instituicao = inject(InstituicaoService);
  private readonly toast = inject(ToastService);

  protected readonly statusOpcoes = STATUS_INSTITUICAO;
  protected readonly fusos = FUSOS_SUGERIDOS;

  protected readonly form = linkedSignal<InstituicaoFormData>(() => {
    const atual = this.instituicao.instituicao();
    return atual
      ? { nome: atual.nome, fusoHorario: atual.fusoHorario, status: atual.status }
      : { nome: '', fusoHorario: FUSO_PADRAO, status: 'ativa' };
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected patch(campo: 'nome' | 'fusoHorario', texto: string): void {
    this.form.update((atual) => ({ ...atual, [campo]: texto }));
  }

  protected setStatus(evento: Event): void {
    this.form.update((atual) => ({ ...atual, status: this.valor(evento) as StatusInstituicao }));
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    try {
      await this.instituicao.salvar(this.form());
      this.toast.mostrar('Dados da instituiÃ§Ã£o salvos com sucesso!');
    } catch (erro) {
      this.toast.mostrar(mensagemErro(erro), 'warning');
    }
  }
}
