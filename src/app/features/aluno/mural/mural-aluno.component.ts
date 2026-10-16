import { Component, computed, inject } from '@angular/core';

import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { ComunicadosService } from '../../../core/services/comunicados.service';
import { PublicacoesService } from '../../../core/services/publicacoes.service';
import { Aluno } from '../../../core/models';

/**
 * Mural do aluno (RF-022): exibe apenas as publicações vigentes destinadas à
 * sua turma (ou institucionais) e os recados individuais recebidos. As
 * observações privadas nunca são mostradas ao aluno.
 */
@Component({
  selector: 'app-mural-aluno',
  templateUrl: './mural-aluno.component.html',
  styleUrl: './mural-aluno.component.scss',
})
export class MuralAlunoComponent {
  private readonly auth = inject(AuthService);
  private readonly alunos = inject(AlunosService);
  protected readonly publicacoes = inject(PublicacoesService);
  protected readonly comunicados = inject(ComunicadosService);

  protected readonly alunoProprio = computed<Aluno | null>(() => {
    const email = this.auth.usuario()?.email;
    if (!email) return null;
    return this.alunos.alunos().find((aluno) => aluno.email === email) ?? null;
  });

  protected readonly publicacoesDaTurma = computed(() => {
    const aluno = this.alunoProprio();
    return aluno ? this.publicacoes.vigentesParaTurma(aluno.turmaId) : [];
  });

  protected readonly meusRecados = computed(() => {
    const aluno = this.alunoProprio();
    return aluno ? this.comunicados.recadosDoAluno(aluno.id) : [];
  });

  protected formatarDataHora(iso: string): string {
    const data = new Date(iso);
    return Number.isNaN(data.getTime())
      ? iso
      : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  protected formatarData(iso: string | null): string {
    if (!iso) return '—';
    const partes = iso.slice(0, 10).split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : iso;
  }
}
