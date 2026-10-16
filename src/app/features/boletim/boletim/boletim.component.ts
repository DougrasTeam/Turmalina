import { Component, computed, inject, linkedSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AlunosService } from '../../../core/services/alunos.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { AuthService } from '../../../core/services/auth.service';
import { BoletimService } from '../../../core/services/boletim.service';
import {
  ExportacaoService,
  nomeArquivoCsv,
  numeroParaCsv,
  percentualParaCsv,
} from '../../../core/services/exportacao.service';
import { InstituicaoService } from '../../../core/services/instituicao.service';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';
import { formatarNota } from '../../../core/models/avaliacao.model';
import { classeSituacao, rotuloSituacao } from '../../../core/models/boletim.model';
import { formatarPercentual } from '../../../core/models/frequencia.model';

@Component({
  selector: 'app-boletim',
  templateUrl: './boletim.component.html',
  styleUrl: './boletim.component.scss',
})
export class BoletimComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly alunos = inject(AlunosService);
  protected readonly auth = inject(AuthService);
  protected readonly boletimService = inject(BoletimService);
  protected readonly periodos = inject(PeriodosLetivosService);
  protected readonly instituicao = inject(InstituicaoService);
  private readonly exportacao = inject(ExportacaoService);
  private readonly auditoria = inject(AuditoriaService);

  private readonly alunoIdParam = this.route.snapshot.paramMap.get('alunoId');

  protected readonly somenteLeitura = this.auth.papel() === 'aluno';

  private readonly alunoProprio = computed(() => {
    const email = this.auth.usuario()?.email;
    if (!email) return null;
    return this.alunos.alunos().find((aluno) => aluno.email === email) ?? null;
  });

  protected readonly alunoId = computed(() => this.alunoIdParam ?? this.alunoProprio()?.id ?? '');

  protected readonly periodoFiltro = linkedSignal(
    () => this.periodos.ativo()?.id ?? this.periodos.periodos()[0]?.id ?? '',
  );

  protected readonly boletim = computed(() =>
    this.alunoId() ? this.boletimService.gerar(this.alunoId(), this.periodoFiltro()) : null,
  );

  protected valor(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }

  protected imprimir(): void {
    window.print();
  }

  protected exportarCsv(): void {
    const boletim = this.boletim();
    if (!boletim) return;

    const casas = this.instituicao.casasDecimaisNota();
    const cabecalhos = ['Disciplina', 'Média', 'Frequência (%)', 'Situação', 'Observação'];
    const linhas = boletim.disciplinas.map((disciplina) => [
      disciplina.disciplinaNome,
      numeroParaCsv(disciplina.media, casas),
      percentualParaCsv(disciplina.frequencia),
      this.situacaoLabel(disciplina.situacao),
      disciplina.motivo || '',
    ]);
    linhas.push([
      'Geral',
      numeroParaCsv(boletim.mediaGeral, casas),
      percentualParaCsv(boletim.frequenciaGeral),
      this.situacaoLabel(boletim.situacao),
      boletim.motivo || '',
    ]);

    this.exportacao.exportarCsv(
      nomeArquivoCsv('boletim', boletim.alunoNome, boletim.periodoNome),
      cabecalhos,
      linhas,
    );
    this.auditoria.registrar('boletim.exportado', 'Boletim', boletim.alunoId, boletim.alunoNome);
  }

  protected nota(valor: number | null): string {
    return formatarNota(valor, this.instituicao.casasDecimaisNota());
  }

  protected percentual(valor: number | null): string {
    return formatarPercentual(valor);
  }

  protected situacaoLabel(situacao: string): string {
    return rotuloSituacao(situacao as never);
  }

  protected situacaoClasse(situacao: string): string {
    return classeSituacao(situacao as never);
  }

  protected dataEmissao(iso: string): string {
    const data = new Date(iso);
    return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }
}
