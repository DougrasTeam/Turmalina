import { Component, computed, inject, signal } from '@angular/core';

import {
  DadosMissao,
  Missao,
  STATUS_MISSAO,
  SituacaoMissao,
  TIPOS_MISSAO,
  normalizarIndicador,
  rotuloIndicador,
  rotuloSituacaoMissao as rotuloDaSituacaoMissao,
} from '../../../core/models/missoes-metas.model';
import { formatarDataHoraAuditoria } from '../../../core/models/auditoria.model';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { ContextoGamificacaoService } from '../../../core/services/contexto-gamificacao.service';
import { GamificacaoService } from '../../../core/services/gamificacao.service';
import { MissoesService } from '../../../core/services/missoes.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmarTextoComponent } from '../../../shared/confirmar-texto/confirmar-texto.component';
import { GamificacaoContextoComponent } from '../../../shared/gamificacao-contexto/gamificacao-contexto.component';
import { ModalComponent } from '../../../shared/modal/modal.component';

interface LinhaMissao {
  missao: Missao;
  situacao: SituacaoMissao;
  concluidos: number;
  totalAlunos: number;
  percentual: number;
}

const FORMULARIO_VAZIO: DadosMissao = {
  nome: '',
  descricao: '',
  instrucoes: '',
  tipo: 'individual',
  turmaId: '',
  disciplinaId: '',
  indicador: '',
  xpRecompensa: 20,
  moedasRecompensa: 0,
  status: 'rascunho',
  inicioEm: null,
  fimEm: null,
};

