import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import { Usuario } from '../models/usuario.model';
import {
  CONQUISTAS_PADRAO,
  Conquista,
  ConquistaAluno,
  DadosConquista,
  validarConquista,
} from '../models/conquistas.model';
import { criarChaveIdempotencia } from '../models/gamificacao.model';
import { AlunosService } from './alunos.service';
import { AuditoriaService } from './auditoria.service';
import { GamificacaoService } from './gamificacao.service';
import { environment } from '../../../environments/environment';

const MARCADOR_SEMENTE = 'turmalina.conquistas.inicializado';

/**
 * Conquistas e álbum (RF-020).
 *
 * O administrador/professor autorizado configura as conquistas; o desbloqueio
 * por aluno é idempotente e concede um bônus de XP (que entra no histórico como
 * qualquer lançamento). Correções acontecem por reversão auditada, preservando
 * a história da conquista. O álbum exibe apenas o progresso pessoal do aluno.
 */
@Injectable({ providedIn: 'root' })
export class ConquistasService {
  private readonly repoConquistas: Repository<Conquista> = inject(
    RepositoryFactory,
  ).create<Conquista>('turmalina.conquistas', () => ({
    nome: '',
    emoji: '🌟',
    descricao: '',
    bonusXp: 0,
    ativa: true,
  }));
  private readonly repoDesbloqueios: Repository<ConquistaAluno> = inject(
    RepositoryFactory,
  ).create<ConquistaAluno>('turmalina.conquistas-aluno', () => ({
    alunoId: '',
    conquistaId: '',
    conquistaNome: '',
    origem: 'manual',
    autorId: null,
    autorNome: '',
    idempotencyKey: '',
    estornoDe: null,
  }));
  private readonly alunos = inject(AlunosService);
  private readonly gamificacao = inject(GamificacaoService);
  private readonly auditoria = inject(AuditoriaService);

  private readonly _conquistas = signal<Conquista[]>([]);
  private readonly _desbloqueios = signal<ConquistaAluno[]>([]);
  private carregado = false;

  readonly conquistas = this._conquistas.asReadonly();
  readonly desbloqueios = this._desbloqueios.asReadonly();
  readonly totalConquistas = computed(() => this._conquistas().length);
  readonly conquistasAtivas = computed(() => this._conquistas().filter((conquista) => conquista.ativa));
  readonly totalDesbloqueios = computed(() => this._desbloqueios().length);

  async load(): Promise<void> {
    if (this.carregado) return;

    await this.alunos.load();
    await this.gamificacao.load();
    const [conquistas, desbloqueios] = await Promise.all([
      this.repoConquistas.list(),
      this.repoDesbloqueios.list(),
    ]);

    const jaInicializado = localStorage.getItem(MARCADOR_SEMENTE) === '1';
    if (environment.usarSupabaseDados || conquistas.length || jaInicializado) {
      this._conquistas.set(this.ordenarConquistas(conquistas));
    } else {
      this._conquistas.set(await this.semearConquistas());
      localStorage.setItem(MARCADOR_SEMENTE, '1');
    }

    this._desbloqueios.set(this.ordenarDesbloqueios(desbloqueios));
    this.carregado = true;
  }

  porId(id: string): Conquista | undefined {
    return this._conquistas().find((conquista) => conquista.id === id);
  }

  validar(dados: DadosConquista, idAtual?: string): string[] {
    return validarConquista(dados, this._conquistas(), idAtual);
  }

  async criarConquista(dados: DadosConquista): Promise<Conquista> {
    this.garantirConquistaValida(dados);
    const conquista = await this.repoConquistas.create(this.normalizarConquista(dados));
    this._conquistas.update((lista) => this.ordenarConquistas([...lista, conquista]));
    this.auditoria.registrar('conquista.criada', 'Conquista', conquista.id, conquista.nome);
    return conquista;
  }

  async atualizarConquista(id: string, dados: DadosConquista): Promise<Conquista> {
    this.garantirConquistaValida(dados, id);
    const conquista = await this.repoConquistas.update(id, this.normalizarConquista(dados));
    this._conquistas.update((lista) =>
      this.ordenarConquistas(lista.map((item) => (item.id === id ? conquista : item))),
    );
    this.auditoria.registrar('conquista.atualizada', 'Conquista', id, conquista.nome);
    return conquista;
  }

