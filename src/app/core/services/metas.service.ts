import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import { Usuario } from '../models/usuario.model';
import {
  DadosMeta,
  Meta,
  MetaAluno,
  ProgressoMetaAluno,
  classeStatusMeta,
  normalizarIndicador,
  percentualMeta,
  rotuloStatusMeta,
  statusMetaAluno,
  validarMeta,
} from '../models/missoes-metas.model';
import { EventoXp } from '../models/gamificacao.model';
import { AlunosService } from './alunos.service';
import { AuditoriaService } from './auditoria.service';
import { GamificacaoService } from './gamificacao.service';
import { MoedasService } from './moedas.service';

/**
 * Indicadores e metas (RF-018).
 *
 * O progresso é calculado a partir dos eventos de XP já registrados: cada ação
 * leva o seu indicador para o histórico. A equipe valida e concede a recompensa
 * quando o aluno atinge o alvo; a concessão é idempotente por aluno/meta e pode
 * ser revogada com estorno de XP e moedas, preservando a auditoria.
 */
@Injectable({ providedIn: 'root' })
export class MetasService {
  private readonly repoMetas: Repository<Meta> = inject(RepositoryFactory).create<Meta>(
    'turmalina.metas',
    () => ({
      nome: '',
      descricao: '',
      turmaId: '',
      disciplinaId: '',
      indicador: '',
      quantidade: 1,
      recompensaXp: 0,
      recompensaMoedas: 0,
      ativa: true,
    }),
  );
  private readonly repoConcessoes: Repository<MetaAluno> = inject(
    RepositoryFactory,
  ).create<MetaAluno>('turmalina.metas-aluno', () => ({
    metaId: '',
    metaNome: '',
    alunoId: '',
    turmaId: '',
    disciplinaId: '',
    indicador: '',
    quantidade: 1,
    recompensaXp: 0,
    recompensaMoedas: 0,
    autorId: null,
    autorNome: '',
    idempotencyKey: '',
  }));
  private readonly alunos = inject(AlunosService);
  private readonly gamificacao = inject(GamificacaoService);
  private readonly moedas = inject(MoedasService);
  private readonly auditoria = inject(AuditoriaService);

  private readonly _metas = signal<Meta[]>([]);
  private readonly _concessoes = signal<MetaAluno[]>([]);
  private carregado = false;

  readonly metas = this._metas.asReadonly();
  readonly concessoes = this._concessoes.asReadonly();
  readonly totalMetas = computed(() => this._metas().length);
  readonly totalConcessoes = computed(() => this._concessoes().length);

  async load(): Promise<void> {
    if (this.carregado) return;

    await Promise.all([this.alunos.load(), this.gamificacao.load(), this.moedas.load()]);
    const [metas, concessoes] = await Promise.all([
      this.repoMetas.list(),
      this.repoConcessoes.list(),
    ]);

    this._metas.set(this.ordenarMetas(metas));
    this._concessoes.set(this.ordenarConcessoes(concessoes));
    this.carregado = true;
  }

  porId(id: string): Meta | undefined {
    return this._metas().find((meta) => meta.id === id);
  }

  metasDaTurma(turmaId: string): Meta[] {
    return this._metas().filter((meta) => meta.turmaId === turmaId);
  }

  metasDaTurmaEDisciplina(turmaId: string, disciplinaId: string): Meta[] {
    return this._metas().filter(
      (meta) => meta.turmaId === turmaId && meta.disciplinaId === disciplinaId,
    );
  }

  metasAtivasDaTurma(turmaId: string): Meta[] {
    return this.metasDaTurma(turmaId).filter((meta) => meta.ativa);
  }

  metasAtivasDaTurmaEDisciplina(turmaId: string, disciplinaId: string): Meta[] {
    return this.metasDaTurmaEDisciplina(turmaId, disciplinaId).filter((meta) => meta.ativa);
  }

  concessoesDaMeta(metaId: string): MetaAluno[] {
    return this._concessoes().filter((concessao) => concessao.metaId === metaId);
  }

