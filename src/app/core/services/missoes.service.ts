import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import { Usuario } from '../models/usuario.model';
import {
  DadosMissao,
  Missao,
  MissaoAluno,
  StatusMissao,
  classeSituacaoMissao,
  missaoPodeReceberConclusao,
  missaoVisivelParaAluno,
  rotuloSituacaoMissao,
  situacaoMissao,
  validarMissao,
} from '../models/missoes-metas.model';
import { AlunosService } from './alunos.service';
import { AuditoriaService } from './auditoria.service';
import { GamificacaoService } from './gamificacao.service';
import { MoedasService } from './moedas.service';

/**
 * Missões da gamificação (RF-019).
 *
 * Missões são desafios por turma, individuais ou coletivos, com período de
 * validade. A equipe publica, acompanha conclusões e concede as recompensas; a
 * conclusão é idempotente por aluno/missão. Missões encerradas ou expiradas não
 * recebem novas conclusões.
 */
@Injectable({ providedIn: 'root' })
export class MissoesService {
  private readonly repoMissoes: Repository<Missao> = inject(RepositoryFactory).create<Missao>(
    'turmalina.missoes',
    () => ({
      nome: '',
      descricao: '',
      instrucoes: '',
      tipo: 'individual',
      turmaId: '',
      disciplinaId: '',
      indicador: '',
      xpRecompensa: 0,
      moedasRecompensa: 0,
      status: 'rascunho',
      inicioEm: null,
      fimEm: null,
    }),
  );
  private readonly repoConclusoes: Repository<MissaoAluno> = inject(
    RepositoryFactory,
  ).create<MissaoAluno>('turmalina.missoes-aluno', () => ({
    missaoId: '',
    missaoNome: '',
    alunoId: '',
    turmaId: '',
    disciplinaId: '',
    autorId: null,
    autorNome: '',
    idempotencyKey: '',
  }));
  private readonly alunos = inject(AlunosService);
  private readonly gamificacao = inject(GamificacaoService);
  private readonly moedas = inject(MoedasService);
  private readonly auditoria = inject(AuditoriaService);

  private readonly _missoes = signal<Missao[]>([]);
  private readonly _conclusoes = signal<MissaoAluno[]>([]);
  private carregado = false;

  readonly missoes = this._missoes.asReadonly();
  readonly conclusoes = this._conclusoes.asReadonly();
  readonly totalMissoes = computed(() => this._missoes().length);
  readonly totalConclusoes = computed(() => this._conclusoes().length);

  async load(): Promise<void> {
    if (this.carregado) return;

    await Promise.all([this.alunos.load(), this.gamificacao.load(), this.moedas.load()]);
    const [missoes, conclusoes] = await Promise.all([
      this.repoMissoes.list(),
      this.repoConclusoes.list(),
    ]);

    this._missoes.set(this.ordenarMissoes(missoes));
    this._conclusoes.set(this.ordenarConclusoes(conclusoes));
    this.carregado = true;
  }

  porId(id: string): Missao | undefined {
    return this._missoes().find((missao) => missao.id === id);
  }

  missoesDaTurma(turmaId: string): Missao[] {
    return this._missoes().filter((missao) => missao.turmaId === turmaId);
  }

  missoesDaTurmaEDisciplina(turmaId: string, disciplinaId: string): Missao[] {
    return this._missoes().filter(
      (missao) => missao.turmaId === turmaId && missao.disciplinaId === disciplinaId,
    );
  }

  missoesVisiveisDaTurma(turmaId: string): Missao[] {
    return this.missoesDaTurma(turmaId).filter((missao) => missaoVisivelParaAluno(missao));
  }

  missoesVisiveisDaTurmaEDisciplina(turmaId: string, disciplinaId: string): Missao[] {
    return this.missoesDaTurmaEDisciplina(turmaId, disciplinaId).filter((missao) =>
      missaoVisivelParaAluno(missao),
    );
  }

  missoesVisiveisDoAluno(alunoId: string, turmaId: string): Missao[] {
    return this.missoesVisiveisDaTurma(turmaId).filter(
      (missao) => !this.alunoConcluiu(missao.id, alunoId),
    );
  }

  conclusoesDaMissao(missaoId: string): MissaoAluno[] {
    return this._conclusoes().filter((conclusao) => conclusao.missaoId === missaoId);
  }

  conclusoesDoAluno(alunoId: string): MissaoAluno[] {
    return this._conclusoes().filter((conclusao) => conclusao.alunoId === alunoId);
  }

  alunoConcluiu(missaoId: string, alunoId: string): boolean {
    return this._conclusoes().some(
      (conclusao) => conclusao.missaoId === missaoId && conclusao.alunoId === alunoId,
    );
  }

  situacao(missao: Missao): ReturnType<typeof situacaoMissao> {
    return situacaoMissao(missao);
  }

