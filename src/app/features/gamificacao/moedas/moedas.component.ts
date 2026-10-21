import { Component, computed, inject, signal } from '@angular/core';

import { formatarDataHoraAuditoria } from '../../../core/models/auditoria.model';
import {
  DadosMovimentacaoMoeda,
  LinhaExtratoMoeda,
  formatarDeltaMoedas,
  rotuloOrigemMoeda,
} from '../../../core/models/moedas.model';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { MoedasService } from '../../../core/services/moedas.service';
import { ToastService } from '../../../core/services/toast.service';

const FORMULARIO_VAZIO: DadosMovimentacaoMoeda = {
  alunoId: '',
  turmaId: null,
  delta: 0,
  origem: 'manual',
  descricao: '',
  autorId: null,
  autorNome: '',
  idempotencyKey: '',
  estornoDe: null,
  referenciaId: null,
};

@Component({
  selector: 'app-moedas',
  templateUrl: './moedas.component.html',
  styleUrl: './moedas.component.scss',
})
export class MoedasComponent {
  protected readonly moedas = inject(MoedasService);
  protected readonly alunos = inject(AlunosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly origemSelecionada = signal('todas');
  protected readonly formulario = signal<DadosMovimentacaoMoeda>({ ...FORMULARIO_VAZIO });
  protected readonly ajustando = signal(false);

  protected readonly alunosAtivos = computed(() =>
    [...this.alunos.alunos()].filter((aluno) => aluno.ativo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  );

  protected readonly extrato = computed<LinhaExtratoMoeda[]>(() => {
    const origem = this.origemSelecionada();
    const nomesPorId = new Map(this.alunos.alunos().map((aluno) => [aluno.id, aluno.nome]));
    return this.moedas
      .movimentacoes()
      .filter((movimentacao) => origem === 'todas' || movimentacao.origem === origem)
      .map((movimentacao) => ({
        movimentacao,
        alunoNome: nomesPorId.get(movimentacao.alunoId) ?? 'Aluno removido',
        estornada: this.moedas.estaEstornada(movimentacao.id),
      }));
  });

  protected alterarOrigem(evento: Event): void {
    this.origemSelecionada.set(this.valor(evento));
  }

  protected alterarAluno(evento: Event): void {
    this.atualizar('alunoId', this.valor(evento));
  }

  protected alterarDelta(evento: Event): void {
    this.atualizar('delta', Number(this.valor(evento)));
  }

  protected alterarDescricao(evento: Event): void {
    this.atualizar('descricao', this.valor(evento));
  }

  protected async ajustar(): Promise<void> {
    const autor = this.auth.usuario();
    const dados = this.formulario();
    if (!autor) return;

    try {
      await this.moedas.ajustar({ ...dados, autorId: autor.id, autorNome: autor.nome });
      this.toast.mostrar('Movimentação de moedas registrada.', 'success');
      this.formulario.set({ ...FORMULARIO_VAZIO });
      this.ajustando.set(false);
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    }
  }

  protected async estornar(linha: LinhaExtratoMoeda): Promise<void> {
    const autor = this.auth.usuario();
    if (!autor) return;
    try {
      await this.moedas.estornar(linha.movimentacao.id, autor.nome);
      this.toast.mostrar('Movimentação estornada.', 'info');
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    }
  }

  protected formatarDelta(delta: number): string {
    return formatarDeltaMoedas(delta);
  }

  protected rotuloOrigem(origem: string): string {
    return rotuloOrigemMoeda(origem as Parameters<typeof rotuloOrigemMoeda>[0]);
  }

  protected formatarDataHora(iso: string): string {
    return formatarDataHoraAuditoria(iso);
  }

  private atualizar<Campo extends keyof DadosMovimentacaoMoeda>(campo: Campo, valor: DadosMovimentacaoMoeda[Campo]): void {
    this.formulario.update((atual) => ({ ...atual, [campo]: valor }));
  }

  private valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  private mensagem(erro: unknown): string {
    return erro instanceof Error ? erro.message : 'Não foi possível concluir a operação.';
  }
}
