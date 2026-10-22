import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import { Usuario } from '../models/usuario.model';
import {
  ACOES_GAMIFICACAO_PADRAO,
  AcaoGamificacao,
  DadosAcaoGamificacao,
  EventoXp,
  criarChaveIdempotencia,
  formatarDeltaXp,
  nivelPorXp,
  validarAcaoGamificacao,
} from '../models/gamificacao.model';
import { AlunosService } from './alunos.service';
import { AuditoriaService } from './auditoria.service';
import { AuthService } from './auth.service';
import { MoedasService } from './moedas.service';

const MARCADOR_SEMENTE = 'turmalina.gamificacao.inicializado';

/**
 * Gamificação: catálogo de ações e lançamentos de XP (RF-015).
 *
 * O XP é sempre consequência de um lançamento registrado. O saldo do aluno é
 * recalculado a partir do histórico, e correções acontecem por estorno — nunca
 * por exclusão silenciosa. O XP não interfere em notas, frequência ou aprovação.
 */
@Injectable({ providedIn: 'root' })
export class GamificacaoService {
  private readonly repoAcoes: Repository<AcaoGamificacao> = inject(
    RepositoryFactory,
  ).create<AcaoGamificacao>('turmalina.acoes-gamificacao', () => ({
    nome: '',
    icone: 'star',
    valorXp: 0,
    indicador: 'geral',
    ativa: true,
  }));
  private readonly repoEventos: Repository<EventoXp> = inject(RepositoryFactory).create<EventoXp>(
    'turmalina.eventos-xp',
    () => ({
      alunoId: '',
      turmaId: null,
      acaoId: null,
      acaoNome: '',
      deltaXp: 0,
      origem: 'manual',
      autorId: '',
      autorNome: '',
      idempotencyKey: '',
      estornoDe: null,
    }),
  );
  private readonly alunos = inject(AlunosService);
  private readonly auditoria = inject(AuditoriaService);
  private readonly moedas = inject(MoedasService);
  private readonly auth = inject(AuthService);

  private readonly _acoes = signal<AcaoGamificacao[]>([]);
  private readonly _eventos = signal<EventoXp[]>([]);
  private carregado = false;

  readonly acoes = this._acoes.asReadonly();
  readonly eventos = this._eventos.asReadonly();
  readonly totalAcoes = computed(() => this._acoes().length);
  readonly totalEventos = computed(() => this._eventos().length);
  readonly acoesAtivas = computed(() => this._acoes().filter((acao) => acao.ativa));

  async load(): Promise<void> {
    if (this.carregado) return;

    await this.alunos.load();
    await this.moedas.load();
    const [acoes, eventos] = await Promise.all([this.repoAcoes.list(), this.repoEventos.list()]);

    // O catálogo de ações é lido e semeado apenas pela equipe (RLS:
    // `acoes_gamificacao_leitura`/`_escrita` exigem `eh_equipe`). Para o aluno o
    // catálogo chega vazio e não pode ser criado; o XP dele vem de `eventos_xp`.
    const podeAdministrarCatalogo = this.auth.temPapel('administrador', 'professor');
    const jaInicializado = localStorage.getItem(MARCADOR_SEMENTE) === '1';

    if (!podeAdministrarCatalogo) {
      this._acoes.set([]);
    } else if (acoes.length || jaInicializado) {
      this._acoes.set(this.ordenarAcoes(acoes));
    } else {
      this._acoes.set(await this.semearAcoes());
      localStorage.setItem(MARCADOR_SEMENTE, '1');
    }

    this._eventos.set(this.ordenarEventos(eventos));
    this.carregado = true;
  }

  porId(id: string): AcaoGamificacao | undefined {
    return this._acoes().find((acao) => acao.id === id);
  }

  validar(dados: DadosAcaoGamificacao, idAtual?: string): string[] {
    return validarAcaoGamificacao(dados, this._acoes(), idAtual);
  }

  async criarAcao(dados: DadosAcaoGamificacao): Promise<AcaoGamificacao> {
    this.garantirAcaoValida(dados);
    const acao = await this.repoAcoes.create(this.normalizarAcao(dados));
    this._acoes.update((lista) => this.ordenarAcoes([...lista, acao]));
    this.auditoria.registrar('acao.criada', 'AcaoGamificacao', acao.id, acao.nome);
    return acao;
  }