  concessaoDoAluno(metaId: string, alunoId: string): MetaAluno | undefined {
    return this._concessoes().find(
      (concessao) => concessao.metaId === metaId && concessao.alunoId === alunoId,
    );
  }

  alunoTemMeta(metaId: string, alunoId: string): boolean {
    return this.concessaoDoAluno(metaId, alunoId) !== undefined;
  }

  /**
   * Quantidade de ocorrências positivas do indicador para o aluno na turma e
   * disciplina. Estornos e lançamentos negativos não contam para a meta.
   */
  quantidadeIndicador(
    alunoId: string,
    turmaId: string,
    disciplinaId: string,
    indicador: string,
  ): number {
    const chave = normalizarIndicador(indicador);
    if (!chave) return 0;

    const estornados = new Set(
      this.gamificacao
        .eventos()
        .map((evento) => evento.estornoDe)
        .filter((eventoId): eventoId is string => Boolean(eventoId)),
    );

    return this.gamificacao
      .eventos()
      .filter(
        (evento) =>
          evento.alunoId === alunoId &&
          evento.turmaId === turmaId &&
          evento.disciplinaId === disciplinaId &&
          normalizarIndicador(evento.indicador) === chave &&
          evento.deltaXp > 0 &&
          !evento.estornoDe &&
          !estornados.has(evento.id),
      ).length;
  }

  progressoDoAluno(meta: Meta, alunoId: string): ProgressoMetaAluno {
    const quantidadeAtual = this.quantidadeIndicador(
      alunoId,
      meta.turmaId,
      meta.disciplinaId,
      meta.indicador,
    );
    const concedida = this.alunoTemMeta(meta.id, alunoId);
    const status = statusMetaAluno(quantidadeAtual, meta.quantidade, concedida);
    return {
      meta,
      alunoId,
      quantidadeAtual,
      percentual: percentualMeta(quantidadeAtual, meta.quantidade),
      status,
    };
  }

  progressosDaMeta(meta: Meta): ProgressoMetaAluno[] {
    return this.alunos
      .porTurma(meta.turmaId)
      .filter((aluno) => aluno.ativo)
      .sort((primeiro, segundo) => primeiro.nome.localeCompare(segundo.nome, 'pt-BR'))
      .map((aluno) => this.progressoDoAluno(meta, aluno.id));
  }

  /** Metas ativas do contexto que possuem ao menos um aluno elegível. */
  metasComAlunosElegiveis(
    turmaId: string,
    disciplinaId: string,
  ): { meta: Meta; progressos: ProgressoMetaAluno[] }[] {
    return this.metasAtivasDaTurmaEDisciplina(turmaId, disciplinaId)
      .map((meta) => ({
        meta,
        progressos: this.progressosDaMeta(meta).filter(
          (progresso) => progresso.status === 'disponivel',
        ),
      }))
      .filter((item) => item.progressos.length > 0);
  }

  metasDoAluno(alunoId: string, turmaId: string): ProgressoMetaAluno[] {
    return this.metasAtivasDaTurma(turmaId)
      .map((meta) => this.progressoDoAluno(meta, alunoId))
      .sort((primeiro, segundo) => primeiro.meta.nome.localeCompare(segundo.meta.nome, 'pt-BR'));
  }

  validar(dados: DadosMeta, idAtual?: string): string[] {
    return validarMeta(dados, this._metas(), idAtual);
  }

  async criarMeta(dados: DadosMeta): Promise<Meta> {
    await this.load();
    this.garantirMetaValida(dados);
    const meta = await this.repoMetas.create(this.normalizarMeta(dados));
    this._metas.update((lista) => this.ordenarMetas([...lista, meta]));
    this.auditoria.registrar('meta.criada', 'Meta', meta.id, meta.nome);
    return meta;
  }

  async atualizarMeta(id: string, dados: DadosMeta): Promise<Meta> {
    await this.load();
    this.garantirMetaValida(dados, id);
    const meta = await this.repoMetas.update(id, this.normalizarMeta(dados));
    this._metas.update((lista) =>
      this.ordenarMetas(lista.map((item) => (item.id === id ? meta : item))),
    );
    this.auditoria.registrar('meta.atualizada', 'Meta', id, meta.nome);
    return meta;
  }