  rotuloSituacao(missao: Missao): string {
    return rotuloSituacaoMissao(this.situacao(missao));
  }

  classeSituacao(missao: Missao): string {
    return classeSituacaoMissao(this.situacao(missao));
  }

  podeReceberConclusao(missao: Missao): boolean {
    return missaoPodeReceberConclusao(missao);
  }

  validar(dados: DadosMissao, idAtual?: string): string[] {
    return validarMissao(dados, this._missoes(), idAtual);
  }

  async criarMissao(dados: DadosMissao): Promise<Missao> {
    await this.load();
    this.garantirMissaoValida(dados);
    const missao = await this.repoMissoes.create(this.normalizarMissao(dados));
    this._missoes.update((lista) => this.ordenarMissoes([...lista, missao]));
    this.auditoria.registrar('missao.criada', 'Missao', missao.id, missao.nome);
    return missao;
  }

  async atualizarMissao(id: string, dados: DadosMissao): Promise<Missao> {
    await this.load();
    this.garantirMissaoValida(dados, id);
    const missao = await this.repoMissoes.update(id, this.normalizarMissao(dados));
    this._missoes.update((lista) =>
      this.ordenarMissoes(lista.map((item) => (item.id === id ? missao : item))),
    );
    this.auditoria.registrar('missao.atualizada', 'Missao', id, missao.nome);
    return missao;
  }

  async alterarStatus(id: string, status: StatusMissao): Promise<void> {
    const missao = this.porId(id);
    if (!missao || missao.status === status) return;

    const atualizada = await this.repoMissoes.update(id, { status });
    this._missoes.update((lista) =>
      this.ordenarMissoes(lista.map((item) => (item.id === id ? atualizada : item))),
    );
    this.auditoria.registrar(
      'missao.status',
      'Missao',
      id,
      `${missao.nome}: ${missao.status} → ${status}.`,
    );
  }

  async publicar(id: string): Promise<void> {
    await this.alterarStatus(id, 'publicada');
  }

  async encerrar(id: string): Promise<void> {
    await this.alterarStatus(id, 'encerrada');
  }

  async arquivar(id: string): Promise<void> {
    await this.alterarStatus(id, 'arquivada');
  }

  /**
   * Conclui a missão para os alunos informados. Usado tanto para missões
   * individuais (seleção manual) quanto para coletivas (todos os ativos da
   * turma). Retorna apenas as conclusões realmente criadas.
   */
  async concluir(missaoId: string, alunoIds: string[], autor: Usuario): Promise<MissaoAluno[]> {
    await this.load();
    const missao = this.porId(missaoId);
    if (!missao) throw new Error('Missão não encontrada.');
    if (!this.podeReceberConclusao(missao)) {
      throw new Error('Esta missão não está publicada ou já foi encerrada.');
    }

    const idsUnicos = [...new Set(alunoIds)];
    if (!idsUnicos.length) throw new Error('Selecione ao menos um aluno.');

    const alunosPorId = new Map(this.alunos.alunos().map((aluno) => [aluno.id, aluno]));
    const criadas: MissaoAluno[] = [];

    for (const alunoId of idsUnicos) {
      const aluno = alunosPorId.get(alunoId);
      if (!aluno || !aluno.ativo || aluno.turmaId !== missao.turmaId) continue;
      if (this.alunoConcluiu(missao.id, alunoId)) continue;

      const idempotencyKey = `missao:${missao.id}:${alunoId}`;
      const jaRegistrada = this._conclusoes().some(
        (conclusao) => conclusao.idempotencyKey === idempotencyKey,
      );
      if (jaRegistrada) continue;

      let conclusao: MissaoAluno | null = null;
      try {
        conclusao = await this.repoConclusoes.create({
          missaoId: missao.id,
          missaoNome: missao.nome,
          alunoId,
          turmaId: missao.turmaId,
          disciplinaId: missao.disciplinaId,
          autorId: autor.id,
          autorNome: autor.nome,
          idempotencyKey,
        });
        this._conclusoes.update((lista) =>
          this.ordenarConclusoes([...lista, conclusao as MissaoAluno]),
        );

        await this.concederRecompensas(missao, conclusao, autor);
        criadas.push(conclusao);
      } catch (erro) {
        if (conclusao) {
          await this.repoConclusoes.remove(conclusao.id);
          this._conclusoes.update((lista) => lista.filter((item) => item.id !== conclusao?.id));
        }
        throw erro;
      }
    }

    return criadas;
  }

