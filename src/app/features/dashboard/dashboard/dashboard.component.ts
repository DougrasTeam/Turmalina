import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProfessoresService } from '../../../core/services/professores.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { PainelProfessorComponent } from '../../professor/painel/painel-professor.component';
import { labelTurno } from '../../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, PainelProfessorComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly turmas = inject(TurmasService);
  protected readonly professores = inject(ProfessoresService);
  protected readonly alunos = inject(AlunosService);

  readonly turmasRecentes = computed(() => [...this.turmas.turmas()].slice(-5).reverse());
  readonly professoresRecentes = computed(() => [...this.professores.professores()].slice(-5).reverse());

  turno(valor: Parameters<typeof labelTurno>[0]): string {
    return labelTurno(valor);
  }
}
