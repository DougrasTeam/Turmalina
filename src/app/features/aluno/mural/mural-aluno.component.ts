import { Component, computed, inject, signal } from '@angular/core';

import { FeedPublicacoesComponent } from '../../mural/feed-publicacoes/feed-publicacoes.component';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { ComunicadosService } from '../../../core/services/comunicados.service';
import { PublicacoesService } from '../../../core/services/publicacoes.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { Aluno } from '../../../core/models';
import {
  EscopoFiltroPublicacoes,
  aplicarFiltroPublicacoes,
} from '../../../core/models/filtro-publicacoes.model';

/**
 * Mural do aluno (RF-022): apresenta o feed de publicações vigentes destinadas
 * à sua turma e à escola, com filtro entre elas, e os recados individuais
 * recebidos. As observações privadas nunca são mostradas ao aluno.
 */
@Component({
  selector: 'app-mural-aluno',
  imports: [FeedPublicacoesComponent],
  templateUrl: './mural-aluno.component.html',
  styleUrl: './mural-aluno.component.scss',
})
export class MuralAlunoComponent {
  private readonly auth = inject(AuthService);
  private readonly alunos = inject(AlunosService);
  private readonly turmas = inject(TurmasService);
  protected readonly publicacoes = inject(PublicacoesService);
  protected readonly comunicados = inject(ComunicadosService);

  protected readonly escopo = signal<EscopoFiltroPublicacoes>('tudo');

  protected readonly alunoProprio = computed<Aluno | null>(() => {
    const usuario = this.auth.usuario();
    if (!usuario) return null;
    return this.alunos.encontrarPorUsuario(usuario.id, usuario.email);
  });

  protected readonly publicacoesDaTurma = computed(() => {
    const aluno = this.alunoProprio();
    return aluno ? this.publicacoes.vigentesParaTurma(aluno.turmaId) : [];
  });

  protected readonly publicacoesVisiveis = computed(() => {
    const aluno = this.alunoProprio();
    return aplicarFiltroPublicacoes(
      this.publicacoesDaTurma(),
      { escopo: this.escopo(), turmaId: aluno?.turmaId ?? '', apenasMeus: false },
      null,
    );
  });

  protected readonly nomesTurmas = computed<Record<string, string>>(() => {
    const mapa: Record<string, string> = {};
    for (const turma of this.turmas.turmas()) {
      mapa[turma.id] = turma.nome;
    }
    return mapa;
  });

  protected readonly meusRecados = computed(() => {
    const aluno = this.alunoProprio();
    return aluno ? this.comunicados.recadosDoAluno(aluno.id) : [];
  });

  protected definirEscopo(escopo: EscopoFiltroPublicacoes): void {
    this.escopo.set(escopo);
  }

  protected formatarDataHora(iso: string): string {
    const data = new Date(iso);
    return Number.isNaN(data.getTime())
      ? iso
      : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }
}