  async alternarAtiva(id: string): Promise<void> {
    const conquista = this.porId(id);
    if (!conquista) return;
    const atualizada = await this.repoConquistas.update(id, { ativa: !conquista.ativa });
    this._conquistas.update((lista) => lista.map((item) => (item.id === id ? atualizada : item)));
    this.auditoria.registrar(
      atualizada.ativa ? 'conquista.ativada' : 'conquista.desativada',
      'Conquista',
      id,
      atualizada.nome,
    );
  }

  async removerConquista(id: string): Promise<void> {
    const conquista = this.porId(id);
    if (!conquista) return;

    const desbloqueiosRemovidos = this._desbloqueios().filter((item) => item.conquistaId === id);
    const alunosAfetados = desbloqueiosRemovidos.map((desbloqueio) => desbloqueio.alunoId);

    for (const desbloqueio of desbloqueiosRemovidos) {
      await this.repoDesbloqueios.remove(desbloqueio.id);
    }
    await this.repoConquistas.remove(id);
    await this.gamificacao.removerEventosPorChave(
      desbloqueiosRemovidos.map((desbloqueio) => `conquista:${desbloqueio.id}`),
    );

    this._desbloqueios.update((lista) => lista.filter((item) => item.conquistaId !== id));
    this._conquistas.update((lista) => lista.filter((item) => item.id !== id));
    await this.gamificacao.recalcularXpDosAlunos(alunosAfetados);
    this.auditoria.registrar('conquista.excluida', 'Conquista', id, conquista.nome);
  }

  async removerTodasConquistas(): Promise<void> {
    const desbloqueiosRemovidos = this._desbloqueios();
    const alunosAfetados = desbloqueiosRemovidos.map((desbloqueio) => desbloqueio.alunoId);

    await this.limparDesbloqueios();
    for (const conquista of this._conquistas()) {
      await this.repoConquistas.remove(conquista.id);
    }
    await this.gamificacao.removerEventosPorChave(
      desbloqueiosRemovidos.map((desbloqueio) => `conquista:${desbloqueio.id}`),
    );

    this._conquistas.set([]);
    localStorage.setItem(MARCADOR_SEMENTE, '1');
    await this.gamificacao.recalcularXpDosAlunos(alunosAfetados);
    this.auditoria.registrar('conquista.excluidas-todas', 'Conquista', null, null);
  }

  /**
   * Desbloqueia uma conquista para um ou mais alunos.
   *
   * O desbloqueio é idempotente (por aluno/conquista) e concede o bônus de XP
   * pelo histórico de XP. `chaveLote` evita duplo clique/reenvio.
   */
  async desbloquear(
    conquistaId: string,
    alunoIds: string[],
    autor: Usuario,
    chaveLote: string = criarChaveIdempotencia(),
  ): Promise<ConquistaAluno[]> {
    await this.load();

    const conquista = this.porId(conquistaId);
    if (!conquista) throw new Error('Conquista não encontrada.');
    if (!conquista.ativa) throw new Error('Esta conquista está desativada.');

    const idsUnicos = [...new Set(alunoIds)];
    if (!idsUnicos.length) throw new Error('Selecione ao menos um aluno.');

    const alunosPorId = new Map(this.alunos.alunos().map((aluno) => [aluno.id, aluno]));
    const criados: ConquistaAluno[] = [];

    for (const alunoId of idsUnicos) {
      if (!alunosPorId.has(alunoId)) continue;
      if (this.alunoTemConquista(alunoId, conquistaId)) continue;

      const idempotencyKey = `${chaveLote}:${alunoId}`;
      const jaRegistrado = this._desbloqueios().some(
        (desbloqueio) => desbloqueio.idempotencyKey === idempotencyKey,
      );
      if (jaRegistrado) continue;

      const desbloqueio = await this.repoDesbloqueios.create({
        alunoId,
        conquistaId: conquista.id,
        conquistaNome: conquista.nome,
        origem: 'manual',
        autorId: autor.id,
        autorNome: autor.nome,
        idempotencyKey,
        estornoDe: null,
      });
      this._desbloqueios.update((lista) => this.ordenarDesbloqueios([...lista, desbloqueio]));

      if (conquista.bonusXp > 0) {
        await this.gamificacao.registrarBonus(
          alunoId,
          conquista.bonusXp,
          `${conquista.emoji} Conquista: ${conquista.nome}`,
          autor,
          `conquista:${desbloqueio.id}`,
        );
      }
      criados.push(desbloqueio);
    }

    if (criados.length) {
      this.auditoria.registrar(
        'conquista.desbloqueada',
        'Conquista',
        conquista.id,
        `${conquista.nome} para ${criados.length} aluno(s).`,
      );
    }

    return criados;
  }

