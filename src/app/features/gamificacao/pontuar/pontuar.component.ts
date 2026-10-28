import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { Aluno } from '../../../core/models';
import {
  LinhaHistoricoXp,
  criarChaveIdempotencia,
  formatarDeltaXp,
} from '../../../core/models/gamificacao.model';
import { formatarDataHoraAuditoria } from '../../../core/models/auditoria.model';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { ContextoGamificacaoService } from '../../../core/services/contexto-gamificacao.service';
import { GamificacaoService } from '../../../core/services/gamificacao.service';
import { ToastService } from '../../../core/services/toast.service';
import { GamificacaoContextoComponent } from '../../../shared/gamificacao-contexto/gamificacao-contexto.component';

/**
 * Lançamento de XP pela equipe (RF-015). O professor escolhe o contexto de
 * turma + disciplina, a ação e os alunos; a prévia mostra quantos alunos e
 * quantos pontos serão afetados. O envio usa uma chave de lote para impedir
 * lançamentos duplicados.
 */
@Component({
  selector: 'app-pontuar',
  imports: [GamificacaoContextoComponent],
  templateUrl: './pontuar.component.html',
  styleUrl: './pontuar.component.scss',
})
export class PontuarComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly alunos = inject(AlunosService);
  protected readonly gamificacao = inject(GamificacaoService);
  protected readonly contexto = inject(ContextoGamificacaoService);
  private readonly toast = inject(ToastService);

  private readonly routePai = this.route.parent;

  protected readonly turmaIdQuery = toSignal(
    (this.routePai?.paramMap ?? this.route.queryParamMap).pipe(
      map((params) => params.get('id') ?? params.get('turmaId') ?? ''),
    ),
    {
      initialValue:
        this.routePai?.snapshot.paramMap.get('id') ??
        this.route.snapshot.queryParamMap.get('turmaId') ??
        '',
    },
  );
  protected readonly disciplinaIdQuery = toSignal(
    (this.routePai?.paramMap ?? this.route.queryParamMap).pipe(
      map((params) => params.get('disciplinaId') ?? ''),
    ),
    {
      initialValue:
        this.routePai?.snapshot.paramMap.get('disciplinaId') ??
        this.route.snapshot.queryParamMap.get('disciplinaId') ??
        '',
    },
  );

  protected readonly acaoId = signal('');
  protected readonly selecionados = signal<Set<string>>(new Set());
  protected readonly salvando = signal(false);

  protected readonly alunosDaTurma = computed<Aluno[]>(() => {
    const turmaId = this.contexto.turmaId();
    if (!turmaId) return [];
    return [...this.alunos.porTurma(turmaId)]
      .filter((aluno) => aluno.ativo)
      .sort((primeiro, segundo) => primeiro.nome.localeCompare(segundo.nome, 'pt-BR'));
  });

  protected readonly acoesDisponiveis = computed(() =>
    this.gamificacao.acoesAtivasDoContexto(this.contexto.turmaId(), this.contexto.disciplinaId()),
  );

  protected readonly acaoEfetiva = computed(() => {
    const selecionada = this.acaoId();
    const ativas = this.acoesDisponiveis();
    return ativas.find((acao) => acao.id === selecionada) ?? ativas[0] ?? null;
  });

  protected readonly acaoEfetivaId = computed(() => this.acaoEfetiva()?.id ?? '');

  protected readonly selecionadosValidos = computed<Aluno[]>(() => {
    const ids = this.selecionados();
    return this.alunosDaTurma().filter((aluno) => ids.has(aluno.id));
  });

  protected readonly totalPrevisto = computed(
    () => this.selecionadosValidos().length * (this.acaoEfetiva()?.valorXp ?? 0),
  );

  protected readonly todosSelecionados = computed(() => {
    const alunos = this.alunosDaTurma();
    return alunos.length > 0 && alunos.every((aluno) => this.selecionados().has(aluno.id));
  });

  protected readonly xpPorAluno = computed(() =>
    this.gamificacao.xpPorAlunoNoContexto(this.contexto.turmaId(), this.contexto.disciplinaId()),
  );

  protected readonly historico = computed<LinhaHistoricoXp[]>(() => {
    const turmaId = this.contexto.turmaId();
    const disciplinaId = this.contexto.disciplinaId();
    if (!turmaId || !disciplinaId) return [];

    const estornados = new Set(
      this.gamificacao
        .eventos()
        .map((evento) => evento.estornoDe)
        .filter((eventoId): eventoId is string => Boolean(eventoId)),
    );
    const nomesPorAluno = new Map(this.alunos.alunos().map((aluno) => [aluno.id, aluno.nome]));
    return this.gamificacao.eventosDaTurmaEDisciplina(turmaId, disciplinaId).map((evento) => ({
      evento,
      alunoNome: nomesPorAluno.get(evento.alunoId) ?? 'Aluno removido',
      estornado: estornados.has(evento.id),
    }));
  });

  constructor() {
    effect(() => {
      const turmaId = this.turmaIdQuery();
      const disciplinaId = this.disciplinaIdQuery();
      const turmasDisponiveis = this.contexto.turmasDisponiveis();

      if (turmaId && turmasDisponiveis.some((turma) => turma.id === turmaId)) {
        this.contexto.selecionarContexto(turmaId, disciplinaId);
      }
    });
  }

  protected aoAlterarContexto(): void {
    this.acaoId.set('');
    this.selecionados.set(new Set());
  }

  protected alterarAcao(evento: Event): void {
    this.acaoId.set(this.valorDoCampo(evento));
  }

  protected alternarAluno(evento: Event, alunoId: string): void {
    const marcado = (evento.target as HTMLInputElement).checked;
    this.selecionados.update((atual) => {
      const proximo = new Set(atual);
      if (marcado) proximo.add(alunoId);
      else proximo.delete(alunoId);
      return proximo;
    });
  }

  protected selecionarTodos(evento: Event): void {
    const marcado = (evento.target as HTMLInputElement).checked;
    this.selecionados.set(
      marcado ? new Set(this.alunosDaTurma().map((aluno) => aluno.id)) : new Set(),
    );
  }

  protected async registrar(): Promise<void> {
    const acao = this.acaoEfetiva();
    const alunosSelecionados = this.selecionadosValidos();
    const autor = this.auth.usuario();
    if (!acao || !alunosSelecionados.length || !autor || this.salvando()) return;

    this.salvando.set(true);
    try {
      const eventos = await this.gamificacao.registrarPontuacao(
        acao.id,
        alunosSelecionados.map((aluno) => aluno.id),
        autor,
        criarChaveIdempotencia(),
      );
      if (eventos.length) {
        const total = eventos.reduce((soma, evento) => soma + evento.deltaXp, 0);
        this.toast.mostrar(
          `${eventos.length} aluno(s) pontuado(s): ${formatarDeltaXp(total)} XP no total.`,
          'success',
        );
      } else {
        this.toast.mostrar('Este lote já havia sido registrado.', 'info');
      }
      this.selecionados.set(new Set());
    } catch (erro) {
      this.toast.mostrar(this.mensagemDeErro(erro), 'danger');
    } finally {
      this.salvando.set(false);
    }
  }

  protected async estornar(linha: LinhaHistoricoXp): Promise<void> {
    const autor = this.auth.usuario();
    if (!autor || !this.podeEstornar(linha)) return;
    try {
      await this.gamificacao.estornar(linha.evento.id, autor);
      this.toast.mostrar('Lançamento estornado.', 'info');
    } catch (erro) {
      this.toast.mostrar(this.mensagemDeErro(erro), 'danger');
    }
  }

  protected podeEstornar(linha: LinhaHistoricoXp): boolean {
    return !linha.evento.estornoDe && !linha.estornado;
  }

  protected formatarDeltaXp(deltaXp: number): string {
    return formatarDeltaXp(deltaXp);
  }

  protected formatarDataHora(iso: string): string {
    return formatarDataHoraAuditoria(iso);
  }

  private valorDoCampo(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }

  private mensagemDeErro(erro: unknown): string {
    return erro instanceof Error ? erro.message : 'Não foi possível lançar o XP.';
  }
}
