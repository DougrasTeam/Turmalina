import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import {
  CriterioPlacar,
  DadosEquipe,
  Equipe,
  EquipeMembro,
  LinhaPlacarEquipe,
  membrosParaPlacar,
  pontuarEquipe,
  validarEquipe,
} from '../models/equipes.model';
import { Usuario } from '../models/usuario.model';
import { AlunosService } from './alunos.service';
import { AuditoriaService } from './auditoria.service';
import { GamificacaoService } from './gamificacao.service';
import { PeriodosLetivosService } from './periodos-letivos.service';

/**
 * Equipes de gamificação (RF-017).
 *
 * A equipe existe dentro de um contexto de turma e período. Os alunos são
 * associados por vínculos com vigência: transferir um aluno encerra o vínculo
 * anterior (preservando o histórico de XP) e abre um novo. O placar soma o XP
 * dos membros conforme o critério escolhido.
 */
@Injectable({ providedIn: 'root' })
export class EquipesService {
  private readonly repoEquipes: Repository<Equipe> = inject(
    RepositoryFactory,
  ).create<Equipe>('turmalina.equipes', () => ({
    nome: '',
    emoji: '🦁',
    cor: '#2563EB',
    ativa: true,
    turmaId: '',
    periodoLetivoId: null,
  }));
  private readonly repoMembros: Repository<EquipeMembro> = inject(
    RepositoryFactory,
  ).create<EquipeMembro>('turmalina.equipe-membros', () => ({
    equipeId: '',
    equipeNome: '',
    alunoId: '',
    alunoNome: '',
    turmaId: '',
    periodoLetivoId: null,
    ativa: true,
    inicioEm: new Date().toISOString(),
    fimEm: null,
    autorId: null,
    autorNome: '',
  }));
  private readonly alunos = inject(AlunosService);
  private readonly periodos = inject(PeriodosLetivosService);
  private readonly gamificacao = inject(GamificacaoService);
  private readonly auditoria = inject(AuditoriaService);

  private readonly _equipes = signal<Equipe[]>([]);
  private readonly _membros = signal<EquipeMembro[]>([]);
  private readonly _criterioPlacar = signal<CriterioPlacar>('xp_acumulado');
  private carregado = false;

  readonly equipes = this._equipes.asReadonly();
  readonly membros = this._membros.asReadonly();
  readonly criterioPlacar = this._criterioPlacar.asReadonly();
  readonly equipesAtivas = computed(() => this._equipes().filter((equipe) => equipe.ativa));
  readonly totalEquipes = computed(() => this._equipes().length);
  readonly totalMembros = computed(() => this._membros().length);

  async load(): Promise<void> {
    if (this.carregado) return;

    await this.alunos.load();
    await this.periodos.load();
    await this.gamificacao.load();
    const [equipes, membros] = await Promise.all([
      this.repoEquipes.list(),
      this.repoMembros.list(),
    ]);
    this._equipes.set(this.ordenarEquipes(equipes));
    this._membros.set(this.ordenarMembros(membros));
    this.carregado = true;
  }

  porId(id: string): Equipe | undefined {
    return this._equipes().find((equipe) => equipe.id === id);
  }

  validar(dados: DadosEquipe, idAtual?: string): string[] {
    return validarEquipe(dados, this._equipes(), idAtual);
  }

  equipesDaTurma(turmaId: string, periodoLetivoId: string | null): Equipe[] {
    return this._equipes().filter(
      (equipe) => equipe.turmaId === turmaId && equipe.periodoLetivoId === periodoLetivoId,
    );
  }

  definirCriterioPlacar(criterio: CriterioPlacar): void {
    this._criterioPlacar.set(criterio);
  }

  membrosDaEquipe(equipeId: string, somenteAtivos = false): EquipeMembro[] {
    return this._membros().filter(
      (membro) => membro.equipeId === equipeId && (!somenteAtivos || membro.ativa),
    );
  }

  equipeAtivaDoAluno(
    alunoId: string,
    turmaId: string,
    periodoLetivoId: string | null,
  ): EquipeMembro | undefined {
    return this._membros().find(
      (membro) =>
        membro.alunoId === alunoId &&
        membro.turmaId === turmaId &&
        membro.periodoLetivoId === periodoLetivoId &&
        membro.ativa,
    );
  }

  historicoDoAluno(alunoId: string): EquipeMembro[] {
    return this.ordenarMembros(
      this._membros().filter((membro) => membro.alunoId === alunoId),
    );
  }