  /** Conclui uma missão coletiva para todos os alunos ativos da turma. */
  async concluirParaTurma(missaoId: string, autor: Usuario): Promise<MissaoAluno[]> {
    const missao = this.porId(missaoId);
    if (!missao) throw new Error('Missão não encontrada.');
    if (missao.tipo !== 'turma') {
      throw new Error('Esta missão é individual; selecione os alunos concluintes.');
    }

    const alunoIds = this.alunos
      .porTurma(missao.turmaId)
      .filter((aluno) => aluno.ativo)
      .map((aluno) => aluno.id);
    return this.concluir(missaoId, alunoIds, autor);
  }

  /** Revoga uma conclusão, estornando XP e moedas quando aplicável. */
  async revogar(conclusaoId: string, autor: Usuario): Promise<void> {
    const conclusao = this._conclusoes().find((item) => item.id === conclusaoId);
    if (!conclusao) throw new Error('Conclusão de missão não encontrada.');

    await this.repoConclusoes.remove(conclusao.id);
    this._conclusoes.update((lista) => lista.filter((item) => item.id !== conclusao.id));

    const chave = `missao:${conclusao.id}`;
    const eventoXp = this.gamificacao.eventos().find((evento) => evento.idempotencyKey === chave);
    if (eventoXp && !this.gamificacao.estaEstornado(eventoXp.id)) {
      await this.gamificacao.estornar(eventoXp.id, autor);
    }

    const movimentacao = this.moedas.movimentacoes().find((item) => item.idempotencyKey === chave);
    if (movimentacao && !this.moedas.estaEstornada(movimentacao.id)) {
      await this.moedas.estornar(movimentacao.id, autor.nome);
    }

    this.auditoria.registrar(
      'missao.revogada',
      'Missao',
      conclusao.missaoId,
      `${conclusao.missaoNome} do aluno ${conclusao.alunoId}.`,
    );
  }

  async removerMissao(id: string, autor: Usuario): Promise<void> {
    const missao = this.porId(id);
    if (!missao) return;

    for (const conclusao of this.conclusoesDaMissao(id)) {
      await this.revogar(conclusao.id, autor);
    }
    await this.repoMissoes.remove(id);
    this._missoes.update((lista) => lista.filter((item) => item.id !== id));
    this.auditoria.registrar('missao.excluida', 'Missao', id, missao.nome);
  }

  async removerTodas(autor: Usuario): Promise<void> {
    for (const missao of [...this._missoes()]) {
      await this.removerMissao(missao.id, autor);
    }
    this.auditoria.registrar('missao.excluidas-todas', 'Missao', null, null);
  }

  private async concederRecompensas(
    missao: Missao,
    conclusao: MissaoAluno,
    autor: Usuario,
  ): Promise<void> {
    const chave = `missao:${conclusao.id}`;
    const descricao = `🧩 Missão: ${missao.nome}`;

    if (missao.xpRecompensa > 0) {
      await this.gamificacao.registrarBonus(
        conclusao.alunoId,
        missao.xpRecompensa,
        descricao,
        autor,
        chave,
        missao.indicador,
        {
          turmaId: missao.turmaId,
          disciplinaId: missao.disciplinaId,
        },
      );
    }

    if (missao.moedasRecompensa > 0) {
      await this.moedas.ajustar({
        alunoId: conclusao.alunoId,
        turmaId: missao.turmaId,
        delta: missao.moedasRecompensa,
        origem: 'recompensa',
        descricao,
        autorId: autor.id,
        autorNome: autor.nome,
        idempotencyKey: chave,
        estornoDe: null,
        referenciaId: conclusao.id,
      });
    }

    this.auditoria.registrar(
      'missao.concluida',
      'Missao',
      missao.id,
      `${missao.nome} para ${conclusao.alunoId}.`,
    );
  }

  private garantirMissaoValida(dados: DadosMissao, idAtual?: string): void {
    const erros = this.validar(dados, idAtual);
    if (erros.length) throw new Error(erros.join('\n'));
  }

  private normalizarMissao(dados: DadosMissao): DadosMissao {
    return {
      nome: dados.nome.trim(),
      descricao: dados.descricao.trim(),
      instrucoes: dados.instrucoes.trim(),
      tipo: dados.tipo,
      turmaId: dados.turmaId,
      disciplinaId: dados.disciplinaId,
      indicador: dados.indicador.trim().toLowerCase(),
      xpRecompensa: Number(dados.xpRecompensa),
      moedasRecompensa: Number(dados.moedasRecompensa),
      status: dados.status,
      inicioEm: dados.inicioEm || null,
      fimEm: dados.fimEm || null,
    };
  }

  private ordenarMissoes(lista: Missao[]): Missao[] {
    return [...lista].sort((primeira, segunda) =>
      primeira.nome.localeCompare(segunda.nome, 'pt-BR'),
    );
  }

  private ordenarConclusoes(lista: MissaoAluno[]): MissaoAluno[] {
    return [...lista].sort((primeira, segunda) =>
      segunda.criadoEm.localeCompare(primeira.criadoEm),
    );
  }
}