  async alternarAtiva(id: string): Promise<void> {
    const meta = this.porId(id);
    if (!meta) return;
    const atualizada = await this.repoMetas.update(id, { ativa: !meta.ativa });
    this._metas.update((lista) =>
      this.ordenarMetas(lista.map((item) => (item.id === id ? atualizada : item))),
    );
    this.auditoria.registrar(
      atualizada.ativa ? 'meta.ativada' : 'meta.desativada',
      'Meta',
      id,
      atualizada.nome,
    );
  }

  /**
   * Concede a recompensa de uma meta ao aluno. Retorna `null` quando a meta já
   * foi concedida (idempotência por aluno/meta).
   */
  async conceder(metaId: string, alunoId: string, autor: Usuario): Promise<MetaAluno | null> {
    await this.load();

    const meta = this.porId(metaId);
    if (!meta) throw new Error('Meta não encontrada.');
    if (!meta.ativa) throw new Error('Esta meta está desativada.');
    if (this.alunoTemMeta(metaId, alunoId)) return null;

    const aluno = this.alunos.alunos().find((item) => item.id === alunoId);
    if (!aluno || !aluno.ativo || aluno.turmaId !== meta.turmaId) {
      throw new Error('O aluno não pertence à turma desta meta.');
    }

    const quantidadeAtual = this.quantidadeIndicador(
      alunoId,
      meta.turmaId,
      meta.disciplinaId,
      meta.indicador,
    );
    if (quantidadeAtual < meta.quantidade) {
      throw new Error('O aluno ainda não atingiu o critério desta meta.');
    }

    const idempotencyKey = `meta:${meta.id}:${alunoId}`;
    const jaRegistrada = this._concessoes().some(
      (concessao) => concessao.idempotencyKey === idempotencyKey,
    );
    if (jaRegistrada) return null;

    let concessao: MetaAluno | null = null;
    try {
      concessao = await this.repoConcessoes.create({
        metaId: meta.id,
        metaNome: meta.nome,
        alunoId,
        turmaId: meta.turmaId,
        disciplinaId: meta.disciplinaId,
        indicador: meta.indicador,
        quantidade: meta.quantidade,
        recompensaXp: meta.recompensaXp,
        recompensaMoedas: meta.recompensaMoedas,
        autorId: autor.id,
        autorNome: autor.nome,
        idempotencyKey,
      });
      this._concessoes.update((lista) =>
        this.ordenarConcessoes([...lista, concessao as MetaAluno]),
      );

      await this.concederRecompensas(concessao, autor);
      return concessao;
    } catch (erro) {
      if (concessao) {
        await this.repoConcessoes.remove(concessao.id);
        this._concessoes.update((lista) => lista.filter((item) => item.id !== concessao?.id));
      }
      throw erro;
    }
  }

  /** Concede para todos os alunos que já atingiram o critério da meta. */
  async concederParaElegiveis(metaId: string, autor: Usuario): Promise<MetaAluno[]> {
    await this.load();
    const meta = this.porId(metaId);
    if (!meta) throw new Error('Meta não encontrada.');

    const elegiveis = this.progressosDaMeta(meta).filter(
      (progresso) => progresso.status === 'disponivel',
    );
    const concessoes: MetaAluno[] = [];
    for (const progresso of elegiveis) {
      const concessao = await this.conceder(metaId, progresso.alunoId, autor);
      if (concessao) concessoes.push(concessao);
    }
    return concessoes;
  }

