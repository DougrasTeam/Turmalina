import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import { AuditoriaService } from './auditoria.service';
import { InstituicaoService } from './instituicao.service';
import { PeriodosLetivosService } from './periodos-letivos.service';
import {
  Avaliacao,
  DadosAvaliacao,
  RegistroNota,
  ResultadoMedia,
  ResumoNotas,
  StatusAvaliacao,
  calcularMediaAluno,
  mediaDaAvaliacao,
  resumoNotas,
  validarAvaliacao,
  validarNota,
} from '../models/avaliacao.model';
import { NOTA_MAXIMA_PADRAO } from '../models/instituicao.model';

@Injectable({ providedIn: 'root' })
export class AvaliacoesService {
  private readonly repo: Repository<Avaliacao> = inject(RepositoryFactory).create<Avaliacao>(
    'turmalina.avaliacoes',
    () => ({
      nome: '',
      turmaId: '',
      disciplinaId: '',
      periodoLetivoId: '',
      etapaId: null,
      data: null,
      notaMaxima: NOTA_MAXIMA_PADRAO,
      peso: 1,
      status: 'rascunho',
      descricao: null,
      notas: [],
    }),
  );
  private readonly auditoria = inject(AuditoriaService);
  private readonly instituicao = inject(InstituicaoService);
  private readonly periodos = inject(PeriodosLetivosService);

  private readonly _avaliacoes = signal<Avaliacao[]>([]);
  private carregado = false;

  readonly avaliacoes = this._avaliacoes.asReadonly();
  readonly total = computed(() => this._avaliacoes().length);

  async load(): Promise<void> {
    if (this.carregado) return;
    this._avaliacoes.set(this.ordenar(await this.repo.list()));
    this.carregado = true;
  }

  porId(id: string): Avaliacao | undefined {
    return this._avaliacoes().find((avaliacao) => avaliacao.id === id);
  }

  porTurma(turmaId: string): Avaliacao[] {
    return this._avaliacoes().filter((avaliacao) => avaliacao.turmaId === turmaId);
  }

  porTurmaEPeriodo(turmaId: string, periodoLetivoId: string): Avaliacao[] {
    return this.porTurma(turmaId).filter((avaliacao) => avaliacao.periodoLetivoId === periodoLetivoId);
  }

  porDisciplina(disciplinaId: string): Avaliacao[] {
    return this._avaliacoes().filter((avaliacao) => avaliacao.disciplinaId === disciplinaId);
  }

  validar(dados: DadosAvaliacao): string[] {
    return validarAvaliacao(dados);
  }

  async criar(dados: DadosAvaliacao): Promise<Avaliacao> {
    const erros = this.validar(dados);
    if (erros.length) throw new Error(erros.join('\n'));
    this.garantirPeriodoAberto(dados.periodoLetivoId);
    const avaliacao = await this.repo.create(this.payload(dados));
    this._avaliacoes.update((lista) => this.ordenar([...lista, avaliacao]));
    this.auditoria.registrar('avaliacao.criada', 'Avaliacao', avaliacao.id, avaliacao.nome);
    return avaliacao;
  }

  async atualizar(id: string, dados: DadosAvaliacao): Promise<Avaliacao> {
    const erros = this.validar(dados);
    if (erros.length) throw new Error(erros.join('\n'));
    this.garantirPeriodoAberto(dados.periodoLetivoId);
    const atual = this.porId(id);
    const avaliacao = await this.repo.update(id, { ...this.payload(dados), notas: atual?.notas ?? [] });
    this._avaliacoes.update((lista) => this.ordenar(lista.map((item) => (item.id === id ? avaliacao : item))));
    this.auditoria.registrar('avaliacao.atualizada', 'Avaliacao', id, avaliacao.nome);
    return avaliacao;
  }

  async lancarNotas(id: string, notas: RegistroNota[]): Promise<Avaliacao> {
    const atual = this.porId(id);
    if (!atual) throw new Error('Avaliação não encontrada.');
    this.garantirPeriodoAberto(atual.periodoLetivoId);

    const erros: string[] = [];
    for (const nota of notas) {
      const problemas = validarNota(nota.valor, atual.notaMaxima);
      erros.push(...problemas);
    }
    if (erros.length) throw new Error(erros.join('\n'));

    const agora = new Date().toISOString();
    const normalizadas = notas.map((nota) => ({ ...nota, atualizadoEm: agora }));
    const atualizada = await this.repo.update(id, { notas: normalizadas });
    this._avaliacoes.update((lista) => this.ordenar(lista.map((item) => (item.id === id ? atualizada : item))));
    const resumo = resumoNotas(atualizada);
    this.auditoria.registrar(
      'avaliacao.notas-lancadas',
      'Avaliacao',
      id,
      `${resumo.lancadas}/${resumo.total}`,
    );
    return atualizada;
  }

