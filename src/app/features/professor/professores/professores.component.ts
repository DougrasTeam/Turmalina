import { Component, computed, inject, signal } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { ProfessoresService } from '../../../core/services/professores.service';
import { ToastService } from '../../../core/services/toast.service';
import { DISCIPLINAS_SUGERIDAS, Professor } from '../../../core/models';

interface ProfessorForm {
  nome: string;
  email: string;
  telefone: string;
  disciplinas: string[];
  ativo: boolean;
}

@Component({
  selector: 'app-professores',
  imports: [ModalComponent],
  templateUrl: './professores.component.html',
  styleUrl: './professores.component.scss',
})
export class ProfessoresComponent {
  protected readonly professores = inject(ProfessoresService);
  private readonly toast = inject(ToastService);

  protected readonly sugestoes = DISCIPLINAS_SUGERIDAS;
  protected readonly busca = signal('');
  protected readonly novaDisciplina = signal('');
  protected readonly modalAberto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly excluindo = signal<Professor | null>(null);
  protected readonly form = signal<ProfessorForm>(this.formVazio());

  readonly filtrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const lista = this.professores.professores();
    if (!termo) return lista;
    return lista.filter((p) =>
      [p.nome, p.email, p.disciplinas.join(' ')].some((campo) => campo.toLowerCase().includes(termo)),
    );
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected marcado(evento: Event): boolean {
    return (evento.target as HTMLInputElement).checked;
  }

  protected patch<K extends keyof ProfessorForm>(campo: K, valorCampo: ProfessorForm[K]): void {
    this.form.update((atual) => ({ ...atual, [campo]: valorCampo }));
  }

  protected adicionarDisciplina(evento?: Event): void {
    evento?.preventDefault();
    this.adicionarSugestao(this.novaDisciplina());
  }

  protected adicionarSugestao(disciplina: string): void {
    const limpo = disciplina.trim();
    if (!limpo) return;
    this.form.update((atual) =>
      atual.disciplinas.includes(limpo)
        ? atual
        : { ...atual, disciplinas: [...atual.disciplinas, limpo] },
    );
    this.novaDisciplina.set('');
  }

  protected removerDisciplina(disciplina: string): void {
    this.form.update((atual) => ({
      ...atual,
      disciplinas: atual.disciplinas.filter((d) => d !== disciplina),
    }));
  }

  protected abrirNovo(): void {
    this.editandoId.set(null);
    this.form.set(this.formVazio());
    this.modalAberto.set(true);
  }

  protected abrirEdicao(professor: Professor): void {
    this.editandoId.set(professor.id);
    this.form.set({
      nome: professor.nome,
      email: professor.email,
      telefone: professor.telefone,
      disciplinas: [...professor.disciplinas],
      ativo: professor.ativo,
    });
    this.modalAberto.set(true);
  }

  protected fechar(): void {
    this.modalAberto.set(false);
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    const dados = this.form();
    if (!dados.nome.trim()) {
      this.toast.mostrar('Informe o nome do professor.', 'warning');
      return;
    }

    const id = this.editandoId();
    if (id) {
      await this.professores.update(id, dados);
      this.toast.mostrar('Professor atualizado com sucesso!');
    } else {
      await this.professores.create(dados);
      this.toast.mostrar('Professor cadastrado com sucesso!');
    }
    this.fechar();
  }

  protected pedirExclusao(professor: Professor): void {
    this.excluindo.set(professor);
  }

  protected cancelarExclusao(): void {
    this.excluindo.set(null);
  }

  protected async confirmarExclusao(): Promise<void> {
    const professor = this.excluindo();
    if (!professor) return;
    await this.professores.remove(professor.id);
    this.toast.mostrar('Professor excluído.', 'info');
    this.excluindo.set(null);
  }

  private formVazio(): ProfessorForm {
    return { nome: '', email: '', telefone: '', disciplinas: [], ativo: true };
  }
}