  /** Revoga uma concessão, estornando XP e moedas quando aplicável. */
  async revogar(concessaoId: string, autor: Usuario): Promise<void> {
    const concessao = this._concessoes().find((item) => item.id === concessaoId);
    if (!concessao) throw new Error('Concessão de meta não encontrada.');

    await this.repoConcessoes.remove(concessao.id);
    this._concessoes.update((lista) => lista.filter((item) => item.id !== concessao.id));

    const chave = `meta:${concessao.id}`;
    const eventoXp = this.gamificacao.eventos().find((evento) => evento.idempotencyKey === chave);
    if (eventoXp && !this.gamificacao.estaEstornado(eventoXp.id)) {
      await this.gamificacao.estornar(eventoXp.id, autor);
    }

    const movimentacao = this.moedas.movimentacoes().find((item) => item.idempotencyKey === chave);
    if (movimentacao && !this.moedas.estaEstornada(movimentacao.id)) {
      await this.moedas.estornar(movimentacao.id, autor.nome);
    }

    this.auditoria.registrar(
      'meta.revogada',
      'Meta',
      concessao.metaId,
      `${concessao.metaNome} do aluno ${concessao.alunoId}.`,
    );
  }

  async removerMeta(id: string, autor: Usuario): Promise<void> {
    const meta = this.porId(id);
    if (!meta) return;

    for (const concessao of this.concessoesDaMeta(id)) {
      await this.revogar(concessao.id, autor);
    }
    await this.repoMetas.remove(id);
    this._metas.update((lista) => lista.filter((item) => item.id !== id));
    this.auditoria.registrar('meta.excluida', 'Meta', id, meta.nome);
  }

  async removerTodas(autor: Usuario): Promise<void> {
    for (const meta of [...this._metas()]) {
      await this.removerMeta(meta.id, autor);
    }
    this.auditoria.registrar('meta.excluidas-todas', 'Meta', null, null);
  }

  formatarStatus(progresso: ProgressoMetaAluno): string {
    return rotuloStatusMeta(progresso.status);
  }

  classeStatus(progresso: ProgressoMetaAluno): string {
    return classeStatusMeta(progresso.status);
  }

  private async concederRecompensas(concessao: MetaAluno, autor: Usuario): Promise<void> {
    const chave = `meta:${concessao.id}`;
    const descricao = `🎯 Meta: ${concessao.metaNome}`;

    if (concessao.recompensaXp > 0) {
      await this.gamificacao.registrarBonus(
        concessao.alunoId,
        concessao.recompensaXp,
        descricao,
        autor,
        chave,
        '',
        {
          turmaId: concessao.turmaId,
          disciplinaId: concessao.disciplinaId,
        },
      );
    }

    if (concessao.recompensaMoedas > 0) {
      await this.moedas.ajustar({
        alunoId: concessao.alunoId,
        turmaId: concessao.turmaId,
        delta: concessao.recompensaMoedas,
        origem: 'recompensa',
        descricao,
        autorId: autor.id,
        autorNome: autor.nome,
        idempotencyKey: chave,
        estornoDe: null,
        referenciaId: concessao.id,
      });
    }

    this.auditoria.registrar(
      'meta.concedida',
      'Meta',
      concessao.metaId,
      `${concessao.metaNome} para ${concessao.alunoId}.`,
    );
  }

  private garantirMetaValida(dados: DadosMeta, idAtual?: string): void {
    const erros = this.validar(dados, idAtual);
    if (erros.length) throw new Error(erros.join('\n'));
  }

  private normalizarMeta(dados: DadosMeta): DadosMeta {
    return {
      nome: dados.nome.trim(),
      descricao: dados.descricao.trim(),
      turmaId: dados.turmaId,
      disciplinaId: dados.disciplinaId,
      indicador: normalizarIndicador(dados.indicador),
      quantidade: Number(dados.quantidade),
      recompensaXp: Number(dados.recompensaXp),
      recompensaMoedas: Number(dados.recompensaMoedas),
      ativa: dados.ativa,
    };
  }

  private ordenarMetas(lista: Meta[]): Meta[] {
    return [...lista].sort((primeira, segunda) =>
      primeira.nome.localeCompare(segunda.nome, 'pt-BR'),
    );
  }

  private ordenarConcessoes(lista: MetaAluno[]): MetaAluno[] {
    return [...lista].sort((primeira, segunda) =>
      segunda.criadoEm.localeCompare(primeira.criadoEm),
    );
  }
}
