import { Component, computed, inject, signal } from '@angular/core';

import { AuditoriaService } from '../../../core/services/auditoria.service';
import {
  AcaoAuditoria,
  EventoAuditoria,
  descreverAcaoAuditoria,
  formatarDataHoraAuditoria,
  rotuloEntidadeAuditoria,
} from '../../../core/models/auditoria.model';

@Component({
  selector: 'app-auditoria',
  templateUrl: './auditoria.component.html',
  styleUrl: './auditoria.component.scss',
})
export class AuditoriaComponent {
  protected readonly auditoria = inject(AuditoriaService);

  protected readonly busca = signal('');
  protected readonly entidadeFiltrada = signal('');

  protected readonly entidades = computed(() => {
    const entidadesRegistradas = new Set(this.auditoria.eventos().map((evento) => evento.entidade));
    return [...entidadesRegistradas].sort();
  });

  protected readonly eventosFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const entidade = this.entidadeFiltrada();
    return this.auditoria.eventos().filter((evento) => {
      if (entidade && evento.entidade !== entidade) return false;
      return this.correspondeAoTermo(evento, termo);
    });
  });

  protected valorDoCampo(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected descricaoDaAcao(evento: EventoAuditoria): AcaoAuditoria {
    return descreverAcaoAuditoria(evento.acao);
  }

  protected rotuloEntidade(entidade: string): string {
    return rotuloEntidadeAuditoria(entidade);
  }

  protected formatarDataHora(iso: string): string {
    return formatarDataHoraAuditoria(iso);
  }

  private correspondeAoTermo(evento: EventoAuditoria, termo: string): boolean {
    if (!termo) return true;
    const descricao = descreverAcaoAuditoria(evento.acao);
    const camposPesquisaveis = [
      evento.atorNome ?? '',
      evento.acao,
      descricao.rotulo,
      evento.entidade,
      rotuloEntidadeAuditoria(evento.entidade),
      evento.referencia ?? '',
      evento.detalhes ?? '',
    ];
    return camposPesquisaveis.some((campo) => campo.toLowerCase().includes(termo));
  }
}