  async criarEquipe(dados: DadosEquipe): Promise<Equipe> {
    this.garantirEquipeValida(dados);
    const equipe = await this.repoEquipes.create(this.normalizarEquipe(dados));
    this._equipes.update((lista) => this.ordenarEquipes([...lista, equipe]));
    this.auditoria.registrar('equipe.criada', 'Equipe', equipe.id, equipe.nome);
    return equipe;
  }

  async atualizarEquipe(id: string, dados: DadosEquipe): Promise<Equipe> {
    this.garantirEquipeValida(dados, id);
    const equipe = await this.repoEquipes.update(id, this.normalizarEquipe(dados));
    this._equipes.update((lista) =>
      this.ordenarEquipes(lista.map((item) => (item.id === id ? equipe : item))),
    );
    this.auditoria.registrar('equipe.atualizada', 'Equipe', id, equipe.nome);
    return equipe;
  }

  async alternarAtiva(id: string): Promise<void> {
    const equipe = this.porId(id);
    if (!equipe) return;
    const atualizada = await this.repoEquipes.update(id, { ativa: !equipe.ativa });
    this._equipes.update((lista) => lista.map((item) => (item.id === id ? atualizada : item)));
    this.auditoria.registrar(
      atualizada.ativa ? 'equipe.ativada' : 'equipe.desativada',
      'Equipe',
      id,
      atualizada.nome,
    );
  }

  async removerEquipe(id: string): Promise<void> {
    const equipe = this.porId(id);
    if (!equipe) return;

    for (const membro of this.membrosDaEquipe(id)) {
      await this.repoMembros.remove(membro.id);
    }
    await this.repoEquipes.remove(id);

    this._membros.update((lista) => lista.filter((membro) => membro.equipeId !== id));
    this._equipes.update((lista) => lista.filter((item) => item.id !== id));
    this.auditoria.registrar('equipe.excluida', 'Equipe', id, equipe.nome);
  }

  /**
   * Associa um aluno a uma equipe dentro de uma turma/período.
   *
   * Se o aluno já tiver uma equipe ativa no mesmo contexto, ela é encerrada
   * (transferência) e o histórico é preservado.
   */
  async associarAluno(
    equipeId: string,
    alunoId: string,
    autor: Usuario,
  ): Promise<EquipeMembro> {
    await this.load();

    const equipe = this.porId(equipeId);
    if (!equipe) throw new Error('Equipe não encontrada.');
    if (!equipe.ativa) throw new Error('Esta equipe está desativada.');

    const aluno = this.alunos.alunos().find((item) => item.id === alunoId);
    if (!aluno) throw new Error('Aluno não encontrado.');
    if (aluno.turmaId !== equipe.turmaId) {
      throw new Error('O aluno não pertence à turma desta equipe.');
    }

    const vinculoAtual = this.equipeAtivaDoAluno(
      alunoId,
      equipe.turmaId,
      equipe.periodoLetivoId,
    );
    if (vinculoAtual?.equipeId === equipeId) {
      return vinculoAtual;
    }
    if (vinculoAtual) {
      await this.encerrarVinculo(vinculoAtual);
    }

    const membro = await this.repoMembros.create({
      equipeId: equipe.id,
      equipeNome: equipe.nome,
      alunoId,
      alunoNome: aluno.nome,
      turmaId: equipe.turmaId,
      periodoLetivoId: equipe.periodoLetivoId,
      ativa: true,
      inicioEm: new Date().toISOString(),
      fimEm: null,
      autorId: autor.id,
      autorNome: autor.nome,
    });
    this._membros.update((lista) => this.ordenarMembros([...lista, membro]));
    this.auditoria.registrar(
      vinculoAtual ? 'equipe.transferido' : 'equipe.associado',
      'Equipe',
      equipe.id,
      `${aluno.nome} → ${equipe.nome}.`,
    );
    return membro;
  }

  /** Encerra o vínculo ativo de um aluno, preservando o histórico. */
  async desassociarAluno(membroId: string): Promise<void> {
    const membro = this._membros().find((item) => item.id === membroId);
    if (!membro) return;
    await this.encerrarVinculo(membro);
    this.auditoria.registrar(
      'equipe.desassociado',
      'Equipe',
      membro.equipeId,
      `${membro.alunoNome} deixou ${membro.equipeNome}.`,
    );
  }