  /** Remove um desbloqueio por reversão auditada, preservando o histórico. */
  async reverter(desbloqueioId: string, autor: Usuario): Promise<void> {
    const desbloqueio = this._desbloqueios().find((item) => item.id === desbloqueioId);
    if (!desbloqueio) throw new Error('Desbloqueio não encontrado.');

    await this.repoDesbloqueios.remove(desbloqueio.id);
    this._desbloqueios.update((lista) => lista.filter((item) => item.id !== desbloqueio.id));

    const bonusIdempotencia = `conquista:${desbloqueio.id}`;
    const eventoBonus = this.gamificacao
      .eventos()
      .find((evento) => evento.idempotencyKey === bonusIdempotencia);
    if (eventoBonus && !this.gamificacao.estaEstornado(eventoBonus.id)) {
      await this.gamificacao.estornar(eventoBonus.id, autor);
    }

    this.auditoria.registrar(
      'conquista.revertida',
      'Conquista',
      desbloqueio.conquistaId,
      `${desbloqueio.conquistaNome} do aluno ${desbloqueio.alunoId}.`,
    );
  }

  alunoTemConquista(alunoId: string, conquistaId: string): boolean {
    return this._desbloqueios().some(
      (desbloqueio) => desbloqueio.alunoId === alunoId && desbloqueio.conquistaId === conquistaId,
    );
  }

  desbloqueiosDoAluno(alunoId: string): ConquistaAluno[] {
    return this.ordenarDesbloqueios(
      this._desbloqueios().filter((desbloqueio) => desbloqueio.alunoId === alunoId),
    );
  }

  quantidadeDeAlunos(conquistaId: string): number {
    return new Set(this.desbloqueiosDosAlunos(conquistaId)).size;
  }

  private desbloqueiosDosAlunos(conquistaId: string): string[] {
    return this._desbloqueios()
      .filter((desbloqueio) => desbloqueio.conquistaId === conquistaId)
      .map((desbloqueio) => desbloqueio.alunoId);
  }

  async removerDesbloqueiosDeTurmas(): Promise<void> {
    const alunosAfetados = [...new Set(this._desbloqueios().map((item) => item.alunoId))];
    await this.limparDesbloqueios();
    await this.gamificacao.recalcularXpDosAlunos(alunosAfetados);
  }

  async limparDesbloqueios(): Promise<void> {
    for (const desbloqueio of this._desbloqueios()) {
      await this.repoDesbloqueios.remove(desbloqueio.id);
    }
    this._desbloqueios.set([]);
  }

  async removerTudo(): Promise<void> {
    const alunosAfetados = [...new Set(this._desbloqueios().map((item) => item.alunoId))];
    await this.limparDesbloqueios();
    for (const conquista of this._conquistas()) {
      await this.repoConquistas.remove(conquista.id);
    }
    this._conquistas.set([]);
    localStorage.setItem(MARCADOR_SEMENTE, '1');
    await this.gamificacao.recalcularXpDosAlunos(alunosAfetados);
  }

  private garantirConquistaValida(dados: DadosConquista, idAtual?: string): void {
    const erros = this.validar(dados, idAtual);
    if (erros.length) throw new Error(erros.join('\n'));
  }

  private normalizarConquista(dados: DadosConquista): DadosConquista {
    return {
      nome: dados.nome.trim(),
      emoji: dados.emoji.trim(),
      descricao: dados.descricao.trim(),
      bonusXp: Number(dados.bonusXp),
      ativa: dados.ativa,
    };
  }

  private async semearConquistas(): Promise<Conquista[]> {
    const criadas: Conquista[] = [];
    for (const dados of CONQUISTAS_PADRAO) {
      criadas.push(await this.repoConquistas.create(dados));
    }
    return this.ordenarConquistas(criadas);
  }

  private ordenarConquistas(lista: Conquista[]): Conquista[] {
    return [...lista].sort((primeira, segunda) =>
      primeira.nome.localeCompare(segunda.nome, 'pt-BR'),
    );
  }

  private ordenarDesbloqueios(lista: ConquistaAluno[]): ConquistaAluno[] {
    return [...lista].sort((primeiro, segundo) =>
      segundo.criadoEm.localeCompare(primeiro.criadoEm),
    );
  }
}