  async atualizarAcao(id: string, dados: DadosAcaoGamificacao): Promise<AcaoGamificacao> {
    this.garantirAcaoValida(dados, id);
    const acao = await this.repoAcoes.update(id, this.normalizarAcao(dados));
    this._acoes.update((lista) =>
      this.ordenarAcoes(lista.map((item) => (item.id === id ? acao : item))),
    );
    this.auditoria.registrar('acao.atualizada', 'AcaoGamificacao', id, acao.nome);
    return acao;
  }

  async alternarAtiva(id: string): Promise<void> {
    const acao = this.porId(id);
    if (!acao) return;
    const atualizada = await this.repoAcoes.update(id, { ativa: !acao.ativa });
    this._acoes.update((lista) => lista.map((item) => (item.id === id ? atualizada : item)));
    this.auditoria.registrar(
      atualizada.ativa ? 'acao.ativada' : 'acao.desativada',
      'AcaoGamificacao',
      id,
      atualizada.nome,
    );
  }

  async removerAcao(id: string): Promise<void> {
    const acao = this.porId(id);
    await this.repoAcoes.remove(id);
    this._acoes.update((lista) => lista.filter((item) => item.id !== id));
    if (acao) {
      this.auditoria.registrar('acao.excluida', 'AcaoGamificacao', id, acao.nome);
    }
  }

  async removerTodasAcoes(): Promise<void> {
    for (const acao of this._acoes()) {
      await this.repoAcoes.remove(acao.id);
    }
    this._acoes.set([]);
    localStorage.setItem(MARCADOR_SEMENTE, '1');
    this.auditoria.registrar('acao.excluidas-todas', 'AcaoGamificacao', null, null);
  }

  /**
   * Registra uma ação para um ou mais alunos.
   *
   * `chaveLote` garante idempotência: reenviar o mesmo lote não concede XP de
   * novo, mesmo com clique duplo ou instabilidade de rede.
   */
  async registrarPontuacao(
    acaoId: string,
    alunoIds: string[],
    autor: Usuario,
    chaveLote: string = criarChaveIdempotencia(),
  ): Promise<EventoXp[]> {
    await this.load();

    const acao = this.porId(acaoId);
    if (!acao) throw new Error('Ação de gamificação não encontrada.');
    if (!acao.ativa) throw new Error('Esta ação está desativada e não pode ser aplicada.');

    const idsUnicos = [...new Set(alunoIds)];
    if (!idsUnicos.length) throw new Error('Selecione ao menos um aluno.');

    const alunosPorId = new Map(this.alunos.alunos().map((aluno) => [aluno.id, aluno]));
    const criados: EventoXp[] = [];

    for (const alunoId of idsUnicos) {
      const aluno = alunosPorId.get(alunoId);
      if (!aluno) continue;

      const idempotencyKey = `${chaveLote}:${alunoId}`;
      const jaRegistrado = this._eventos().some(
        (evento) => evento.idempotencyKey === idempotencyKey,
      );
      if (jaRegistrado) continue;

      const evento = await this.repoEventos.create({
        alunoId: aluno.id,
        turmaId: aluno.turmaId || null,
        acaoId: acao.id,
        acaoNome: acao.nome,
        deltaXp: acao.valorXp,
        origem: 'manual',
        autorId: autor.id,
        autorNome: autor.nome,
        idempotencyKey,
        estornoDe: null,
      });
      this._eventos.update((lista) => this.ordenarEventos([...lista, evento]));
      await this.ajustarXpDoAluno(aluno.id, acao.valorXp);
      criados.push(evento);
    }

    if (criados.length) {
      this.auditoria.registrar(
        'xp.concedido',
        'EventoXp',
        null,
        `${acao.nome} (${formatarDeltaXp(acao.valorXp)} XP) para ${criados.length} aluno(s).`,
      );
    }

    return criados;
  }

