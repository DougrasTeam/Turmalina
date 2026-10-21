import { Component, computed, inject, signal } from '@angular/core';

import {
  CONQUISTAS_PADRAO,
  Conquista,
  DadosConquista,
  EMOJIS_CONQUISTA,
} from '../../../core/models/conquistas.model';
import { formatarDataHoraAuditoria } from '../../../core/models/auditoria.model';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConquistasService } from '../../../core/services/conquistas.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmarTextoComponent } from '../../../shared/confirmar-texto/confirmar-texto.component';
import { ModalComponent } from '../../../shared/modal/modal.component';

const FORMULARIO_VAZIO: DadosConquista = {
  nome: '',
  emoji: '🌟',
  descricao: '',
  bonusXp: 10,
  ativa: true,
};

@Component({
  selector: 'app-conquistas',
  imports: [ModalComponent, ConfirmarTextoComponent],
  templateUrl: './conquistas.component.html',
  styleUrl: './conquistas.component.scss',
})
export class ConquistasComponent {
  protected readonly conquistas = inject(ConquistasService);
  protected readonly alunos = inject(AlunosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly emojis = EMOJIS_CONQUISTA;
  protected readonly formulario = signal<DadosConquista>({ ...FORMULARIO_VAZIO });
  protected readonly editando = signal<Conquista | null>(null);
  protected readonly modalAberto = signal(false);
  protected readonly erros = signal<string[]>([]);

  protected readonly alunoSelecionado = signal<string>('');
  protected readonly chaveDesbloqueio = signal('');
  protected readonly desbloqueando = signal(false);

  protected readonly conquistaParaDesbloquear = signal<Conquista | null>(null);
  protected readonly exclusaoAberta = signal(false);
  protected readonly conquistaEmExclusao = signal<Conquista | null>(null);
  protected readonly excluirTudoAberto = signal(false);

  protected readonly alunosAtivos = computed(() =>
    [...this.alunos.alunos()].filter((aluno) => aluno.ativo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  );

  protected readonly desbloqueadosDaConquista = computed(() => {
    const conquista = this.conquistaParaDesbloquear();
    if (!conquista) return [];
    return this.conquistas.desbloqueios().filter((item) => item.conquistaId === conquista.id);
  });

  protected abrirNovo(): void {
    this.editando.set(null);
    this.formulario.set({ ...FORMULARIO_VAZIO });
    this.erros.set([]);
    this.modalAberto.set(true);
  }

  protected editar(conquista: Conquista): void {
    this.editando.set(conquista);
    this.formulario.set({
      nome: conquista.nome,
      emoji: conquista.emoji,
      descricao: conquista.descricao,
      bonusXp: conquista.bonusXp,
      ativa: conquista.ativa,
    });
    this.erros.set([]);
    this.modalAberto.set(true);
  }

  protected fechar(): void {
    this.modalAberto.set(false);
    this.editando.set(null);
  }

  protected alterarNome(evento: Event): void {
    this.atualizar('nome', this.valor(evento));
  }

  protected alterarEmoji(evento: Event): void {
    this.atualizar('emoji', this.valor(evento));
  }

  protected alterarDescricao(evento: Event): void {
    this.atualizar('descricao', this.valor(evento));
  }

  protected alterarBonusXp(evento: Event): void {
    this.atualizar('bonusXp', Number(this.valor(evento)));
  }

  protected alterarAtiva(evento: Event): void {
    this.atualizar('ativa', (evento.target as HTMLInputElement).checked);
  }

  protected async salvar(): Promise<void> {
    const dados = this.formulario();
    const emEdicao = this.editando();
    try {
      if (emEdicao) {
        await this.conquistas.atualizarConquista(emEdicao.id, dados);
        this.toast.mostrar('Conquista atualizada.', 'success');
      } else {
        await this.conquistas.criarConquista(dados);
        this.toast.mostrar('Conquista criada.', 'success');
      }
      this.fechar();
    } catch (erro) {
      this.erros.set(this.mensagem(erro).split('\n'));
    }
  }

  protected async alternar(conquista: Conquista): Promise<void> {
    await this.conquistas.alternarAtiva(conquista.id);
    this.toast.mostrar(conquista.ativa ? 'Conquista desativada.' : 'Conquista ativada.', 'info');
  }

  protected abrirDesbloqueio(conquista: Conquista): void {
    this.conquistaParaDesbloquear.set(conquista);
    this.alunoSelecionado.set('');
    this.chaveDesbloqueio.set(this.gerarChave());
  }

  protected fecharDesbloqueio(): void {
    this.conquistaParaDesbloquear.set(null);
  }

  protected selecionarAluno(evento: Event): void {
    this.alunoSelecionado.set(this.valor(evento));
  }

  protected async desbloquear(): Promise<void> {
    const conquista = this.conquistaParaDesbloquear();
    const alunoId = this.alunoSelecionado();
    const autor = this.auth.usuario();
    if (!conquista || !alunoId || !autor || this.desbloqueando()) return;

    this.desbloqueando.set(true);
    try {
      const criados = await this.conquistas.desbloquear(conquista.id, [alunoId], autor, this.chaveDesbloqueio());
      this.toast.mostrar(
        criados.length ? 'Conquista desbloqueada e bônus de XP concedido.' : 'Conquista já desbloqueada ou lote já processado.',
        criados.length ? 'success' : 'info',
      );
      if (criados.length) {
        this.chaveDesbloqueio.set(this.gerarChave());
      }
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    } finally {
      this.desbloqueando.set(false);
    }
  }

  protected async reverter(item: { id: string }): Promise<void> {
    const autor = this.auth.usuario();
    if (!autor) return;
    try {
      await this.conquistas.reverter(item.id, autor);
      this.toast.mostrar('Desbloqueio revertido (com estorno de XP quando aplicável).', 'info');
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    }
  }

  protected pedirExclusao(conquista: Conquista): void {
    this.conquistaEmExclusao.set(conquista);
    this.exclusaoAberta.set(true);
  }

  protected cancelarExclusao(): void {
    this.exclusaoAberta.set(false);
    this.conquistaEmExclusao.set(null);
  }

  protected async confirmarExclusao(): Promise<void> {
    const conquista = this.conquistaEmExclusao();
    if (!conquista) return;
    try {
      await this.conquistas.removerConquista(conquista.id);
      this.toast.mostrar('Conquista excluída.', 'info');
      this.cancelarExclusao();
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    }
  }

  protected abrirExclusaoTodas(): void {
    this.excluirTudoAberto.set(true);
  }

  protected fecharExclusaoTodas(): void {
    this.excluirTudoAberto.set(false);
  }

  protected async excluirTodas(): Promise<void> {
    try {
      await this.conquistas.removerTodasConquistas();
      this.toast.mostrar('Todas as conquistas foram excluídas.', 'info');
      this.excluirTudoAberto.set(false);
    } catch (erro) {
      this.toast.mostrar(this.mensagem(erro), 'danger');
    }
  }

  protected usarPadroes(): void {
    for (const dados of CONQUISTAS_PADRAO) {
      void this.conquistas.criarConquista(dados).catch(() => undefined);
    }
    this.toast.mostrar('Conquistas padrão semeadas.', 'info');
  }

  protected formatarBonus(bonus: number): string {
    return bonus > 0 ? `+${bonus} XP` : `${bonus} XP`;
  }

  protected formatarDataHora(iso: string): string {
    return formatarDataHoraAuditoria(iso);
  }

  private atualizar<Campo extends keyof DadosConquista>(campo: Campo, valor: DadosConquista[Campo]): void {
    this.formulario.update((atual) => ({ ...atual, [campo]: valor }));
  }

  private valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  private gerarChave(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  }

  private mensagem(erro: unknown): string {
    return erro instanceof Error ? erro.message : 'Não foi possível concluir a operação.';
  }
}
