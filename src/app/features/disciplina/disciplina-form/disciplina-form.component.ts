import { Component, inject, input, linkedSignal, output } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { DisciplinasService } from '../../../core/services/disciplinas.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  CORES_DISCIPLINA,
  DadosDisciplina,
  Disciplina,
  gerarCodigoDisciplina,
} from '../../../core/models/disciplina.model';

@Component({
  selector: 'app-disciplina-form',
  imports: [ModalComponent],
  templateUrl: './disciplina-form.component.html',
  styleUrl: './disciplina-form.component.scss',
})
export class DisciplinaFormComponent {
  readonly open = input(false);
  readonly disciplina = input<Disciplina | null>(null);

  readonly salvo = output<void>();
  readonly fechado = output<void>();

  private readonly disciplinas = inject(DisciplinasService);
  private readonly toast = inject(ToastService);

  protected readonly cores = CORES_DISCIPLINA;
  protected readonly form = linkedSignal<DadosDisciplina>(() => {
    this.open();
    return this.paraForm(this.disciplina());
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected marcado(evento: Event): boolean {
    return (evento.target as HTMLInputElement).checked;
  }

  protected patch<K extends keyof DadosDisciplina>(campo: K, valorCampo: DadosDisciplina[K]): void {
    this.form.update((atual) => ({ ...atual, [campo]: valorCampo }));
  }

  protected sugerirCodigo(): void {
    if (this.form().codigo.trim()) return;
    this.patch('codigo', gerarCodigoDisciplina(this.form().nome, this.disciplinas.codigosExistentes()));
  }

  protected selecionarCor(cor: string): void {
    this.patch('cor', cor);
  }

  protected fechar(): void {
    this.fechado.emit();
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    const atual = this.disciplina();
    try {
      if (atual) {
        await this.disciplinas.atualizar(atual.id, this.form());
        this.toast.mostrar('Disciplina atualizada com sucesso!');
      } else {
        await this.disciplinas.criar(this.form());
        this.toast.mostrar('Disciplina cadastrada com sucesso!');
      }
      this.salvo.emit();
    } catch (erro) {
      this.toast.mostrar(this.mensagemErro(erro), 'warning');
    }
  }

  private mensagemErro(erro: unknown): string {
    return erro instanceof Error ? erro.message : 'Não foi possível salvar a disciplina.';
  }

  private paraForm(disciplina: Disciplina | null): DadosDisciplina {
    if (disciplina) {
      return {
        nome: disciplina.nome,
        codigo: disciplina.codigo,
        cargaHoraria: disciplina.cargaHoraria,
        cor: disciplina.cor,
        ativa: disciplina.ativa,
      };
    }
    return {
      nome: '',
      codigo: '',
      cargaHoraria: 80,
      cor: CORES_DISCIPLINA[0],
      ativa: true,
    };
  }
}