  /** Placar das equipes de uma turma/período, em ordem decrescente de XP. */
  placar(turmaId: string, periodoLetivoId: string | null): LinhaPlacarEquipe[] {
    const criterio = this._criterioPlacar();
    const equipes = this.equipesDaTurma(turmaId, periodoLetivoId);
    const xpPorAluno = this.mapaXpPorAluno(criterio, periodoLetivoId);

    const linhas = equipes.map((equipe) => {
      const membros = membrosParaPlacar(this._membros(), equipe.id, criterio, periodoLetivoId);
      const { xpTotal, quantidadeMembros, xpMedio } = pontuarEquipe(membros, xpPorAluno);
      return { equipe, quantidadeMembros, xpTotal, xpMedio, posicao: 0 };
    });

    linhas.sort((primeira, segunda) => {
      if (segunda.xpTotal !== primeira.xpTotal) return segunda.xpTotal - primeira.xpTotal;
      return primeira.equipe.nome.localeCompare(segunda.equipe.nome, 'pt-BR');
    });
    linhas.forEach((linha, indice) => {
      linha.posicao = indice + 1;
    });
    return linhas;
  }

  async removerDeTurmas(): Promise<void> {
    const vinculados = this._membros().filter((membro) => membro.turmaId !== '');
    for (const membro of vinculados) {
      await this.repoMembros.remove(membro.id);
    }
    const equipes = this._equipes().filter((equipe) => equipe.turmaId !== '');
    for (const equipe of equipes) {
      await this.repoEquipes.remove(equipe.id);
    }
    if (vinculados.length || equipes.length) {
      this._membros.update((lista) => lista.filter((membro) => membro.turmaId === ''));
      this._equipes.update((lista) => lista.filter((equipe) => equipe.turmaId === ''));
      this.auditoria.registrar('equipe.removidas-por-turma', 'Equipe', null, null);
    }
  }

  async removerTodos(): Promise<void> {
    for (const membro of this._membros()) {
      await this.repoMembros.remove(membro.id);
    }
    for (const equipe of this._equipes()) {
      await this.repoEquipes.remove(equipe.id);
    }
    this._membros.set([]);
    this._equipes.set([]);
    this.auditoria.registrar('equipe.excluidas-todas', 'Equipe', null, null);
  }

  /** Remove todos os vínculos de aluno, preservando as equipes. */
  async removerTodosMembros(): Promise<void> {
    for (const membro of this._membros()) {
      await this.repoMembros.remove(membro.id);
    }
    this._membros.set([]);
    this.auditoria.registrar('equipe.membros-removidos-todos', 'Equipe', null, null);
  }

  private async encerrarVinculo(membro: EquipeMembro): Promise<void> {
    const encerrado = await this.repoMembros.update(membro.id, {
      ativa: false,
      fimEm: new Date().toISOString(),
    });
    this._membros.update((lista) => lista.map((item) => (item.id === membro.id ? encerrado : item)));
  }

  private mapaXpPorAluno(
    criterio: CriterioPlacar,
    periodoLetivoId: string | null,
  ): Map<string, number> {
    if (criterio === 'xp_acumulado') {
      return new Map(this.alunos.alunos().map((aluno) => [aluno.id, aluno.xp]));
    }

    const periodo = periodoLetivoId ? this.periodos.porId(periodoLetivoId) : undefined;
    if (!periodo) {
      return new Map(this.alunos.alunos().map((aluno) => [aluno.id, 0]));
    }
    const inicio = new Date(periodo.dataInicio).getTime();
    const fim = new Date(periodo.dataFim).getTime();

    const xpPorAluno = new Map<string, number>();
    for (const evento of this.gamificacao.eventos()) {
      const instante = new Date(evento.criadoEm).getTime();
      if (instante < inicio || instante > fim) continue;
      xpPorAluno.set(evento.alunoId, (xpPorAluno.get(evento.alunoId) ?? 0) + evento.deltaXp);
    }
    return xpPorAluno;
  }

  private garantirEquipeValida(dados: DadosEquipe, idAtual?: string): void {
    const erros = this.validar(dados, idAtual);
    if (erros.length) throw new Error(erros.join('\n'));
  }

  private normalizarEquipe(dados: DadosEquipe): DadosEquipe {
    return {
      nome: dados.nome.trim(),
      emoji: dados.emoji.trim(),
      cor: dados.cor.trim(),
      ativa: dados.ativa,
      turmaId: dados.turmaId.trim(),
      periodoLetivoId: dados.periodoLetivoId || null,
    };
  }

  private ordenarEquipes(lista: Equipe[]): Equipe[] {
    return [...lista].sort((primeira, segunda) =>
      primeira.nome.localeCompare(segunda.nome, 'pt-BR'),
    );
  }

  private ordenarMembros(lista: EquipeMembro[]): EquipeMembro[] {
    return [...lista].sort((primeiro, segundo) =>
      segundo.criadoEm.localeCompare(primeiro.criadoEm),
    );
  }
}
