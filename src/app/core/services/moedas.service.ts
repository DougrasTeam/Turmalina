import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import {
  DadosMovimentacaoMoeda,
  MOEDAS_POR_NIVEL,
  MovimentacaoMoeda,
  formatarDeltaMoedas,
  saldoDeMovimentacoes,
  validarMovimentacaoMoeda,
} from '../models/moedas.model';
import { criarChaveIdempotencia } from '../models/gamificacao.model';
import { AlunosService } from './alunos.service';
import { AuditoriaService } from './auditoria.service';

/**
 * Moedas virtuais (RF-016).
 *
 * O saldo é sempre a soma de um ledger imutável de movimentações. Correções
 * acontecem por estorno, nunca por exclusão silenciosa, e o saldo nunca fica
 * negativo. As moedas não são dinheiro real e não interferem em notas,
 * frequência ou aprovação.
 */
@Injectable({ providedIn: 'root' })
export class MoedasService {
  private readonly repo: Repository<MovimentacaoMoeda> = inject(RepositoryFactory).create<
    MovimentacaoMoeda
  >('turmalina.moedas', () => ({
    alunoId: '',
    turmaId: null,
    delta: 0,
    origem: 'manual',
    descricao: '',
    autorId: null,
    autorNome: '',
    idempotencyKey: '',
    estornoDe: null,
    referenciaId: null,
  }));
  private readonly alunos = inject(AlunosService);
  private readonly auditoria = inject(AuditoriaService);

  private readonly _movimentacoes = signal<MovimentacaoMoeda[]>([]);
  private carregado = false;

  readonly movimentacoes = this._movimentacoes.asReadonly();
  readonly total = computed(() => this._movimentacoes().length);
  readonly totalMovimentacoes = this.total;
  readonly moedasPorNivel = MOEDAS_POR_NIVEL;

  async load(): Promise<void> {
    if (this.carregado) return;
    await this.alunos.load();
    this._movimentacoes.set(this.ordenar(await this.repo.list()));
    await this.reconstruirSaldos();
    this.carregado = true;
  }

  movimentacoesDoAluno(alunoId: string): MovimentacaoMoeda[] {
    return this.ordenar(
      this._movimentacoes().filter((movimentacao) => movimentacao.alunoId === alunoId),
    );
  }

  saldoDoAluno(alunoId: string): number {
    return saldoDeMovimentacoes(this.movimentacoesDoAluno(alunoId));
  }

  estaEstornada(movimentacaoId: string): boolean {
    return this._movimentacoes().some(
      (movimentacao) => movimentacao.estornoDe === movimentacaoId,
    );
  }

  validar(dados: DadosMovimentacaoMoeda): string[] {
    return validarMovimentacaoMoeda(dados);
  }

  /**
   * Concede moedas por uma subida de nível.
   *
   * `nivelId` identifica o nível alcançado; a chave de idempotência evita
   * conceder a mesma recompensa duas vezes para o mesmo aluno/nível.
   */
  async concederPorNivel(
    alunoId: string,
    nivel: number,
    turmaId: string | null,
    autorNome = 'Sistema',
  ): Promise<MovimentacaoMoeda | null> {
    const idempotencyKey = `nivel:${alunoId}:${nivel}`;
    const jaConcedido = this._movimentacoes().some(
      (movimentacao) => movimentacao.idempotencyKey === idempotencyKey,
    );
    if (jaConcedido) return null;

    const movimentacao = await this.repo.create({
      alunoId,
      turmaId,
      delta: MOEDAS_POR_NIVEL,
      origem: 'nivel',
      descricao: `Recompensa por alcançar o nível ${nivel}.`,
      autorId: null,
      autorNome,
      idempotencyKey,
      estornoDe: null,
      referenciaId: null,
    });
    this._movimentacoes.update((lista) => this.ordenar([...lista, movimentacao]));
    await this.aplicarSaldoDoAluno(alunoId);
    return movimentacao;
  }

