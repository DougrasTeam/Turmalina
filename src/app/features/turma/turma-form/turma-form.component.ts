import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { DisciplinasService } from '../../../core/services/disciplinas.service';
import { ProfessoresService } from '../../../core/services/professores.service';
import { ToastService } from '../../../core/services/toast.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { TURNOS, Turma, Turno, gerarCodigoTurma } from '../../../core/models';

interface TurmaFormData {
  nome: string;
  serie: string;
  turno: Turno;
  anoLetivo: number;
  codigo: string;
  descricao: string;
  professorIds: string[];
  disciplinaIds: string[];
  ativa: boolean;
}

@Component({
  selector: 'app-turma-form',
  imports: [ModalComponent],
  templateUrl: './turma-form.component.html',
  styleUrl: './turma-form.component.scss',
})
export class TurmaFormComponent {
  readonly open = input(false);
  readonly turma = input<Turma | null>(null);

  readonly salvo = output<void>();
  readonly fechado = output<void>();

  protected readonly professores = inject(ProfessoresService);
  protected readonly disciplinas = inject(DisciplinasService);
  private readonly turmas = inject(TurmasService);
  private readonly toast = inject(ToastService);

  protected readonly turnos = TURNOS;
  protected readonly form = linkedSignal<TurmaFormData>(() => {
    this.open();
    return this.paraForm(this.turma());
  });

  protected readonly todosProfessoresSelecionados = computed(() => {
    const lista = this.professores.professores();
    return lista.length > 0 && lista.every((prof) => this.form().professorIds.includes(prof.id));
  });

  protected readonly todasDisciplinasSelecionadas = computed(() => {
    const lista = this.disciplinas.disciplinas();
    return lista.length > 0 && lista.every((disciplina) => this.form().disciplinaIds.includes(disciplina.id));
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected marcado(evento: Event): boolean {
    return (evento.target as HTMLInputElement).checked;
  }

  protected patch<K extends keyof TurmaFormData>(campo: K, valorCampo: TurmaFormData[K]): void {
    this.form.update((atual) => ({ ...atual, [campo]: valorCampo }));
  }

  protected setTurno(evento: Event): void {
    this.patch('turno', this.valor(evento) as Turno);
  }

  protected toggleProfessor(id: string): void {
    this.form.update((atual) => {
      const possui = atual.professorIds.includes(id);
      return {
        ...atual,
        professorIds: possui ? atual.professorIds.filter((p) => p !== id) : [...atual.professorIds, id],
      };
    });
  }

  protected alternarTodosProfessores(evento: Event): void {
    const marcar = this.marcado(evento);
    this.patch('professorIds', marcar ? this.professores.professores().map((prof) => prof.id) : []);
  }

  protected alternarTodasDisciplinas(evento: Event): void {
    const marcar = this.marcado(evento);
    this.patch('disciplinaIds', marcar ? this.disciplinas.disciplinas().map((disciplina) => disciplina.id) : []);
  }

  protected toggleDisciplina(id: string): void {
    this.form.update((atual) => {
      const possui = atual.disciplinaIds.includes(id);
      return {
        ...atual,
        disciplinaIds: possui ? atual.disciplinaIds.filter((d) => d !== id) : [...atual.disciplinaIds, id],
      };
    });
  }

  protected gerarCodigo(): void {
    this.patch('codigo', gerarCodigoTurma());
  }

  protected fechar(): void {
    this.fechado.emit();
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    const dados = this.form();
    if (!dados.nome.trim()) {
      this.toast.mostrar('Informe o nome da turma.', 'warning');
      return;
    }

    const atual = this.turma();
    if (atual) {
      await this.turmas.update(atual.id, dados);
      this.toast.mostrar('Turma atualizada com sucesso!');
    } else {
      await this.turmas.create(dados);
      this.toast.mostrar('Turma cadastrada com sucesso!');
    }
    this.salvo.emit();
  }

  private paraForm(turma: Turma | null): TurmaFormData {
    if (turma) {
      return {
        nome: turma.nome,
        serie: turma.serie,
        turno: turma.turno,
        anoLetivo: turma.anoLetivo,
        codigo: turma.codigo,
        descricao: turma.descricao,
        professorIds: [...(turma.professorIds ?? [])],
        disciplinaIds: [...(turma.disciplinaIds ?? [])],
        ativa: turma.ativa,
      };
    }
    return {
      nome: '',
      serie: '',
      turno: 'manha',
      anoLetivo: new Date().getFullYear(),
      codigo: gerarCodigoTurma(),
      descricao: '',
      professorIds: [],
      disciplinaIds: [],
      ativa: true,
    };
  }
}
