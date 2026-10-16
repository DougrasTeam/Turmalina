import { Component, computed, inject, linkedSignal, signal } from '@angular/core';

import {
  ExportacaoService,
  nomeArquivoCsv,
  numeroParaCsv,
  percentualParaCsv,
} from '../../../core/services/exportacao.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { InstituicaoService } from '../../../core/services/instituicao.service';
import { PeriodosLetivosService } from '../../../core/services/periodos-letivos.service';
import { RelatoriosService } from '../../../core/services/relatorios.service';
import { TurmasService } from '../../../core/services/turmas.service';
import {
  StatusAvaliacao,
  classeStatusAvaliacao,
  formatarNota,
  rotuloStatusAvaliacao,
} from '../../../core/models/avaliacao.model';
import { formatarDataFrequencia, formatarPercentual } from '../../../core/models/frequencia.model';
import {
  TIPOS_RELATORIO,
  TipoRelatorio,
  opcaoRelatorio,
} from '../../../core/models/relatorio.model';

@Component({
  selector: 'app-relatorios',
  templateUrl: './relatorios.component.html',
  styleUrl: './relatorios.component.scss',
})
export class RelatoriosComponent {
  protected readonly turmas = inject(TurmasService);
  protected readonly periodos = inject(PeriodosLetivosService);
  private readonly relatorios = inject(RelatoriosService);
  private readonly exportacao = inject(ExportacaoService);
  private readonly instituicao = inject(InstituicaoService);
  private readonly auditoria = inject(AuditoriaService);

  protected readonly tipos = TIPOS_RELATORIO;
  protected readonly tipoRelatorio = signal<TipoRelatorio>('frequencia');

  protected readonly turmaFiltro = linkedSignal(() => this.turmas.turmas()[0]?.id ?? '');
  protected readonly periodoFiltro = linkedSignal(
    () => this.periodos.ativo()?.id ?? this.periodos.periodos()[0]?.id ?? '',
  );

  protected readonly semTurmas = computed(() => this.turmas.turmas().length === 0);
  protected readonly semPeriodo = computed(() => !this.periodoFiltro());

  protected readonly resumo = computed(() =>
    this.relatorios.resumoInstitucional(this.periodoFiltro()),
  );
  protected readonly relatorioFrequencia = computed(() =>
    this.relatorios.frequenciaDaTurma(this.turmaFiltro(), this.periodoFiltro()),
  );
  protected readonly relatorioDesempenho = computed(() =>
    this.relatorios.desempenhoDaTurma(this.turmaFiltro(), this.periodoFiltro()),
  );
  protected readonly relatorioPendentes = computed(() =>
    this.relatorios.avaliacoesPendentes(this.turmaFiltro(), this.periodoFiltro()),
  );

  protected readonly opcaoAtual = computed(() => opcaoRelatorio(this.tipoRelatorio()));

  protected readonly geradoEmAtual = computed(() => {
    switch (this.tipoRelatorio()) {
      case 'frequencia':
        return this.relatorioFrequencia()?.geradoEm ?? null;
      case 'desempenho':
        return this.relatorioDesempenho()?.geradoEm ?? null;
      case 'avaliacoes-pendentes':
        return this.relatorioPendentes()?.geradoEm ?? null;
      default:
        return null;
    }
  });

