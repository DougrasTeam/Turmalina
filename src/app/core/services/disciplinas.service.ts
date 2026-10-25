import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import {
  CORES_DISCIPLINA,
  DISCIPLINAS_PADRAO,
  DadosDisciplina,
  Disciplina,
  gerarCodigoDisciplina,
  validarDisciplina,
} from '../models/disciplina.model';
import { AuditoriaService } from './auditoria.service';
import { HorariosTurmaService } from './horarios-turma.service';
import { environment } from '../../../environments/environment';

const CARGA_HORARIA_PADRAO = 80;
const MARCADOR_SEMENTE = 'turmalina.disciplinas.inicializado';

@Injectable({ providedIn: 'root' })
export class DisciplinasService {
  private readonly repo: Repository<Disciplina> = inject(RepositoryFactory).create<Disciplina>(
    'turmalina.disciplinas',
    () => ({ nome: '', codigo: '', cargaHoraria: CARGA_HORARIA_PADRAO, cor: CORES_DISCIPLINA[0], ativa: true }),
  );
  private readonly auditoria = inject(AuditoriaService);
  private readonly horarios = inject(HorariosTurmaService);

  private readonly _disciplinas = signal<Disciplina[]>([]);
  private carregado = false;

  readonly disciplinas = this._disciplinas.asReadonly();
  readonly total = computed(() => this._disciplinas().length);
  readonly ativas = computed(() => this._disciplinas().filter((disciplina) => disciplina.ativa).length);

  readonly codigosExistentes = computed(() => this._disciplinas().map((disciplina) => disciplina.codigo));

  async load(): Promise<void> {
    if (this.carregado) return;
    const lista = await this.repo.list();

    // Com backend real, os dados iniciais vêm das migrations. Semear no cliente
    // recriaria registros que o usuário apagou.
    if (environment.usarSupabaseDados) {
      this._disciplinas.set(this.ordenar(lista));
    } else {
      const jaInicializado = localStorage.getItem(MARCADOR_SEMENTE) === '1';
      if (lista.length || jaInicializado) {
        this._disciplinas.set(this.ordenar(lista));
      } else {
        this._disciplinas.set(await this.semear());
        localStorage.setItem(MARCADOR_SEMENTE, '1');
      }
    }

    this.carregado = true;
  }

  porId(id: string): Disciplina | undefined {
    return this._disciplinas().find((disciplina) => disciplina.id === id);
  }

  porNome(nome: string): Disciplina | undefined {
    const alvo = nome.trim().toLowerCase();
    return this._disciplinas().find((disciplina) => disciplina.nome.trim().toLowerCase() === alvo);
  }

  porIds(ids: string[]): Disciplina[] {
    return (ids ?? [])
      .map((id) => this.porId(id))
      .filter((disciplina): disciplina is Disciplina => Boolean(disciplina));
  }

  nomesDe(ids: string[]): string[] {
    return this.porIds(ids).map((disciplina) => disciplina.nome);
  }

  validar(dados: DadosDisciplina, idAtual?: string): string[] {
    return validarDisciplina(dados, this._disciplinas(), idAtual);
  }

  async criar(dados: DadosDisciplina): Promise<Disciplina> {
    const erros = this.validar(dados);
    if (erros.length) throw new Error(erros.join('\n'));
    const disciplina = await this.repo.create(dados);
    this._disciplinas.update((lista) => this.ordenar([...lista, disciplina]));
    this.auditoria.registrar('disciplina.criada', 'Disciplina', disciplina.id, disciplina.nome);
    return disciplina;
  }

