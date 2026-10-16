import { Component, computed, inject, signal } from '@angular/core';

import { ConfirmarTextoComponent } from '../../../shared/confirmar-texto/confirmar-texto.component';
import { AlvoLimpeza, DadosService, GrupoDados } from '../../../core/services/dados.service';
import { ToastService } from '../../../core/services/toast.service';

interface GrupoResumo {
  chave: GrupoDados;
  rotulo: string;
  icone: string;
  descricao: string;
}

@Component({
  selector: 'app-reset-dados',
  imports: [ConfirmarTextoComponent],
  templateUrl: './reset-dados.component.html',
  styleUrl: './reset-dados.component.scss',
})
export class ResetDadosComponent {
  protected readonly dados = inject(DadosService);
  private readonly toast = inject(ToastService);

  protected readonly grupos: GrupoResumo[] = [
    {
      chave: 'alunos',
      rotulo: 'Alunos',
      icone: 'groups',
      descricao: 'Exclui todos os alunos e as matrículas relacionadas.',
    },
    {
      chave: 'turmas',
      rotulo: 'Turmas',
      icone: 'school',
      descricao: 'Exclui as turmas, seus vínculos docentes e matrículas; alunos ficam sem turma.',
    },
    {
      chave: 'professores',
      rotulo: 'Professores',
      icone: 'co_present',
      descricao: 'Exclui os professores e remove seus vínculos das turmas.',
    },
    {
      chave: 'disciplinas',
      rotulo: 'Disciplinas',
      icone: 'menu_book',
      descricao: 'Exclui as disciplinas e remove os vínculos e ofertas nas turmas.',
    },
    {
      chave: 'periodos',
      rotulo: 'Períodos letivos',
      icone: 'calendar_month',
      descricao: 'Exclui os períodos (inclusive o ativo) e as matrículas relacionadas.',
    },
    {
      chave: 'frequencias',
      rotulo: 'Frequência',
      icone: 'fact_check',
      descricao: 'Exclui todas as chamadas de frequência registradas.',
    },
    {
      chave: 'avaliacoes',
      rotulo: 'Avaliações e notas',
      icone: 'grading',
      descricao: 'Exclui todas as avaliações e as notas lançadas.',
    },
    {
      chave: 'comunicacao',
      rotulo: 'Mural e comunicados',
      icone: 'campaign',
      descricao: 'Exclui as publicações do mural, os recados e as observações privadas.',
    },
  ];

  protected readonly alvo = signal<AlvoLimpeza | null>(null);

  protected readonly confirmacao = computed(() => {
    const atual = this.alvo();
    return atual ? this.dados.confirmacao(atual) : null;
  });

  protected readonly palavra = computed(() => (this.alvo() === 'tudo' ? 'EXCLUIR TUDO' : 'EXCLUIR'));

  protected totalDe(chave: GrupoDados): number {
    return this.dados.resumo()[chave];
  }

  protected abrir(alvo: AlvoLimpeza): void {
    this.alvo.set(alvo);
  }

  protected fechar(): void {
    this.alvo.set(null);
  }

  protected async confirmar(): Promise<void> {
    const atual = this.alvo();
    if (!atual) return;
    if (atual === 'tudo') {
      await this.dados.excluirTudo();
      this.toast.mostrar('Todos os dados foram excluídos.', 'info');
    } else {
      await this.dados.excluir(atual);
      this.toast.mostrar('Dados excluídos.', 'info');
    }
    this.alvo.set(null);
  }
}
