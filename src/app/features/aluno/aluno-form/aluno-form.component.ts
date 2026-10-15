import { Component, inject, input, linkedSignal, output } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { AlunosService } from '../../../core/services/alunos.service';
import { ToastService } from '../../../core/services/toast.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { Aluno } from '../../../core/models';

interface AlunoFormData {
  nome: string;
  email: string;
  matricula: string;
  turmaId: string;
  dataNascimento: string;
  responsavel: string;
  telefoneResponsavel: string;
  ativo: boolean;
}

@Component({
  selector: 'app-aluno-form',
  imports: [ModalComponent],
  templateUrl: './aluno-form.component.html',
  styleUrl: './aluno-form.component.scss',
})
export class AlunoFormComponent {
  readonly open = input(false);
  readonly aluno = input<Aluno | null>(null);
  readonly turmaIdPadrao = input('');

  readonly salvo = output<void>();
  readonly fechado = output<void>();

  protected readonly turmas = inject(TurmasService);
  private readonly alunos = inject(AlunosService);
  private readonly toast = inject(ToastService);

  protected readonly form = linkedSignal<AlunoFormData>(() => {
    this.open();
    return this.paraForm(this.aluno());
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected marcado(evento: Event): boolean {
    return (evento.target as HTMLInputElement).checked;
  }

  protected patch<K extends keyof AlunoFormData>(campo: K, valorCampo: AlunoFormData[K]): void {
    this.form.update((atual) => ({ ...atual, [campo]: valorCampo }));
  }

  protected fechar(): void {
    this.fechado.emit();
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    const dados = this.form();
    if (!dados.nome.trim()) {
      this.toast.mostrar('Informe o nome do aluno.', 'warning');
      return;
    }

    const atual = this.aluno();
    if (atual) {
      await this.alunos.update(atual.id, dados);
      this.toast.mostrar('Aluno atualizado com sucesso!');
    } else {
      await this.alunos.create(dados);
      this.toast.mostrar('Aluno cadastrado com sucesso!');
    }
    this.salvo.emit();
  }

  private paraForm(aluno: Aluno | null): AlunoFormData {
    if (aluno) {
      return {
        nome: aluno.nome,
        email: aluno.email,
        matricula: aluno.matricula,
        turmaId: aluno.turmaId,
        dataNascimento: aluno.dataNascimento,
        responsavel: aluno.responsavel,
        telefoneResponsavel: aluno.telefoneResponsavel,
        ativo: aluno.ativo,
      };
    }
    return {
      nome: '',
      email: '',
      matricula: '',
      turmaId: this.turmaIdPadrao(),
      dataNascimento: '',
      responsavel: '',
      telefoneResponsavel: '',
      ativo: true,
    };
  }
}
