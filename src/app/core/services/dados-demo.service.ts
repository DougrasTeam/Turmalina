import { Injectable, inject } from '@angular/core';

import { EMAIL_ALUNO_DEMO, EMAIL_PROFESSOR_DEMO } from '../auth/contas-demo';
import { AlunosService } from './alunos.service';
import { AvaliacoesService } from './avaliacoes.service';
import { DisciplinasService } from './disciplinas.service';
import { FrequenciasService } from './frequencias.service';
import { MatriculasService } from './matriculas.service';
import { PeriodosLetivosService } from './periodos-letivos.service';
import { ProfessoresService } from './professores.service';
import { TurmasService } from './turmas.service';
import { VinculosDocentesService } from './vinculos-docentes.service';
import { Aluno, PeriodoLetivo, Professor, Turma, createId } from '../models';
import { Disciplina } from '../models/disciplina.model';
import { EtapaAvaliacao } from '../models/etapa-avaliacao.model';

const NOME_PROFESSOR_DEMO = 'Bruno Professor';
const NOME_ALUNO_DEMO = 'Carla Aluna';
const MATRICULA_ALUNO_DEMO = 'DEMO-0001';

const CODIGO_TURMA_DEMO = 'DEMO01';
const NOME_TURMA_DEMO = 'Turma Demonstração';
const NOME_PERIODO_DEMO = 'Ano Letivo (Demonstração)';

const DISCIPLINAS_VINCULADAS = 2;

/**
 * Garante que as contas de demonstração (`*@turmalina.com`) estejam ligadas a
 * registros de professor/aluno no armazenamento, junto com turma, período,
 * vínculo docente e matrícula — sem isso, os fluxos do painel do professor e
 * do boletim do aluno ficam vazios ("cadastro não encontrado").
 *
 * A operação é idempotente: só cria o que estiver faltando e roda uma vez por
 * carregamento de sessão. Erros de seed não interrompem a aplicação.
 */
@Injectable({ providedIn: 'root' })
export class DadosDemoService {
  private readonly professores = inject(ProfessoresService);
  private readonly alunos = inject(AlunosService);
  private readonly turmas = inject(TurmasService);
  private readonly disciplinas = inject(DisciplinasService);
  private readonly periodos = inject(PeriodosLetivosService);
  private readonly vinculos = inject(VinculosDocentesService);
  private readonly matriculas = inject(MatriculasService);
  private readonly frequencias = inject(FrequenciasService);
  private readonly avaliacoes = inject(AvaliacoesService);

  private emAndamento: Promise<void> | null = null;

  garantir(): Promise<void> {
    if (!this.emAndamento) {
      this.emAndamento = this.semear().catch((erro) => {
        console.warn('[DadosDemo] Não foi possível preparar os dados de demonstração.', erro);
      });
    }
    return this.emAndamento;
  }

  private async semear(): Promise<void> {
    const disciplinas = this.disciplinasAplicaveis();
    const professor = await this.garantirProfessor(disciplinas);
    const periodo = await this.garantirPeriodoAtivo();
    const turma = await this.garantirTurma(professor, disciplinas);
    const aluno = await this.garantirAluno(turma);

    await this.garantirVinculos(professor, turma, disciplinas);
    await this.garantirMatricula(aluno, turma, periodo);
    await this.garantirAvaliacoes(aluno, turma, periodo, disciplinas);
    await this.garantirFrequencia(aluno, turma, periodo);
  }

  private disciplinasAplicaveis(): Disciplina[] {
    return this.disciplinas.disciplinas().slice(0, DISCIPLINAS_VINCULADAS);
  }

  private async garantirProfessor(disciplinas: Disciplina[]): Promise<Professor> {
    const disciplinaIds = disciplinas.map((disciplina) => disciplina.id);
    const existente = this.professores
      .professores()
      .find((professor) => professor.email === EMAIL_PROFESSOR_DEMO);

    if (!existente) {
      return this.professores.create({
        nome: NOME_PROFESSOR_DEMO,
        email: EMAIL_PROFESSOR_DEMO,
        telefone: '',
        disciplinas: disciplinaIds,
        ativo: true,
      });
    }

    const atuais = existente.disciplinas ?? [];
    const semVinculo = disciplinaIds.some((id) => !atuais.includes(id));
    if (semVinculo) {
      return this.professores.update(existente.id, {
        disciplinas: unir(atuais, disciplinaIds),
      });
    }
    return existente;
  }

  private async garantirTurma(professor: Professor, disciplinas: Disciplina[]): Promise<Turma> {
    const disciplinaIds = disciplinas.map((disciplina) => disciplina.id);
    const existente = this.turmas.turmas().find((turma) => turma.codigo === CODIGO_TURMA_DEMO);

    if (!existente) {
      return this.turmas.create({
        nome: NOME_TURMA_DEMO,
        serie: '1º Ano',
        turno: 'manha',
        anoLetivo: new Date().getFullYear(),
        codigo: CODIGO_TURMA_DEMO,
        descricao: 'Turma sintética para testar os fluxos de demonstração.',
        professorIds: [professor.id],
        disciplinaIds,
        ativa: true,
      });
    }

    const professorIdsAtuais = existente.professorIds ?? [];
    const disciplinaIdsAtuais = existente.disciplinaIds ?? [];
    const professorIds = unir(professorIdsAtuais, [professor.id]);
    const disciplinasTurma = unir(disciplinaIdsAtuais, disciplinaIds);
    const mudou =
      professorIds.length !== professorIdsAtuais.length ||
      disciplinasTurma.length !== disciplinaIdsAtuais.length;

    if (mudou) {
      return this.turmas.update(existente.id, { professorIds, disciplinaIds: disciplinasTurma });
    }
    return existente;
  }

