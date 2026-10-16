import { Injectable, inject, signal } from '@angular/core';

import { AuthService } from './auth.service';
import { EventoAuditoria } from '../models/auditoria.model';
import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';

/**
 * Trilha de auditoria local (demonstração) para alterações críticas.
 * No backend real, deve ser imutável e revalida o autor no servidor.
 */
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly repo: Repository<EventoAuditoria> = inject(RepositoryFactory).create<EventoAuditoria>(
    'turmalina.auditoria',
    () => ({
      atorId: null,
      atorNome: null,
      acao: '',
      entidade: '',
      referencia: null,
      detalhes: null,
    }),
  );
  private readonly auth = inject(AuthService);

  private readonly _eventos = signal<EventoAuditoria[]>([]);
  readonly eventos = this._eventos.asReadonly();

  async carregar(): Promise<void> {
    const lista = await this.repo.list();
    this._eventos.set(
      [...lista].sort((primeiro, segundo) => segundo.criadoEm.localeCompare(primeiro.criadoEm)),
    );
  }

  registrar(acao: string, entidade: string, referencia: string | null = null, detalhes: string | null = null): void {
    const usuario = this.auth.usuario();
    void this.repo
      .create({
        acao,
        entidade,
        referencia,
        detalhes,
        atorId: usuario?.id ?? null,
        atorNome: usuario?.nome ?? null,
      })
      .then((evento) => this._eventos.update((lista) => [evento, ...lista]));
  }

  async limpar(): Promise<void> {
    for (const evento of this._eventos()) {
      await this.repo.remove(evento.id);
    }
    this._eventos.set([]);
  }
}
