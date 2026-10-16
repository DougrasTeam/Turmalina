import { Injectable, computed, inject, signal } from '@angular/core';

import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import { DISCIPLINAS_SUGERIDAS } from '../models';
import {
  CORES_DISCIPLINA,
  DadosDisciplina,
  Disciplina,
  gerarCodigoDisciplina,
  validarDisciplina,
} from '../models/disciplina.model';
import { AuditoriaService } from './auditoria.service';

const CARGA_HORARIA_PADRAO = 80;
const MARCADOR_SEMENTE = 'turmalina.disciplinas.inicializado';

@Injectable({ providedIn: 'root' })
export class DisciplinasService {
  private readonly repo: Repository<Disciplina> = inject(RepositoryFactory).create<Disciplina>(
    'turmalina.disciplinas',
    () => ({ nome: '', codigo: '', cargaHoraria: CARGA_HORARIA_PADRAO, cor: CORES_DISCIPLINA[0], ativa: true }),
  );
  private readonly auditoria = inject(AuditoriaService);

  private readonly _disciplinas = signal<Disciplina[]>([]);
  private carregado = false;

  readonly disciplinas = this._disciplinas.asReadonly();
  readonly total = computed(() => this._disciplinas().length);
  readonly ativas = computed(() => this._disciplinas().filter((disciplina) => disciplina.ativa).length);

  readonly codigosExistentes = computed(() => this._disciplinas().map((disciplina) => disciplina.codigo));

  async load(): Promise<void> {
    if (this.carregado) return;
    const lista = await this.repo.list();
    const jaInicializado = localStorage.getItem(MARCADOR_SEMENTE) === '1';
    if (lista.length || jaInicializado) {
      this._disciplinas.set(this.ordenar(lista));
    } else {
      this._disciplinas.set(await this.semear());
      localStorage.setItem(MARCADOR_SEMENTE, '1');
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
    await this.repo.remove(id);
    this._disciplinas.update((lista) => lista.filter((item) => item.id !== id));
    if (disciplina) {
      this.auditoria.registrar('disciplina.excluida', 'Disciplina', id, disciplina.nome);
    }
  }

  async removerTodas(): Promise<void> {
    for (const disciplina of this._disciplinas()) {
      await this.repo.remove(disciplina.id);
    }
    this._disciplinas.set([]);
    localStorage.setItem(MARCADOR_SEMENTE, '1');
    this.auditoria.registrar('disciplina.excluidas-todas', 'Disciplina', null, null);
  }

  private async semear(): Promise<Disciplina[]> {
    const criadas: Disciplina[] = [];
    let indice = 0;
    for (const nome of DISCIPLINAS_SUGERIDAS) {
      const codigo = gerarCodigoDisciplina(
        nome,
        criadas.map((disciplina) => disciplina.codigo),
      );
      const disciplina = await this.repo.create({
        nome,
        codigo,
        cargaHoraria: CARGA_HORARIA_PADRAO,
        cor: CORES_DISCIPLINA[indice % CORES_DISCIPLINA.length],
        ativa: true,
      });
      criadas.push(disciplina);
      indice++;
    }
    return this.ordenar(criadas);
  }

  private ordenar(lista: Disciplina[]): Disciplina[] {
    return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
}
