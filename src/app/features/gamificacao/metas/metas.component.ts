import { Component, computed, inject, signal } from '@angular/core';

import {
  DadosMeta,
  Meta,
  ProgressoMetaAluno,
  normalizarIndicador,
  rotuloIndicador,
} from '../../../core/models/missoes-metas.model';
import { formatarDataHoraAuditoria } from '../../../core/models/auditoria.model';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { ContextoGamificacaoService } from '../../../core/services/contexto-gamificacao.service';
import { GamificacaoService } from '../../../core/services/gamificacao.service';
import { MetasService } from '../../../core/services/metas.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmarTextoComponent } from '../../../shared/confirmar-texto/confirmar-texto.component';
import { GamificacaoContextoComponent } from '../../../shared/gamificacao-contexto/gamificacao-contexto.component';
import { ModalComponent } from '../../../shared/modal/modal.component';

interface LinhaMeta {
  meta: Meta;
  progressos: ProgressoMetaAluno[];
  totalAlunos: number;
  elegiveis: number;
  concedidas: number;
  percentualMedio: number;
}

const FORMULARIO_VAZIO: DadosMeta = {
  nome: '',
  descricao: '',
  turmaId: '',
  disciplinaId: '',
  indicador: '',
  quantidade: 5,
  recompensaXp: 20,
  recompensaMoedas: 0,
  ativa: true,
};