  private async garantirAluno(turma: Turma): Promise<Aluno> {
    const existente = this.alunos
      .alunos()
      .find((aluno) => aluno.email === EMAIL_ALUNO_DEMO);

    if (!existente) {
      return this.alunos.create({
        nome: NOME_ALUNO_DEMO,
        email: EMAIL_ALUNO_DEMO,
        matricula: MATRICULA_ALUNO_DEMO,
        turmaId: turma.id,
        dataNascimento: '',
        responsavel: '',
        telefoneResponsavel: '',
        ativo: true,
        xp: 120,
        moedas: 40,
      });
    }

    if (existente.turmaId !== turma.id) {
      return this.alunos.update(existente.id, { turmaId: turma.id });
    }
    return existente;
  }

  private async garantirPeriodoAtivo(): Promise<PeriodoLetivo | null> {
    const ativo = this.periodos.ativo();
    if (ativo) return ativo;

    const planejado = this.periodos.periodos().find((periodo) => periodo.status === 'planejado');
    if (planejado) {
      await this.periodos.ativar(planejado.id);
      return this.periodos.porId(planejado.id) ?? null;
    }

    if (this.periodos.periodos().length > 0) {
      return this.periodos.periodos()[this.periodos.periodos().length - 1] ?? null;
    }

    const ano = new Date().getFullYear();
    const periodo = await this.periodos.criar({
      nome: NOME_PERIODO_DEMO,
      dataInicio: `${ano}-02-01`,
      dataFim: `${ano}-12-15`,
      etapas: this.etapasDemo(ano),
    });
    await this.periodos.ativar(periodo.id);
    return this.periodos.porId(periodo.id) ?? periodo;
  }

  private etapasDemo(ano: number): EtapaAvaliacao[] {
    return [
      { id: createId(), nome: '1º Bimestre', tipo: 'bimestre', dataInicio: `${ano}-02-01`, dataFim: `${ano}-04-30` },
      { id: createId(), nome: '2º Bimestre', tipo: 'bimestre', dataInicio: `${ano}-05-01`, dataFim: `${ano}-07-15` },
      { id: createId(), nome: '3º Bimestre', tipo: 'bimestre', dataInicio: `${ano}-08-01`, dataFim: `${ano}-09-30` },
      { id: createId(), nome: '4º Bimestre', tipo: 'bimestre', dataInicio: `${ano}-10-01`, dataFim: `${ano}-12-15` },
    ];
  }

  private async garantirVinculos(
    professor: Professor,
    turma: Turma,
    disciplinas: Disciplina[],
  ): Promise<void> {
    for (const disciplina of disciplinas) {
      const dados = { professorId: professor.id, turmaId: turma.id, disciplinaId: disciplina.id };
      if (!this.vinculos.existe(dados)) {
        await this.vinculos.criar(dados);
      }
    }
  }

  private async garantirMatricula(
    aluno: Aluno,
    turma: Turma,
    periodo: PeriodoLetivo | null,
  ): Promise<void> {
    const jaMatriculado = this.matriculas
      .matriculasAtivas(aluno.id)
      .some((matricula) => matricula.turmaId === turma.id);
    if (!jaMatriculado) {
      await this.matriculas.matricular(aluno.id, turma.id, periodo?.id);
    }
  }

  private async garantirAvaliacoes(
    aluno: Aluno,
    turma: Turma,
    periodo: PeriodoLetivo | null,
    disciplinas: Disciplina[],
  ): Promise<void> {
    if (!periodo || this.periodos.periodoEncerrado(periodo.id)) return;
    if (this.avaliacoes.porTurma(turma.id).length > 0) return;

    const data = new Date().toISOString().slice(0, 10);
    for (const disciplina of disciplinas) {
      const avaliacao = await this.avaliacoes.criar({
        nome: `Avaliação diagnóstica — ${disciplina.nome}`,
        turmaId: turma.id,
        disciplinaId: disciplina.id,
        periodoLetivoId: periodo.id,
        etapaId: periodo.etapas[0]?.id ?? null,
        data,
        notaMaxima: 10,
        peso: 1,
        status: 'publicada',
        descricao: 'Nota sintética para demonstração.',
      });
      await this.avaliacoes.lancarNotas(avaliacao.id, [
        { alunoId: aluno.id, valor: 8.5, atualizadoEm: new Date().toISOString() },
      ]);
    }
  }

  private async garantirFrequencia(
    aluno: Aluno,
    turma: Turma,
    periodo: PeriodoLetivo | null,
  ): Promise<void> {
    if (!periodo || this.periodos.periodoEncerrado(periodo.id)) return;
    if (this.frequencias.porTurma(turma.id).length > 0) return;

    await this.frequencias.salvar({
      turmaId: turma.id,
      periodoLetivoId: periodo.id,
      disciplinaId: null,
      data: new Date().toISOString().slice(0, 10),
      registros: [{ alunoId: aluno.id, status: 'presente', justificativa: null }],
      observacao: 'Chamada sintética para demonstração.',
    });
  }
}

function unir(atual: readonly string[], adicionar: readonly string[]): string[] {
  return Array.from(new Set([...atual, ...adicionar]));
}