  async definirStatus(id: string, status: StatusAvaliacao): Promise<void> {
    const avaliacao = this.porId(id);
    if (!avaliacao) return;
    if (status !== 'arquivada') {
      this.garantirPeriodoAberto(avaliacao.periodoLetivoId);
    }
    const atualizada = await this.repo.update(id, { status });
    this._avaliacoes.update((lista) => lista.map((item) => (item.id === id ? atualizada : item)));
    this.auditoria.registrar(`avaliacao.${status}`, 'Avaliacao', id, atualizada.nome);
  }

  async remover(id: string): Promise<void> {
    const avaliacao = this.porId(id);
    await this.repo.remove(id);
    this._avaliacoes.update((lista) => lista.filter((item) => item.id !== id));
    if (avaliacao) {
      this.auditoria.registrar('avaliacao.excluida', 'Avaliacao', id, avaliacao.nome);
    }
  }

  async removerTodas(): Promise<void> {
    await this.repo.removeAll();
    this._avaliacoes.set([]);
    this.auditoria.registrar('avaliacao.excluidas-todas', 'Avaliacao', null, null);
  }

  async removerPorTurma(turmaId: string): Promise<void> {
    const alvos = this.porTurma(turmaId);
    for (const avaliacao of alvos) {
      await this.repo.remove(avaliacao.id);
    }
    if (alvos.length) {
      this._avaliacoes.update((lista) => lista.filter((avaliacao) => avaliacao.turmaId !== turmaId));
    }
  }

  resumo(avaliacao: Avaliacao): ResumoNotas {
    return resumoNotas(avaliacao);
  }

  media(avaliacao: Avaliacao): number | null {
    return mediaDaAvaliacao(avaliacao, this.instituicao.casasDecimaisNota());
  }

  resultadoAluno(
    alunoId: string,
    turmaId: string,
    periodoLetivoId?: string,
    disciplinaId?: string,
    avaliacoesPermitidas?: readonly Avaliacao[],
  ): ResultadoMedia {
    const avaliacoesDaTurma = (avaliacoesPermitidas ?? this._avaliacoes()).filter(
      (avaliacao) =>
        avaliacao.turmaId === turmaId &&
        (!periodoLetivoId || avaliacao.periodoLetivoId === periodoLetivoId),
    );
    const escopo = disciplinaId
      ? avaliacoesDaTurma.filter((avaliacao) => avaliacao.disciplinaId === disciplinaId)
      : avaliacoesDaTurma;
    return calcularMediaAluno(escopo, alunoId, this.instituicao.casasDecimaisNota());
  }

  abaixoDaMedia(valor: number | null): boolean {
    return valor !== null && valor < this.instituicao.mediaMinima();
  }

  periodoBloqueado(periodoLetivoId: string): boolean {
    return this.periodos.periodoEncerrado(periodoLetivoId);
  }

  private garantirPeriodoAberto(periodoLetivoId: string): void {
    if (this.periodoBloqueado(periodoLetivoId)) {
      throw new Error('Período encerrado: reabra o período para alterar notas.');
    }
  }

  private payload(dados: DadosAvaliacao) {
    return {
      nome: dados.nome.trim(),
      turmaId: dados.turmaId,
      disciplinaId: dados.disciplinaId,
      periodoLetivoId: dados.periodoLetivoId,
      etapaId: dados.etapaId ?? null,
      data: dados.data || null,
      notaMaxima: dados.notaMaxima,
      peso: dados.peso,
      status: dados.status,
      descricao: dados.descricao?.trim() || null,
    };
  }

  private ordenar(lista: Avaliacao[]): Avaliacao[] {
    return [...lista].sort((primeira, segunda) => {
      const dataComparacao = (segunda.data ?? '').localeCompare(primeira.data ?? '');
      return dataComparacao !== 0 ? dataComparacao : primeira.nome.localeCompare(segunda.nome, 'pt-BR');
    });
  }
}
