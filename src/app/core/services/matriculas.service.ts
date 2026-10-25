import { Injectable, computed, inject, signal } from '@angular/core';

import { AuditoriaService } from './auditoria.service';
import { Repository } from '../data/repository';
import { RepositoryFactory } from '../data/repository.factory';
import { Matricula, DadosMatricula, validarMatricula } from '../models/matricula.model';
import { PeriodosLetivosService } from './periodos-letivos.service';

@Injectable({ providedIn: 'root' })
export class MatriculasService {
  private readonly repo: Repository<Matricula> = inject(RepositoryFactory).create<Matricula>(
    'turmalina.matriculas',
    () => ({
      alunoId: '',
      turmaId: '',
      periodoLetivoId: '',
      status: 'ativa',
      inicioEm: new Date().toISOString().slice(0, 10),
      fimEm: null,
      motivoSaida: null,
    }),
  );
  private readonly auditoria = inject(AuditoriaService);
  private readonly periodos = inject(PeriodosLetivosService);

  private readonly _matriculas = signal<Matricula[]>([]);
  private carregado = false;

  readonly matriculas = this._matriculas.asReadonly();
  readonly total = computed(() => this._matriculas().length);
  readonly ativas = computed(() => this._matriculas().filter((m) => m.status === 'ativa').length);

  async load(): Promise<void> {
    if (this.carregado) return;
    this._matriculas.set(await this.repo.list());
    this.carregado = true;
  }

  validar(dados: DadosMatricula, idAtual?: string): string[] {
    return validarMatricula(dados, this._matriculas(), idAtual);
  }

  async matricular(alunoId: string, turmaId: string, periodoLetivoId?: string): Promise<Matricula> {
    const dados: DadosMatricula = {
      alunoId,
      turmaId,
      periodoLetivoId: periodoLetivoId ?? this.periodos.ativo()?.id ?? '',
      inicioEm: new Date().toISOString().slice(0, 10),
    };
    const erros = this.validar(dados);
    if (erros.length) throw new Error(erros.join('\n'));

    const matricula = await this.repo.create({
      ...dados,
      status: 'ativa',
      inicioEm: dados.inicioEm,
      fimEm: null,
      motivoSaida: null,
    });
    this._matriculas.update((lista) => [...lista, matricula]);
    this.auditoria.registrar('matricula.matricular', 'Matricula', matricula.id, `${alunoId}→${turmaId}`);
    return matricula;
  }

  matriculasAtivas(alunoId: string): Matricula[] {
    return this._matriculas().filter((m) => m.alunoId === alunoId && m.status === 'ativa');
  }

  matriculasDoAluno(alunoId: string): Matricula[] {
    return [...this._matriculas().filter((m) => m.alunoId === alunoId)].sort((a, b) => a.inicioEm.localeCompare(b.inicioEm));
  }

  matriculasDaTurma(turmaId: string): Matricula[] {
    return this._matriculas().filter((m) => m.turmaId === turmaId);
  }

  async transferir(alunoId: string, novaTurmaId: string, motivo?: string, dataTransferencia?: string): Promise<void> {
    const hoje = (dataTransferencia ?? new Date().toISOString().slice(0, 10));
    const ativas = this.matriculasAtivas(alunoId);
    for (const matricula of ativas) {
      const encerrada: Matricula = await this.repo.update(matricula.id, {
        status: 'transferida',
        fimEm: hoje,
        motivoSaida: motivo ?? 'Transferência entre turmas',
      });
      this._matriculas.update((lista) => lista.map((m) => (m.id === matricula.id ? encerrada : m)));
      this.auditoria.registrar('matricula.transferir', 'Matricula', matricula.id, `${alunoId}: ${matricula.turmaId}→${novaTurmaId}`);
    }
    await this.matricular(alunoId, novaTurmaId);
  }

  async desmatricular(alunoId: string, motivo: string, dataSaida?: string): Promise<void> {
    const hoje = (dataSaida ?? new Date().toISOString().slice(0, 10));
    const ativas = this.matriculasAtivas(alunoId);
    for (const matricula of ativas) {
      const encerrada: Matricula = await this.repo.update(matricula.id, {
        status: 'encerrada',
        fimEm: hoje,
        motivoSaida: motivo,
      });
      this._matriculas.update((lista) => lista.map((m) => (m.id === matricula.id ? encerrada : m)));
      this.auditoria.registrar('matricula.encerrar', 'Matricula', matricula.id, motivo);
    }
  }

  async concluirHistorico(): Promise<void> {
    // RN-003: mantém histórico intacto (sem exclusão física).
    // Método intencionalmente vazio para deixar claro o comportamento.
  }

  async removerTodas(): Promise<void> {
    await this.repo.removeAll();
    this._matriculas.set([]);
    this.auditoria.registrar('matricula.excluidas-todas', 'Matricula', null, null);
  }
}
