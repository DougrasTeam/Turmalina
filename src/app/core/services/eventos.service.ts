import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import {
  DadosEvento,
  Evento,
  alcanceEvento,
  eventoDuplicado,
  eventoPassado,
  ordenarEventosPorInicio,
  validarEvento,
} from '../models/evento.model';
import { sanitizarConteudo } from '../models/conteudo.model';
import { Usuario } from '../models/usuario.model';
import { AuditoriaService } from './auditoria.service';

/**
 * Agenda escolar (RF-023).
 * Somente a equipe (administrador/professor) escreve; o aluno apenas lê os
 * eventos da sua turma e os institucionais.
 */
@Injectable({ providedIn: 'root' })
export class EventosService {
  private readonly repo: Repository<Evento> = inject(RepositoryFactory).create<Evento>(
    'turmalina.eventos',
    () => ({
      titulo: '',
      descricao: '',
      tipo: 'aula',
      inicioEm: new Date().toISOString(),
      turmaId: null,
      autorId: '',
      autorNome: '',
    }),
  );
  private readonly auditoria = inject(AuditoriaService);

  private readonly _eventos = signal<Evento[]>([]);
  private carregado = false;

  readonly eventos = this._eventos.asReadonly();
  readonly total = computed(() => this._eventos().length);

  async load(): Promise<void> {
    if (this.carregado) return;
    this._eventos.set(await this.repo.list());
    this.carregado = true;
  }

  /** Todos os eventos em ordem cronológica crescente. */
  ordenados(): Evento[] {
    return ordenarEventosPorInicio(this._eventos());
  }

  /** Próximos eventos (a partir da referência), em ordem cronológica. */
  proximos(referencia: Date = new Date()): Evento[] {
    return this.ordenados().filter((evento) => !eventoPassado(evento, referencia));
  }

  /** Eventos que alcançam a turma informada, incluindo os institucionais. */
  eventosParaTurma(turmaId: string | null): Evento[] {
    return this.ordenados().filter((evento) => alcanceEvento(evento, turmaId));
  }

  /** Procura um evento equivalente já cadastrado (duplicidade acidental). */
  encontrarDuplicado(dados: DadosEvento, ignorarId: string | null = null): Evento | null {
    return (
      this._eventos().find((evento) => evento.id !== ignorarId && eventoDuplicado(evento, dados)) ??
      null
    );
  }

  async criar(dados: DadosEvento, autor: Usuario): Promise<Evento> {
    this.garantirValido(dados);
    this.garantirSemDuplicidade(dados);
    const evento = await this.repo.create({
      ...this.normalizar(dados),
      autorId: autor.id,
      autorNome: autor.nome,
    });
    this._eventos.update((lista) => [...lista, evento]);
    this.auditoria.registrar('evento.criado', 'Evento', evento.id, evento.titulo);
    return evento;
  }

  async atualizar(id: string, dados: DadosEvento): Promise<Evento> {
    this.garantirValido(dados);
    this.garantirSemDuplicidade(dados, id);
    const evento = await this.repo.update(id, this.normalizar(dados));
    this._eventos.update((lista) => lista.map((item) => (item.id === id ? evento : item)));
    this.auditoria.registrar('evento.atualizado', 'Evento', id, evento.titulo);
    return evento;
  }

  async remover(id: string): Promise<void> {
    const evento = this._eventos().find((item) => item.id === id);
    await this.repo.remove(id);
    this._eventos.update((lista) => lista.filter((item) => item.id !== id));
    this.auditoria.registrar('evento.removido', 'Evento', id, evento?.titulo ?? null);
  }

  async removerTodas(): Promise<void> {
    for (const evento of this._eventos()) {
      await this.repo.remove(evento.id);
    }
    this._eventos.set([]);
    this.auditoria.registrar('evento.removidos-todos', 'Evento', null, null);
  }

  /** Remove os eventos de turmas específicas, preservando os institucionais. */
  async removerVinculadasATurmas(): Promise<void> {
    const vinculados = this._eventos().filter((evento) => evento.turmaId !== null);
    for (const evento of vinculados) {
      await this.repo.remove(evento.id);
    }
    if (vinculados.length) {
      this._eventos.update((lista) => lista.filter((evento) => evento.turmaId === null));
      this.auditoria.registrar('evento.removidos-por-turma', 'Evento', null, null);
    }
  }

  private garantirValido(dados: DadosEvento): void {
    const erros = validarEvento(dados);
    if (erros.length) {
      throw new Error(erros[0]);
    }
  }

  private garantirSemDuplicidade(dados: DadosEvento, ignorarId: string | null = null): void {
    if (this.encontrarDuplicado(dados, ignorarId)) {
      throw new Error('Já existe um evento com o mesmo título, tipo e horário.');
    }
  }

  private normalizar(dados: DadosEvento): DadosEvento {
    return {
      titulo: dados.titulo.trim(),
      descricao: sanitizarConteudo(dados.descricao),
      tipo: dados.tipo,
      inicioEm: new Date(dados.inicioEm).toISOString(),
      turmaId: dados.turmaId || null,
    };
  }
}
