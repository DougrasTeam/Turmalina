import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import {
  DadosPublicacao,
  Publicacao,
  StatusPublicacao,
  alcancePublicacao,
  publicacaoVigente,
  validarPublicacao,
} from '../models/publicacao.model';
import { sanitizarConteudo } from '../models/conteudo.model';
import { Usuario } from '../models/usuario.model';
import { AuditoriaService } from './auditoria.service';
import { MidiaService } from './midia.service';

/**
 * Publicações do mural coletivo (RF-022).
 * Somente a equipe (administrador/professor) escreve; o aluno apenas lê as
 * publicações vigentes destinadas à sua turma.
 */
@Injectable({ providedIn: 'root' })
export class PublicacoesService {
  private readonly repo: Repository<Publicacao> = inject(RepositoryFactory).create<Publicacao>(
    'turmalina.publicacoes',
    () => ({
      titulo: '',
      conteudo: '',
      imagemUrl: null,
      turmaId: null,
      disciplinaId: null,
      autorId: '',
      autorNome: '',
      publicadaEm: new Date().toISOString(),
      expiraEm: null,
      status: 'publicada',
    }),
  );
  private readonly auditoria = inject(AuditoriaService);
  private readonly midia = inject(MidiaService);

  private readonly _publicacoes = signal<Publicacao[]>([]);
  private carregado = false;

  readonly publicacoes = this._publicacoes.asReadonly();
  readonly total = computed(() => this._publicacoes().length);

  async load(): Promise<void> {
    if (this.carregado) return;
    this._publicacoes.set(await this.repo.list());
    this.carregado = true;
  }

  /** Publicações da mais recente para a mais antiga. */
  ordenadas(): Publicacao[] {
    return [...this._publicacoes()].sort((a, b) => b.publicadaEm.localeCompare(a.publicadaEm));
  }

  /** Publicações vigentes destinadas à turma informada (usado pelo aluno). */
  vigentesParaTurma(turmaId: string | null): Publicacao[] {
    return this.ordenadas().filter(
      (publicacao) => publicacaoVigente(publicacao) && alcancePublicacao(publicacao, turmaId),
    );
  }

  async criar(dados: DadosPublicacao, autor: Usuario): Promise<Publicacao> {
    this.garantirValida(dados);
    const publicacao = await this.repo.create({
      ...this.normalizar(dados),
      autorId: autor.id,
      autorNome: autor.nome,
      status: 'publicada',
    });
    this._publicacoes.update((lista) => [...lista, publicacao]);
    this.auditoria.registrar('publicacao.criada', 'Publicacao', publicacao.id, publicacao.titulo);
    return publicacao;
  }

  async atualizar(id: string, dados: DadosPublicacao): Promise<Publicacao> {
    this.garantirValida(dados);
    const publicacao = await this.repo.update(id, this.normalizar(dados));
    this._publicacoes.update((lista) => lista.map((item) => (item.id === id ? publicacao : item)));
    this.auditoria.registrar('publicacao.atualizada', 'Publicacao', id, publicacao.titulo);
    return publicacao;
  }

  async arquivar(id: string): Promise<void> {
    await this.definirStatus(id, 'arquivada');
  }

  async restaurar(id: string): Promise<void> {
    await this.definirStatus(id, 'publicada');
  }

  async remover(id: string): Promise<void> {
    const publicacao = this._publicacoes().find((item) => item.id === id);
    await this.repo.remove(id);
    await this.midia.removerImagemPublicacao(publicacao?.imagemUrl ?? null);
    this._publicacoes.update((lista) => lista.filter((item) => item.id !== id));
    this.auditoria.registrar('publicacao.removida', 'Publicacao', id, publicacao?.titulo ?? null);
  }

  async removerTodas(): Promise<void> {
    for (const publicacao of this._publicacoes()) {
      await this.repo.remove(publicacao.id);
      await this.midia.removerImagemPublicacao(publicacao.imagemUrl);
    }
    this._publicacoes.set([]);
    this.auditoria.registrar('publicacao.removidas-todas', 'Publicacao', null, null);
  }

  /** Remove as publicações de turmas específicas, preservando as institucionais. */
  async removerVinculadasATurmas(): Promise<void> {
    const vinculadas = this._publicacoes().filter((publicacao) => publicacao.turmaId !== null);
    for (const publicacao of vinculadas) {
      await this.repo.remove(publicacao.id);
      await this.midia.removerImagemPublicacao(publicacao.imagemUrl);
    }
    if (vinculadas.length) {
      this._publicacoes.update((lista) =>
        lista.filter((publicacao) => publicacao.turmaId === null),
      );
      this.auditoria.registrar('publicacao.removidas-por-turma', 'Publicacao', null, null);
    }
  }

  private async definirStatus(id: string, status: StatusPublicacao): Promise<void> {
    const publicacao = await this.repo.update(id, { status });
    this._publicacoes.update((lista) => lista.map((item) => (item.id === id ? publicacao : item)));
    const acao = status === 'arquivada' ? 'publicacao.arquivada' : 'publicacao.republicada';
    this.auditoria.registrar(acao, 'Publicacao', id, publicacao.titulo);
  }

  private garantirValida(dados: DadosPublicacao): void {
    const erros = validarPublicacao(dados);
    if (erros.length) {
      throw new Error(erros[0]);
    }
  }

  private normalizar(dados: DadosPublicacao): DadosPublicacao {
    return {
      titulo: dados.titulo.trim(),
      conteudo: sanitizarConteudo(dados.conteudo),
      imagemUrl: dados.imagemUrl || null,
      turmaId: dados.turmaId || null,
      disciplinaId: dados.disciplinaId || null,
      publicadaEm: dados.publicadaEm || new Date().toISOString(),
      expiraEm: dados.expiraEm || null,
    };
  }
}