@Component({
  selector: 'app-metas',
  imports: [ModalComponent, ConfirmarTextoComponent, GamificacaoContextoComponent],
  templateUrl: './metas.component.html',
  styleUrl: './metas.component.scss',
})
export class MetasComponent {
  protected readonly metas = inject(MetasService);
  protected readonly alunos = inject(AlunosService);
  protected readonly gamificacao = inject(GamificacaoService);
  protected readonly contexto = inject(ContextoGamificacaoService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly turmaId = this.contexto.turmaId;
  protected readonly turmaAtual = this.contexto.turmaAtual;
  protected readonly formulario = signal<DadosMeta>({ ...FORMULARIO_VAZIO });
  protected readonly editando = signal<Meta | null>(null);
  protected readonly modalAberto = signal(false);
  protected readonly erros = signal<string[]>([]);
  protected readonly salvando = signal(false);

  protected readonly metaParaConceder = signal<Meta | null>(null);
  protected readonly processandoAlunoId = signal('');
  protected readonly exclusaoAberta = signal(false);
  protected readonly metaEmExclusao = signal<Meta | null>(null);

  protected readonly indicadores = computed(() => {
    const turmaId = this.contexto.turmaId();
    const disciplinaId = this.contexto.disciplinaId();
    if (!turmaId || !disciplinaId) return [];

    const chaves = new Set<string>();
    for (const acao of this.gamificacao.acoesDoContexto(turmaId, disciplinaId)) {
      const chave = normalizarIndicador(acao.indicador);
      if (chave) chaves.add(chave);
    }
    for (const meta of this.metas.metasDaTurmaEDisciplina(turmaId, disciplinaId)) {
      const chave = normalizarIndicador(meta.indicador);
      if (chave) chaves.add(chave);
    }
    return [...chaves].sort((primeira, segunda) => primeira.localeCompare(segunda, 'pt-BR'));
  });

  protected readonly linhas = computed<LinhaMeta[]>(() => {
    const turmaId = this.contexto.turmaId();
    const disciplinaId = this.contexto.disciplinaId();
    if (!turmaId || !disciplinaId) return [];

    return this.metas.metasDaTurmaEDisciplina(turmaId, disciplinaId).map((meta) => {
      const progressos = this.metas.progressosDaMeta(meta);
      const somaPercentuais = progressos.reduce(
        (total, progresso) => total + progresso.percentual,
        0,
      );
      return {
        meta,
        progressos,
        totalAlunos: progressos.length,
        elegiveis: progressos.filter((progresso) => progresso.status === 'disponivel').length,
        concedidas: progressos.filter((progresso) => progresso.status === 'concedida').length,
        percentualMedio: progressos.length ? Math.round(somaPercentuais / progressos.length) : 0,
      };
    });
  });

  protected readonly progressosDaMetaSelecionada = computed<ProgressoMetaAluno[]>(() => {
    const meta = this.metaParaConceder();
    return meta ? this.metas.progressosDaMeta(meta) : [];
  });

  protected aoAlterarContexto(): void {
    this.fecharFormulario();
    this.fecharConcessao();
  }

  protected abrirNova(): void {
    const contexto = this.contexto.contexto();
    if (!contexto) {
      this.toast.mostrar('Selecione uma turma e uma disciplina.', 'warning');
      return;
    }

    this.editando.set(null);
    this.formulario.set({
      ...FORMULARIO_VAZIO,
      turmaId: contexto.turmaId,
      disciplinaId: contexto.disciplinaId,
      indicador: this.indicadores()[0] ?? '',
    });
    this.erros.set([]);
    this.modalAberto.set(true);
  }

  protected editar(meta: Meta): void {
    this.editando.set(meta);
    this.formulario.set({
      nome: meta.nome,
      descricao: meta.descricao,
      turmaId: meta.turmaId,
      disciplinaId: meta.disciplinaId,
      indicador: meta.indicador,
      quantidade: meta.quantidade,
      recompensaXp: meta.recompensaXp,
      recompensaMoedas: meta.recompensaMoedas,
      ativa: meta.ativa,
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

  protected alterarIndicador(evento: Event): void {
    this.atualizar('indicador', this.valor(evento));
  }

  protected alterarQuantidade(evento: Event): void {
    this.atualizar('quantidade', Number(this.valor(evento)));
  }

  protected alterarRecompensaXp(evento: Event): void {
    this.atualizar('recompensaXp', Number(this.valor(evento)));
  }

  protected alterarRecompensaMoedas(evento: Event): void {
    this.atualizar('recompensaMoedas', Number(this.valor(evento)));
  }

  protected alterarAtiva(evento: Event): void {
    this.atualizar('ativa', (evento.target as HTMLInputElement).checked);
  }

  protected async salvar(): Promise<void> {
    if (this.salvando()) return;
    this.salvando.set(true);
    const dados = this.formulario();
    const emEdicao = this.editando();

    try {
      if (emEdicao) {
        await this.metas.atualizarMeta(emEdicao.id, dados);
        this.toast.mostrar('Meta atualizada.', 'success');
      } else {
        await this.metas.criarMeta(dados);
        this.toast.mostrar('Meta criada.', 'success');
      }
      this.fecharFormulario();
    } catch (erro) {
      this.erros.set(this.mensagem(erro).split('\n'));
    } finally {
      this.salvando.set(false);
    }
  }

  protected async alternarAtiva(meta: Meta): Promise<void> {
    try {
      await this.metas.alternarAtiva(meta.id);
      this.toast.mostrar(meta.ativa ? 'Meta desativada.' : 'Meta ativada.', 'info');
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    }
  }

  protected abrirConcessao(meta: Meta): void {
    this.metaParaConceder.set(meta);
  }

  protected fecharConcessao(): void {
    this.metaParaConceder.set(null);
    this.processandoAlunoId.set('');
  }

  protected async conceder(progresso: ProgressoMetaAluno): Promise<void> {
    const autor = this.auth.usuario();
    if (!autor || this.processandoAlunoId()) return;

    this.processandoAlunoId.set(progresso.alunoId);
    try {
      const concessao = await this.metas.conceder(progresso.meta.id, progresso.alunoId, autor);
      this.toast.mostrar(
        concessao ? 'Meta concedida e recompensas lançadas.' : 'Esta meta já havia sido concedida.',
        concessao ? 'success' : 'info',
      );
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    } finally {
      this.processandoAlunoId.set('');
    }
  }

  protected async concederParaElegiveis(): Promise<void> {
    const meta = this.metaParaConceder();
    const autor = this.auth.usuario();
    if (!meta || !autor || this.processandoAlunoId()) return;

    this.processandoAlunoId.set('todos');
    try {
      const concessoes = await this.metas.concederParaElegiveis(meta.id, autor);
      this.toast.mostrar(
        concessoes.length
          ? `${concessoes.length} aluno(s) receberam a recompensa.`
          : 'Nenhum aluno elegível no momento.',
        concessoes.length ? 'success' : 'info',
      );
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    } finally {
      this.processandoAlunoId.set('');
    }
  }

  protected async revogar(progresso: ProgressoMetaAluno): Promise<void> {
    const autor = this.auth.usuario();
    if (!autor || this.processandoAlunoId()) return;
    const concessao = this.metas.concessaoDoAluno(progresso.meta.id, progresso.alunoId);
    if (!concessao) return;

    this.processandoAlunoId.set(progresso.alunoId);
    try {
      await this.metas.revogar(concessao.id, autor);
      this.toast.mostrar('Concessão revogada com estorno das recompensas.', 'info');
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    } finally {
      this.processandoAlunoId.set('');
    }
  }

  protected pedirExclusao(meta: Meta): void {
    this.metaEmExclusao.set(meta);
    this.exclusaoAberta.set(true);
  }

  protected cancelarExclusao(): void {
    this.exclusaoAberta.set(false);
    this.metaEmExclusao.set(null);
  }

  protected async confirmarExclusao(): Promise<void> {
    const meta = this.metaEmExclusao();
    const autor = this.auth.usuario();
    if (!meta || !autor) return;

    try {
      await this.metas.removerMeta(meta.id, autor);
      this.toast.mostrar('Meta excluída.', 'info');
      this.cancelarExclusao();
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    }
  }

  protected nomeDoAluno(alunoId: string): string {
    return this.alunos.alunos().find((aluno) => aluno.id === alunoId)?.nome ?? 'Aluno';
  }

  protected rotuloIndicador(indicador: string): string {
    return rotuloIndicador(indicador);
  }

  protected formatarDataHora(iso: string): string {
    return formatarDataHoraAuditoria(iso);
  }

  protected classeStatus(progresso: ProgressoMetaAluno): string {
    return this.metas.classeStatus(progresso);
  }

  protected rotuloStatus(progresso: ProgressoMetaAluno): string {
    return this.metas.formatarStatus(progresso);
  }

  protected formatarRecompensas(meta: Meta): string {
    const partes: string[] = [];
    if (meta.recompensaXp > 0) partes.push(`${meta.recompensaXp} XP`);
    if (meta.recompensaMoedas > 0) partes.push(`${meta.recompensaMoedas} moedas`);
    return partes.join(' + ');
  }

  protected totalElegiveis(): number {
    return this.progressosDaMetaSelecionada().filter(
      (progresso) => progresso.status === 'disponivel',
    ).length;
  }

  protected estaProcessando(alunoId: string): boolean {
    return this.processandoAlunoId() === alunoId;
  }

  private atualizar<Campo extends keyof DadosMeta>(campo: Campo, valor: DadosMeta[Campo]): void {
    this.formulario.update((atual) => ({ ...atual, [campo]: valor }));
  }

  private valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  private mensagem(erro: unknown): string {
    return erro instanceof Error ? erro.message : 'Não foi possível concluir a operação.';
  }
}