  /** Ajuste manual de moedas pela equipe autorizada. */
  async ajustar(dados: DadosMovimentacaoMoeda): Promise<MovimentacaoMoeda> {
    const erros = this.validar(dados);
    if (erros.length) throw new Error(erros.join('\n'));

    const movimentacao = await this.repo.create({
      ...dados,
      idempotencyKey: dados.idempotencyKey || criarChaveIdempotencia(),
    });
    this._movimentacoes.update((lista) => this.ordenar([...lista, movimentacao]));
    await this.aplicarSaldoDoAluno(movimentacao.alunoId);
    this.auditoria.registrar(
      'moedas.movimentadas',
      'MovimentacaoMoeda',
      movimentacao.id,
      `${formatarDeltaMoedas(movimentacao.delta)} moedas: ${movimentacao.descricao}`,
    );
    return movimentacao;
  }

  /** Corrige uma movimentação criando um estorno; a original é preservada. */
  async estornar(movimentacaoId: string, autorNome: string): Promise<MovimentacaoMoeda> {
    const original = this._movimentacoes().find(
      (movimentacao) => movimentacao.id === movimentacaoId,
    );
    if (!original) throw new Error('Movimentação de moedas não encontrada.');
    if (original.estornoDe) throw new Error('Um estorno não pode ser estornado.');

    const jaEstornada = this.estaEstornada(original.id);
    if (jaEstornada) throw new Error('Esta movimentação já foi estornada.');

    const estorno = await this.repo.create({
      alunoId: original.alunoId,
      turmaId: original.turmaId,
      delta: -original.delta,
      origem: 'estorno',
      descricao: `Estorno: ${original.descricao}`,
      autorId: null,
      autorNome,
      idempotencyKey: `estorno:${original.id}`,
      estornoDe: original.id,
      referenciaId: original.referenciaId,
    });
    this._movimentacoes.update((lista) => this.ordenar([...lista, estorno]));
    await this.aplicarSaldoDoAluno(original.alunoId);
    this.auditoria.registrar(
      'moedas.estornadas',
      'MovimentacaoMoeda',
      original.id,
      `${formatarDeltaMoedas(estorno.delta)} moedas para o aluno ${original.alunoId}.`,
    );
    return estorno;
  }

  /** Recalcula o saldo materializado de todos os alunos a partir do ledger. */
  async reconstruirSaldos(): Promise<void> {
    for (const aluno of this.alunos.alunos()) {
      await this.aplicarSaldoDoAluno(aluno.id);
    }
  }

  /** Recalcula o saldo de alunos específicos (após remoções em cascata). */
  async recalcularSaldosDosAlunos(alunoIds: string[]): Promise<void> {
    for (const alunoId of new Set(alunoIds)) {
      await this.aplicarSaldoDoAluno(alunoId);
    }
  }

  /** Remove movimentações de turmas específicas e recalcula os afetados. */
  async removerDeTurmas(): Promise<void> {
    const vinculadas = this._movimentacoes().filter(
      (movimentacao) => movimentacao.turmaId !== null,
    );
    const alunosAfetados = [...new Set(vinculadas.map((movimentacao) => movimentacao.alunoId))];

    for (const movimentacao of vinculadas) {
      await this.repo.remove(movimentacao.id);
    }
    if (!vinculadas.length) return;

    this._movimentacoes.update((lista) =>
      lista.filter((movimentacao) => movimentacao.turmaId === null),
    );
    await this.recalcularSaldosDosAlunos(alunosAfetados);
    this.auditoria.registrar('moedas.removidas-por-turma', 'MovimentacaoMoeda', null, null);
  }

  async removerTodas(): Promise<void> {
    await this.limparMovimentacoes();
    await this.reconstruirSaldos();
    this.auditoria.registrar('moedas.removidas-todas', 'MovimentacaoMoeda', null, null);
  }

  /** Remove todas as movimentações sem recalcular (usado ao excluir alunos). */
  async limparMovimentacoes(): Promise<void> {
    for (const movimentacao of this._movimentacoes()) {
      await this.repo.remove(movimentacao.id);
    }
    this._movimentacoes.set([]);
  }

  private async aplicarSaldoDoAluno(alunoId: string): Promise<void> {
    const aluno = this.alunos.alunos().find((item) => item.id === alunoId);
    if (!aluno) return;
    const saldo = this.saldoDoAluno(alunoId);
    if (aluno.moedas !== saldo) {
      await this.alunos.update(alunoId, { moedas: saldo });
    }
  }

  private ordenar(lista: MovimentacaoMoeda[]): MovimentacaoMoeda[] {
    return [...lista].sort((primeira, segunda) =>
      segunda.criadoEm.localeCompare(primeira.criadoEm),
    );
  }
}