  /**
   * Cria as disciplinas comuns que ainda não existem na escola.
   *
   * Cada disciplina recebe uma cor própria da paleta. Disciplinas já
   * cadastradas, mesmo com nome em outra caixa, são preservadas.
   */
  async criarDisciplinasPadrao(): Promise<number> {
    const nomesExistentes = new Set(
      this._disciplinas().map((disciplina) => disciplina.nome.trim().toLowerCase()),
    );
    const codigosUsados = this._disciplinas().map((disciplina) => disciplina.codigo);
    const criadas: Disciplina[] = [];

    for (const disciplinaPadrao of DISCIPLINAS_PADRAO) {
      const nomeNormalizado = disciplinaPadrao.nome.trim().toLowerCase();
      if (nomesExistentes.has(nomeNormalizado)) continue;

      const codigo = gerarCodigoDisciplina(disciplinaPadrao.nome, codigosUsados);
      const disciplina = await this.repo.create({
        nome: disciplinaPadrao.nome,
        codigo,
        cargaHoraria: CARGA_HORARIA_PADRAO,
        cor: disciplinaPadrao.cor,
        ativa: true,
      });
      criadas.push(disciplina);
      nomesExistentes.add(nomeNormalizado);
      codigosUsados.push(codigo);
    }

    if (criadas.length === 0) return 0;

    this._disciplinas.update((lista) => this.ordenar([...lista, ...criadas]));
    this.auditoria.registrar(
      'disciplina.padroes-criadas',
      'Disciplina',
      null,
      `${criadas.length} disciplina(s) padrão criada(s)`,
    );
    return criadas.length;
  }

  async atualizar(id: string, dados: DadosDisciplina): Promise<Disciplina> {
    const erros = this.validar(dados, id);
    if (erros.length) throw new Error(erros.join('\n'));
    const disciplina = await this.repo.update(id, dados);
    this._disciplinas.update((lista) =>
      this.ordenar(lista.map((item) => (item.id === id ? disciplina : item))),
    );
    this.auditoria.registrar('disciplina.atualizada', 'Disciplina', id, disciplina.nome);
    return disciplina;
  }

  async alternarAtiva(id: string): Promise<void> {
    const disciplina = this.porId(id);
    if (!disciplina) return;
    const atualizada = await this.repo.update(id, { ativa: !disciplina.ativa });
    this._disciplinas.update((lista) => lista.map((item) => (item.id === id ? atualizada : item)));
    this.auditoria.registrar(
      atualizada.ativa ? 'disciplina.ativada' : 'disciplina.desativada',
      'Disciplina',
      id,
      atualizada.nome,
    );
  }

  async remover(id: string): Promise<void> {
    const disciplina = this.porId(id);
    await this.horarios.removerAtribuicoesDeDisciplinas([id]);
    await this.repo.remove(id);
    this._disciplinas.update((lista) => lista.filter((item) => item.id !== id));
    if (disciplina) {
      this.auditoria.registrar('disciplina.excluida', 'Disciplina', id, disciplina.nome);
    }
  }

  async removerTodas(): Promise<void> {
    await this.horarios.removerAtribuicoesDeDisciplinas(
      this._disciplinas().map((disciplina) => disciplina.id),
    );
    for (const disciplina of this._disciplinas()) {
      await this.repo.remove(disciplina.id);
    }
    this._disciplinas.set([]);
    localStorage.setItem(MARCADOR_SEMENTE, '1');
    this.auditoria.registrar('disciplina.excluidas-todas', 'Disciplina', null, null);
  }

  private async semear(): Promise<Disciplina[]> {
    const criadas: Disciplina[] = [];
    for (const disciplinaPadrao of DISCIPLINAS_PADRAO) {
      const codigo = gerarCodigoDisciplina(
        disciplinaPadrao.nome,
        criadas.map((disciplina) => disciplina.codigo),
      );
      const disciplina = await this.repo.create({
        nome: disciplinaPadrao.nome,
        codigo,
        cargaHoraria: CARGA_HORARIA_PADRAO,
        cor: disciplinaPadrao.cor,
        ativa: true,
      });
      criadas.push(disciplina);
    }
    return this.ordenar(criadas);
  }

  private ordenar(lista: Disciplina[]): Disciplina[] {
    return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
}
