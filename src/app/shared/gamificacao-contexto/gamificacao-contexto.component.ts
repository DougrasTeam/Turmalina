import { Component, inject, output } from '@angular/core';

import { ContextoGamificacaoService } from '../../core/services/contexto-gamificacao.service';

@Component({
  selector: 'app-gamificacao-contexto',
  templateUrl: './gamificacao-contexto.component.html',
  styleUrl: './gamificacao-contexto.component.scss',
})
export class GamificacaoContextoComponent {
  protected readonly contexto = inject(ContextoGamificacaoService);

  readonly contextoAlterado = output<void>();

  protected alterarTurma(evento: Event): void {
    const turmaId = (evento.target as HTMLSelectElement).value;
    this.contexto.selecionarTurma(turmaId);
    this.contextoAlterado.emit();
  }

  protected alterarDisciplina(evento: Event): void {
    const disciplinaId = (evento.target as HTMLSelectElement).value;
    this.contexto.selecionarDisciplina(disciplinaId);
    this.contextoAlterado.emit();
  }
}
