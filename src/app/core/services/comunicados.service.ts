import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import {
  Comunicado,
  DadosComunicado,
  TipoComunicado,
  validarComunicado,
} from '../models/comunicado.model';
import { sanitizarConteudo } from '../models/conteudo.model';
import { Usuario } from '../models/usuario.model';
import { AuditoriaService } from './auditoria.service';

/**
 * Comunicados individuais (RF-022): recados visíveis ao aluno e observações
 * privadas. Somente a equipe escreve; o aluno lê apenas os próprios recados.
 */
@Injectable({ providedIn: 'root' })
export class ComunicadosService {
  private readonly repo: Repository<Comunicado> = inject(RepositoryFactory).create<Comunicado>(
    'turmalina.comunicados',
    () => ({ tipo: 'recado', alunoId: '', titulo: '', conteudo: '', autorId: '', autorNome: '' }),
  );
  private readonly auditoria = inject(AuditoriaService);

  private readonly _comunicados = signal<Comunicado[]>([]);
  private carregado = false;

  readonly comunicados = this._comunicados.asReadonly();
  readonly total = computed(() => this._comunicados().length);

  async load(): Promise<void> {
    if (this.carregado) return;
    this._comunicados.set(await this.repo.list());
    this.carregado = true;
  }

  /** Comunicados do mais recente para o mais antigo. */
  ordenados(): Comunicado[] {
    return [...this._comunicados()].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }

  porAluno(alunoId: string): Comunicado[] {
    return this.ordenados().filter((comunicado) => comunicado.alunoId === alunoId);
  }

  /** Apenas os recados que o aluno pode ler (observações ficam ocultas). */
  recadosDoAluno(alunoId: string): Comunicado[] {
    return this.porAluno(alunoId).filter((comunicado) => comunicado.tipo === 'recado');
  }

  async criar(dados: DadosComunicado, autor: Usuario): Promise<Comunicado> {
    const erros = validarComunicado(dados);
    if (erros.length) {
      throw new Error(erros[0]);
    }

    const comunicado = await this.repo.create({
      tipo: dados.tipo,
      alunoId: dados.alunoId,
      titulo: dados.titulo.trim(),
      conteudo: sanitizarConteudo(dados.conteudo),
      autorId: autor.id,
      autorNome: autor.nome,
    });
    this._comunicados.update((lista) => [...lista, comunicado]);
    this.registrarCriacao(dados.tipo, comunicado);
    return comunicado;
  }

  async remover(id: string): Promise<void> {
    const comunicado = this._comunicados().find((item) => item.id === id);
    await this.repo.remove(id);
    this._comunicados.update((lista) => lista.filter((item) => item.id !== id));
    this.auditoria.registrar('comunicado.removido', 'Comunicado', id, comunicado?.alunoId ?? null);
  }

  async removerTodas(): Promise<void> {
    for (const comunicado of this._comunicados()) {
      await this.repo.remove(comunicado.id);
    }
    this._comunicados.set([]);
    this.auditoria.registrar('comunicado.removidos-todos', 'Comunicado', null, null);
  }

  private registrarCriacao(tipo: TipoComunicado, comunicado: Comunicado): void {
    const acao = tipo === 'recado' ? 'recado.enviado' : 'observacao.registrada';
    this.auditoria.registrar(acao, 'Comunicado', comunicado.id, comunicado.alunoId);
  }
}