  /** Corrige um lançamento criando um evento de estorno; o original é preservado. */
  async estornar(eventoId: string, autor: Usuario): Promise<EventoXp> {
    const original = this._eventos().find((evento) => evento.id === eventoId);
    if (!original) throw new Error('Lançamento de XP não encontrado.');
    if (original.estornoDe) throw new Error('Um estorno não pode ser estornado.');

    const jaEstornado = this._eventos().some((evento) => evento.estornoDe === original.id);
    if (jaEstornado) throw new Error('Este lançamento já foi estornado.');

    const estorno = await this.repoEventos.create({
      alunoId: original.alunoId,
      turmaId: original.turmaId,
      acaoId: original.acaoId,
      acaoNome: original.acaoNome,
      deltaXp: -original.deltaXp,
      origem: 'estorno',
      autorId: autor.id,
      autorNome: autor.nome,
      idempotencyKey: `estorno:${original.id}`,
      estornoDe: original.id,
    });

    this._eventos.update((lista) => this.ordenarEventos([...lista, estorno]));
    await this.ajustarXpDoAluno(original.alunoId, estorno.deltaXp);
    this.auditoria.registrar(
      'xp.estornado',
      'EventoXp',
      original.id,
      `${original.acaoNome} (${formatarDeltaXp(estorno.deltaXp)} XP) para o aluno ${original.alunoId}.`,
    );
    return estorno;
  }

  eventosDoAluno(alunoId: string): EventoXp[] {
    return this.ordenarEventos(
      this._eventos().filter((evento) => evento.alunoId === alunoId),
    );
  }

  eventosDaTurma(turmaId: string): EventoXp[] {
    return this.ordenarEventos(
      this._eventos().filter((evento) => evento.turmaId === turmaId),
    );
  }

  estaEstornado(eventoId: string): boolean {
    return this._eventos().some((evento) => evento.estornoDe === eventoId);
  }

  /** Recalcula o XP armazenado do aluno a partir de todo o histórico. */
  async recalcularXpDosAlunos(alunoIds: string[]): Promise<void> {
    for (const alunoId of new Set(alunoIds)) {
      const saldo = this._eventos()
        .filter((evento) => evento.alunoId === alunoId)
        .reduce((total, evento) => total + evento.deltaXp, 0);
      const aluno = this.alunos.alunos().find((item) => item.id === alunoId);
      if (!aluno) continue;
      if (aluno.xp !== Math.max(0, saldo)) {
        await this.alunos.update(alunoId, { xp: Math.max(0, saldo) });
      }
    }
  }

  /** Remove lançamentos de turmas específicas e recalcula o XP dos afetados. */
  async removerEventosDeTurmas(): Promise<void> {
    const vinculados = this._eventos().filter((evento) => evento.turmaId !== null);
    const alunosAfetados = [...new Set(vinculados.map((evento) => evento.alunoId))];

    for (const evento of vinculados) {
      await this.repoEventos.remove(evento.id);
    }
    if (!vinculados.length) return;

    this._eventos.update((lista) => lista.filter((evento) => evento.turmaId === null));
    await this.recalcularXpDosAlunos(alunosAfetados);
    this.auditoria.registrar('xp.removidos-por-turma', 'EventoXp', null, null);
  }

  async removerTodosEventos(): Promise<void> {
    for (const evento of this._eventos()) {
      await this.repoEventos.remove(evento.id);
    }
    this._eventos.set([]);
    this.auditoria.registrar('xp.removidos-todos', 'EventoXp', null, null);
  }

  async removerTudo(): Promise<void> {
    const alunosAfetados = [...new Set(this._eventos().map((evento) => evento.alunoId))];
    await this.removerTodosEventos();
    await this.removerTodasAcoes();
    await this.recalcularXpDosAlunos(alunosAfetados);
  }

  private garantirAcaoValida(dados: DadosAcaoGamificacao, idAtual?: string): void {
    const erros = this.validar(dados, idAtual);
    if (erros.length) throw new Error(erros.join('\n'));
  }

  private normalizarAcao(dados: DadosAcaoGamificacao): DadosAcaoGamificacao {
    return {
      nome: dados.nome.trim(),
      icone: dados.icone.trim(),
      valorXp: Number(dados.valorXp),
      indicador: dados.indicador.trim(),
      ativa: dados.ativa,
    };
  }