@Component({
  selector: 'app-missoes',
  imports: [ModalComponent, ConfirmarTextoComponent, GamificacaoContextoComponent],
  templateUrl: './missoes.component.html',
  styleUrl: './missoes.component.scss',
})
export class MissoesComponent {
  protected readonly missoes = inject(MissoesService);
  protected readonly alunos = inject(AlunosService);
  protected readonly gamificacao = inject(GamificacaoService);
  protected readonly contexto = inject(ContextoGamificacaoService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly tipos = TIPOS_MISSAO;
  protected readonly statusDisponiveis = STATUS_MISSAO;
  protected readonly turmaId = this.contexto.turmaId;
  protected readonly turmaAtual = this.contexto.turmaAtual;
  protected readonly formulario = signal<DadosMissao>({ ...FORMULARIO_VAZIO });
  protected readonly editando = signal<Missao | null>(null);
  protected readonly modalAberto = signal(false);
  protected readonly erros = signal<string[]>([]);
  protected readonly salvando = signal(false);

  protected readonly missaoParaConcluir = signal<Missao | null>(null);
  protected readonly processandoAlunoId = signal('');
  protected readonly exclusaoAberta = signal(false);
  protected readonly missaoEmExclusao = signal<Missao | null>(null);

  protected readonly indicadores = computed(() => {
    const turmaId = this.contexto.turmaId();
    const disciplinaId = this.contexto.disciplinaId();
    if (!turmaId || !disciplinaId) return [];

    const chaves = new Set<string>();
    for (const acao of this.gamificacao.acoesDoContexto(turmaId, disciplinaId)) {
      const chave = normalizarIndicador(acao.indicador);
      if (chave) chaves.add(chave);
    }
    return [...chaves].sort((primeira, segunda) => primeira.localeCompare(segunda, 'pt-BR'));
  });

  protected readonly linhas = computed<LinhaMissao[]>(() => {
    const turmaId = this.contexto.turmaId();
    const disciplinaId = this.contexto.disciplinaId();
    if (!turmaId || !disciplinaId) return [];

    return this.missoes.missoesDaTurmaEDisciplina(turmaId, disciplinaId).map((missao) => {
      const totalAlunos = this.alunos
        .porTurma(missao.turmaId)
        .filter((aluno) => aluno.ativo).length;
      const concluidos = this.missoes.conclusoesDaMissao(missao.id).length;
      return {
        missao,
        situacao: this.missoes.situacao(missao),
        concluidos,
        totalAlunos,
        percentual: totalAlunos ? Math.round((concluidos / totalAlunos) * 100) : 0,
      };
    });
  });

  protected readonly alunosDaMissaoSelecionada = computed(() => {
    const missao = this.missaoParaConcluir();
    if (!missao) return [];
    return this.alunos
      .porTurma(missao.turmaId)
      .filter((aluno) => aluno.ativo)
      .sort((primeiro, segundo) => primeiro.nome.localeCompare(segundo.nome, 'pt-BR'));
  });

  protected aoAlterarContexto(): void {
    this.fecharFormulario();
    this.fecharConclusao();
  }

  protected abrirNova(): void {
    const contexto = this.contexto.contexto();
    if (!contexto) {
      this.toast.mostrar('Selecione uma turma e uma disciplina.', 'warning');
      return;
    }

    const hoje = this.dataIsoHoje();
    this.editando.set(null);
    this.formulario.set({
      ...FORMULARIO_VAZIO,
      turmaId: contexto.turmaId,
      disciplinaId: contexto.disciplinaId,
      indicador: this.indicadores()[0] ?? '',
      inicioEm: hoje,
      fimEm: null,
    });
    this.erros.set([]);
    this.modalAberto.set(true);
  }

  protected editar(missao: Missao): void {
    this.editando.set(missao);
    this.formulario.set({
      nome: missao.nome,
      descricao: missao.descricao,
      instrucoes: missao.instrucoes,
      tipo: missao.tipo,
      turmaId: missao.turmaId,
      disciplinaId: missao.disciplinaId,
      indicador: missao.indicador,
      xpRecompensa: missao.xpRecompensa,
      moedasRecompensa: missao.moedasRecompensa,
      status: missao.status,
      inicioEm: missao.inicioEm,
      fimEm: missao.fimEm,
    });
    this.erros.set([]);
    this.modalAberto.set(true);
  }

  protected fecharFormulario(): void {
    this.modalAberto.set(false);
    this.editando.set(null);
  }

  protected alterarNome(evento: Event): void {
    this.atualizar('nome', this.valor(evento));
  }

  protected alterarDescricao(evento: Event): void {
    this.atualizar('descricao', this.valor(evento));
  }

  protected alterarInstrucoes(evento: Event): void {
    this.atualizar('instrucoes', this.valor(evento));
  }

  protected alterarTipo(evento: Event): void {
    this.atualizar('tipo', this.valor(evento) as DadosMissao['tipo']);
  }

  protected alterarIndicador(evento: Event): void {
    this.atualizar('indicador', this.valor(evento));
  }

  protected alterarXp(evento: Event): void {
    this.atualizar('xpRecompensa', Number(this.valor(evento)));
  }

  protected alterarMoedas(evento: Event): void {
    this.atualizar('moedasRecompensa', Number(this.valor(evento)));
  }

  protected alterarStatusDoFormulario(evento: Event): void {
    this.atualizar('status', this.valor(evento) as DadosMissao['status']);
  }

  protected alterarInicio(evento: Event): void {
    this.atualizar('inicioEm', this.valor(evento) || null);
  }

  protected alterarFim(evento: Event): void {
    this.atualizar('fimEm', this.valor(evento) || null);
  }

  protected async salvar(): Promise<void> {
    if (this.salvando()) return;
    this.salvando.set(true);
    const dados = this.formulario();
    const emEdicao = this.editando();

    try {
      if (emEdicao) {
        await this.missoes.atualizarMissao(emEdicao.id, dados);
        this.toast.mostrar('Missão atualizada.', 'success');
      } else {
        await this.missoes.criarMissao(dados);
        this.toast.mostrar('Missão criada.', 'success');
      }
      this.fecharFormulario();
    } catch (erro) {
      this.erros.set(this.mensagem(erro).split('\n'));
    } finally {
      this.salvando.set(false);
    }
  }

  protected async publicar(missao: Missao): Promise<void> {
    try {
      await this.missoes.publicar(missao.id);
      this.toast.mostrar('Missão publicada para a turma.', 'success');
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    }
  }

  protected async encerrar(missao: Missao): Promise<void> {
    try {
      await this.missoes.encerrar(missao.id);
      this.toast.mostrar('Missão encerrada.', 'info');
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    }
  }

  protected async arquivar(missao: Missao): Promise<void> {
    try {
      await this.missoes.arquivar(missao.id);
      this.toast.mostrar('Missão arquivada.', 'info');
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    }
  }

  protected abrirConclusao(missao: Missao): void {
    this.missaoParaConcluir.set(missao);
  }

  protected fecharConclusao(): void {
    this.missaoParaConcluir.set(null);
    this.processandoAlunoId.set('');
  }

  protected async concluirAluno(alunoId: string): Promise<void> {
    const missao = this.missaoParaConcluir();
    const autor = this.auth.usuario();
    if (!missao || !autor || this.processandoAlunoId()) return;

    this.processandoAlunoId.set(alunoId);
    try {
      const criadas = await this.missoes.concluir(missao.id, [alunoId], autor);
      this.toast.mostrar(
        criadas.length
          ? 'Missão concluída e recompensas lançadas.'
          : 'Este aluno já concluiu a missão.',
        criadas.length ? 'success' : 'info',
      );
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    } finally {
      this.processandoAlunoId.set('');
    }
  }

  protected async concluirParaTurma(): Promise<void> {
    const missao = this.missaoParaConcluir();
    const autor = this.auth.usuario();
    if (!missao || !autor || this.processandoAlunoId()) return;

    this.processandoAlunoId.set('turma');
    try {
      const criadas = await this.missoes.concluirParaTurma(missao.id, autor);
      this.toast.mostrar(
        criadas.length
          ? `${criadas.length} aluno(s) concluíram a missão.`
          : 'Todos os alunos já haviam concluído a missão.',
        criadas.length ? 'success' : 'info',
      );
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    } finally {
      this.processandoAlunoId.set('');
    }
  }

  protected async revogar(alunoId: string): Promise<void> {
    const missao = this.missaoParaConcluir();
    const autor = this.auth.usuario();
    if (!missao || !autor || this.processandoAlunoId()) return;

    const conclusao = this.missoes
      .conclusoesDaMissao(missao.id)
      .find((item) => item.alunoId === alunoId);
    if (!conclusao) return;

    this.processandoAlunoId.set(alunoId);
    try {
      await this.missoes.revogar(conclusao.id, autor);
      this.toast.mostrar('Conclusão revogada com estorno das recompensas.', 'info');
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    } finally {
      this.processandoAlunoId.set('');
    }
  }

  protected pedirExclusao(missao: Missao): void {
    this.missaoEmExclusao.set(missao);
    this.exclusaoAberta.set(true);
  }

  protected cancelarExclusao(): void {
    this.exclusaoAberta.set(false);
    this.missaoEmExclusao.set(null);
  }

  protected async confirmarExclusao(): Promise<void> {
    const missao = this.missaoEmExclusao();
    const autor = this.auth.usuario();
    if (!missao || !autor) return;

    try {
      await this.missoes.removerMissao(missao.id, autor);
      this.toast.mostrar('Missão excluída.', 'info');
      this.cancelarExclusao();
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    }
  }

  protected alunoConcluiu(alunoId: string): boolean {
    const missao = this.missaoParaConcluir();
    return missao ? this.missoes.alunoConcluiu(missao.id, alunoId) : false;
  }

  protected nomeDoAluno(alunoId: string): string {
    return this.alunos.alunos().find((aluno) => aluno.id === alunoId)?.nome ?? 'Aluno';
  }

  protected rotuloIndicador(indicador: string): string {
    return rotuloIndicador(indicador);
  }

  protected rotuloSituacaoMissao(situacao: SituacaoMissao): string {
    return rotuloDaSituacaoMissao(situacao);
  }

  protected classeSituacao(linha: LinhaMissao): string {
    return this.missoes.classeSituacao(linha.missao);
  }

  protected classeSituacaoDaMissao(missao: Missao): string {
    return this.missoes.classeSituacao(missao);
  }

  protected formatarDataHora(iso: string): string {
    return formatarDataHoraAuditoria(iso);
  }

  protected formatarRecompensas(missao: Missao): string {
    const partes: string[] = [];
    if (missao.xpRecompensa > 0) partes.push(`${missao.xpRecompensa} XP`);
    if (missao.moedasRecompensa > 0) partes.push(`${missao.moedasRecompensa} moedas`);
    return partes.join(' + ');
  }

  protected formatarPeriodo(missao: Missao): string {
    if (!missao.inicioEm && !missao.fimEm) return 'Sem prazo definido';
    if (missao.inicioEm && missao.fimEm) {
      return `${this.formatarData(missao.inicioEm)} a ${this.formatarData(missao.fimEm)}`;
    }
    if (missao.inicioEm) return `A partir de ${this.formatarData(missao.inicioEm)}`;
    return `Até ${this.formatarData(missao.fimEm as string)}`;
  }

  protected rotuloTipo(missao: Missao): string {
    return missao.tipo === 'turma' ? 'Coletiva' : 'Individual';
  }

  protected descricaoTipo(tipo: DadosMissao['tipo']): string {
    return this.tipos.find((item) => item.valor === tipo)?.descricao ?? '';
  }

  protected podeConcluir(missao: Missao): boolean {
    return this.missoes.podeReceberConclusao(missao);
  }

  protected estaProcessando(chave: string): boolean {
    return this.processandoAlunoId() === chave;
  }

  private atualizar<Campo extends keyof DadosMissao>(
    campo: Campo,
    valor: DadosMissao[Campo],
  ): void {
    this.formulario.update((atual) => ({ ...atual, [campo]: valor }));
  }

  private valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  private formatarData(dataIso: string): string {
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  private dataIsoHoje(): string {
    const agora = new Date();
    const mes = `${agora.getMonth() + 1}`.padStart(2, '0');
    const dia = `${agora.getDate()}`.padStart(2, '0');
    return `${agora.getFullYear()}-${mes}-${dia}`;
  }

  private mensagem(erro: unknown): string {
    return erro instanceof Error ? erro.message : 'Não foi possível concluir a operação.';
  }
}
