import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { TurmaFormComponent } from '../turma-form/turma-form.component';
import { AlunosService } from '../../../core/services/alunos.service';
import { ProfessoresService } from '../../../core/services/professores.service';
import { ToastService } from '../../../core/services/toast.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { Turma, Turno, labelTurno } from '../../../core/models';

@Component({
  selector: 'app-turmas',
  imports: [ModalComponent, TurmaFormComponent, RouterLink],
  templateUrl: './turmas.component.html',
  styleUrl: './turmas.component.scss',
})
export class TurmasComponent {
  protected readonly turmas = inject(TurmasService);
  protected readonly professores = inject(ProfessoresService);
  protected readonly alunos = inject(AlunosService);
  private readonly toast = inject(ToastService);

  protected readonly busca = signal('');
  protected readonly modalAberto = signal(false);
  protected readonly editando = signal<Turma | null>(null);
  protected readonly excluindo = signal<Turma | null>(null);

  readonly filtradas = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const lista = this.turmas.turmas();
    if (!termo) return lista;
    return lista.filter((t) =>
      [t.nome, t.serie, t.codigo].some((campo) => campo.toLowerCase().includes(termo)),
    );
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected turnoLabel(turno: Turno): string {
    return labelTurno(turno);
  }

  protected professoresDa(turma: Turma): string {
    const nomes = this.professores.nomesDe(turma.professorIds);
    return nomes.length ? nomes.join(', ') : '—';
  }

  protected abrirNova(): void {
    this.editando.set(null);
    this.modalAberto.set(true);
  }

  protected abrirEdicao(turma: Turma): void {
    this.editando.set(turma);
    this.modalAberto.set(true);
  }

  protected onSalvo(): void {
    this.modalAberto.set(false);
  }

  protected fechar(): void {
    this.modalAberto.set(false);
  }

  protected pedirExclusao(turma: Turma): void {
    this.excluindo.set(turma);
  }

  protected cancelarExclusao(): void {
    this.excluindo.set(null);
  }

  protected async confirmarExclusao(): Promise<void> {
    const turma = this.excluindo();
    if (!turma) return;
    await this.turmas.remove(turma.id);
    this.toast.mostrar('Turma excluída.', 'info');
    this.excluindo.set(null);
  }
}