  private async ajustarXpDoAluno(alunoId: string, deltaXp: number): Promise<void> {
    const aluno = this.alunos.alunos().find((item) => item.id === alunoId);
    if (!aluno) return;
    const novoXp = Math.max(0, aluno.xp + deltaXp);
    if (novoXp !== aluno.xp) {
      await this.alunos.update(alunoId, { xp: novoXp });
    }
    await this.premiarNiveisAlcancados(alunoId, nivelPorXp(aluno.xp), nivelPorXp(novoXp));
  }

  /**
   * Concede moedas por cada nível novo alcançado (RF-016), de forma idempotente
   * por aluno/nível. A subida de XP nunca altera notas, frequência ou aprovação.
   */
  private async premiarNiveisAlcancados(
    alunoId: string,
    nivelAntes: number,
    nivelDepois: number,
  ): Promise<void> {
    if (nivelDepois <= nivelAntes) return;
    const aluno = this.alunos.alunos().find((item) => item.id === alunoId);
    const turmaId = aluno?.turmaId || null;
    for (let nivel = nivelAntes + 1; nivel <= nivelDepois; nivel += 1) {
      await this.moedas.concederPorNivel(alunoId, nivel, turmaId);
    }
  }

  /**
   * Lança um bônus de XP originado por outro recurso (por exemplo, uma conquista
   * desbloqueada). O bônus entra no histórico como qualquer outro lançamento e
   * é idempotente pela chave informada.
   */
  async registrarBonus(
    alunoId: string,
    deltaXp: number,
    descricao: string,
    autor: Usuario,
    chaveIdempotencia: string,
  ): Promise<EventoXp | null> {
    await this.load();
    if (deltaXp === 0) return null;

    const aluno = this.alunos.alunos().find((item) => item.id === alunoId);
    if (!aluno) return null;

    const jaRegistrado = this._eventos().some(
      (evento) => evento.idempotencyKey === chaveIdempotencia,
    );
    if (jaRegistrado) return null;

    const evento = await this.repoEventos.create({
      alunoId,
      turmaId: aluno.turmaId || null,
      acaoId: null,
      acaoNome: descricao,
      deltaXp,
      origem: 'sistema',
      autorId: autor.id,
      autorNome: autor.nome,
      idempotencyKey: chaveIdempotencia,
      estornoDe: null,
    });
    this._eventos.update((lista) => this.ordenarEventos([...lista, evento]));
    await this.ajustarXpDoAluno(alunoId, deltaXp);
    this.auditoria.registrar(
      'xp.concedido',
      'EventoXp',
      evento.id,
      `${descricao} (${formatarDeltaXp(deltaXp)} XP).`,
    );
    return evento;
  }

  /**
   * Remove do histórico os lançamentos identificados por suas chaves de
   * idempotência. Usado quando a origem do bônus deixa de existir (por exemplo,
   * uma conquista excluída); o XP dos alunos afetados deve ser recalculado em
   * seguida.
   */
  async removerEventosPorChave(chavesIdempotencia: string[]): Promise<void> {
    if (!chavesIdempotencia.length) return;
    const chaves = new Set(chavesIdempotencia);
    const descartados = this._eventos().filter(
      (evento) => evento.idempotencyKey !== null && chaves.has(evento.idempotencyKey),
    );
    if (!descartados.length) return;

    for (const evento of descartados) {
      await this.repoEventos.remove(evento.id);
    }
    this._eventos.update((lista) =>
      lista.filter((evento) => evento.idempotencyKey === null || !chaves.has(evento.idempotencyKey)),
    );
  }

  private async semearAcoes(): Promise<AcaoGamificacao[]> {
    const criadas: AcaoGamificacao[] = [];
    for (const dados of ACOES_GAMIFICACAO_PADRAO) {
      criadas.push(await this.repoAcoes.create(dados));
    }
    return this.ordenarAcoes(criadas);
  }

  private ordenarAcoes(lista: AcaoGamificacao[]): AcaoGamificacao[] {
    return [...lista].sort((primeira, segunda) =>
      primeira.nome.localeCompare(segunda.nome, 'pt-BR'),
    );
  }

  private ordenarEventos(lista: EventoXp[]): EventoXp[] {
    return [...lista].sort((primeiro, segundo) =>
      segundo.criadoEm.localeCompare(primeiro.criadoEm),
    );
  }
}