  protected readonly podeExportar = computed(() => {
    if (!this.turmaFiltro() || !this.periodoFiltro()) return false;
    switch (this.tipoRelatorio()) {
      case 'frequencia':
        return (this.relatorioFrequencia()?.linhas.length ?? 0) > 0;
      case 'desempenho':
        return (this.relatorioDesempenho()?.linhas.length ?? 0) > 0;
      case 'avaliacoes-pendentes':
        return (this.relatorioPendentes()?.linhas.length ?? 0) > 0;
      default:
        return false;
    }
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }

  protected selecionarTipo(tipo: TipoRelatorio): void {
    this.tipoRelatorio.set(tipo);
  }

  protected imprimir(): void {
    if (!this.podeExportar()) return;
    window.print();
  }

  protected nota(valor: number | null): string {
    return formatarNota(valor, this.instituicao.casasDecimaisNota());
  }

  protected percentual(valor: number | null): string {
    return formatarPercentual(valor);
  }

  protected data(iso: string | null): string {
    return formatarDataFrequencia(iso);
  }

  protected statusLabel(status: StatusAvaliacao): string {
    return rotuloStatusAvaliacao(status);
  }

  protected statusClasse(status: StatusAvaliacao): string {
    return classeStatusAvaliacao(status);
  }

  protected dataHora(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  protected exportar(): void {
    if (!this.podeExportar()) return;
    switch (this.tipoRelatorio()) {
      case 'frequencia':
        this.exportarFrequencia();
        break;
      case 'desempenho':
        this.exportarDesempenho();
        break;
      case 'avaliacoes-pendentes':
        this.exportarPendentes();
        break;
    }
  }

  private exportarFrequencia(): void {
    const relatorio = this.relatorioFrequencia();
    if (!relatorio) return;
    const cabecalhos = [
      'Aluno',
      'Matrícula',
      'Aulas registradas',
      'Presenças',
      'Faltas',
      'Faltas justificadas',
      'Frequência (%)',
      'Situação',
    ];
    const linhas = relatorio.linhas.map((linha) => [
      linha.alunoNome,
      linha.alunoMatricula,
      linha.total,
      linha.presentes,
      linha.faltas,
      linha.justificadas,
      percentualParaCsv(linha.percentual),
      linha.abaixoDoLimite ? 'Abaixo do limite' : 'Regular',
    ]);
    this.exportacao.exportarCsv(
      nomeArquivoCsv('relatorio-frequencia', relatorio.turmaNome),
      cabecalhos,
      linhas,
    );
    this.auditoria.registrar('relatorio.exportado', 'Relatorio', 'frequencia', relatorio.turmaNome);
  }

  private exportarDesempenho(): void {
    const relatorio = this.relatorioDesempenho();
    if (!relatorio) return;
    const cabecalhos = [
      'Aluno',
      'Matrícula',
      ...relatorio.colunas.map((coluna) => coluna.disciplinaNome),
      'Média geral',
      'Notas lançadas',
      'Situação',
    ];
    const linhas = relatorio.linhas.map((linha) => [
      linha.alunoNome,
      linha.alunoMatricula,
      ...linha.mediasPorDisciplina.map((media) => numeroParaCsv(media, relatorio.casasDecimais)),
      numeroParaCsv(linha.mediaGeral, relatorio.casasDecimais),
      linha.notasLancadas,
      linha.abaixoDaMedia ? 'Abaixo da média' : 'Regular',
    ]);
    this.exportacao.exportarCsv(
      nomeArquivoCsv('relatorio-desempenho', relatorio.turmaNome),
      cabecalhos,
      linhas,
    );
    this.auditoria.registrar('relatorio.exportado', 'Relatorio', 'desempenho', relatorio.turmaNome);
  }

  private exportarPendentes(): void {
    const relatorio = this.relatorioPendentes();
    if (!relatorio) return;
    const cabecalhos = [
      'Avaliação',
      'Disciplina',
      'Data',
      'Status',
      'Lançadas',
      'Pendentes',
      'Total',
    ];
    const linhas = relatorio.linhas.map((linha) => [
      linha.nome,
      linha.disciplinaNome,
      this.data(linha.data),
      this.statusLabel(linha.status),
      linha.lancadas,
      linha.pendentes,
      linha.total,
    ]);
    this.exportacao.exportarCsv(
      nomeArquivoCsv('relatorio-avaliacoes-pendentes', relatorio.turmaNome),
      cabecalhos,
      linhas,
    );
    this.auditoria.registrar(
      'relatorio.exportado',
      'Relatorio',
      'avaliacoes-pendentes',
      relatorio.turmaNome,
    );
  }
}
