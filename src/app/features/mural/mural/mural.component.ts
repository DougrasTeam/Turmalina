import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { FeedPublicacoesComponent } from '../feed-publicacoes/feed-publicacoes.component';
import { PublicacaoFormComponent } from '../publicacao-form/publicacao-form.component';
import { ComunicadoFormComponent } from '../comunicado-form/comunicado-form.component';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { ComunicadosService } from '../../../core/services/comunicados.service';
import { ProfessoresService } from '../../../core/services/professores.service';
import { PublicacoesService } from '../../../core/services/publicacoes.service';
import { ToastService } from '../../../core/services/toast.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { Aluno, Professor, Turma } from '../../../core/models';
import {
  FILTRO_PUBLICACOES_PADRAO,
  FiltroPublicacoes,
  aplicarFiltroPublicacoes,
} from '../../../core/models/filtro-publicacoes.model';
import {
  Comunicado,
  classeTipoComunicado,
  rotuloTipoComunicado,
} from '../../../core/models/comunicado.model';
import { Publicacao } from '../../../core/models/publicacao.model';

type Aba = 'feed' | 'recados';

@Component({
  selector: 'app-mural',
  imports: [
    ModalComponent,
    FeedPublicacoesComponent,
    PublicacaoFormComponent,
    ComunicadoFormComponent,
  ],
  templateUrl: './mural.component.html',
  styleUrl: './mural.component.scss',
})
export class MuralComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);
  protected readonly publicacoes = inject(PublicacoesService);
  protected readonly comunicados = inject(ComunicadosService);
  protected readonly turmas = inject(TurmasService);
  protected readonly alunos = inject(AlunosService);
  private readonly professores = inject(ProfessoresService);
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

  protected readonly aba = signal<Aba>('feed');

  protected readonly filtro = signal<FiltroPublicacoes>(FILTRO_PUBLICACOES_PADRAO);

  protected readonly formPublicacaoAberto = signal(false);
  protected readonly publicacaoEditando = signal<Publicacao | null>(null);
  protected readonly publicacaoExcluindo = signal<Publicacao | null>(null);

  protected readonly formComunicadoAberto = signal(false);
  protected readonly alunoSelecionadoId = signal('');
  protected readonly comunicadoExcluindo = signal<Comunicado | null>(null);

  protected readonly autorIdAtual = computed(() => this.auth.usuario()?.id ?? null);
  protected readonly gerenciarTudo = computed(() => this.auth.papel() === 'administrador');

  private readonly professorProprio = computed<Professor | null>(() => {
    const usuario = this.auth.usuario();
    if (!usuario || usuario.papel !== 'professor') return null;
    return (
      this.professores
        .professores()
        .find(
          (professor) => professor.userId === usuario.id || professor.email === usuario.email,
        ) ?? null
    );
  });

  /** Turmas que o usuário pode publicar: todas para admin, as próprias para o professor. */
  protected readonly turmasDisponiveis = computed<Turma[]>(() => {
    if (this.auth.papel() === 'administrador') return this.turmas.turmas();
    const professor = this.professorProprio();
    if (!professor) return [];
    return this.turmas
      .turmas()
      .filter((turma) => (turma.professorIds ?? []).includes(professor.id));
  });

  private readonly turmasPermitidas = computed(
    () => new Set(this.turmasDisponiveis().map((turma) => turma.id)),
  );

  /** Nome de cada turma por id, usado pelo feed para exibir o destino. */
  protected readonly nomesTurmas = computed<Record<string, string>>(() => {
    const mapa: Record<string, string> = {};
    for (const turma of this.turmas.turmas()) {
      mapa[turma.id] = turma.nome;
    }
    return mapa;
  });

  /** Publicações que o usuário pode ver, antes do filtro de visualização. */
  protected readonly publicacoesVisiveis = computed<Publicacao[]>(() => {
    if (this.auth.papel() === 'administrador') return this.publicacoes.ordenadas();
    const permitidas = this.turmasPermitidas();
    return this.publicacoes
      .ordenadas()
      .filter((publicacao) => publicacao.turmaId === null || permitidas.has(publicacao.turmaId));
  });

  protected readonly publicacoesFiltradas = computed<Publicacao[]>(() =>
    aplicarFiltroPublicacoes(this.publicacoesVisiveis(), this.filtro(), this.autorIdAtual()),
  );

  protected readonly valorFiltro = computed(() => {
    const filtro = this.filtro();
    if (filtro.escopo === 'escola') return 'escola';
    if (filtro.escopo === 'turma') return filtro.turmaId;
    return '';
  });

  protected readonly alunosDisponiveis = computed<Aluno[]>(() => {
    const lista =
      this.auth.papel() === 'administrador' ? this.alunos.alunos() : this.alunosDaEquipe();
    return [...lista].sort((a, b) => a.nome.localeCompare(b.nome));
  });

  protected readonly alunoSelecionado = computed<Aluno | null>(
    () => this.alunosDisponiveis().find((aluno) => aluno.id === this.alunoSelecionadoId()) ?? null,
  );

  protected readonly comunicadosDoAluno = computed<Comunicado[]>(() => {
    const aluno = this.alunoSelecionado();
    return aluno ? this.comunicados.porAluno(aluno.id) : [];
  });

  private alunosDaEquipe(): Aluno[] {
    const permitidas = this.turmasPermitidas();
    return this.alunos.alunos().filter((aluno) => permitidas.has(aluno.turmaId));
  }

  protected trocarAba(aba: Aba): void {
    this.aba.set(aba);
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }

  protected alterarEscopo(evento: Event): void {
    const valor = this.valor(evento);
    const escopo = valor === 'escola' ? 'escola' : valor ? 'turma' : 'tudo';
    this.filtro.update((atual) => ({
      ...atual,
      escopo,
      turmaId: escopo === 'turma' ? valor : '',
    }));
  }

  protected alternarApenasMeus(): void {
    this.filtro.update((atual) => ({ ...atual, apenasMeus: !atual.apenasMeus }));
  }

  protected formatarDataHora(iso: string): string {
    const data = new Date(iso);
    return Number.isNaN(data.getTime())
      ? iso
      : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  protected tipoComunicado(comunicado: Comunicado): string {
    return rotuloTipoComunicado(comunicado.tipo);
  }

  protected classeComunicado(comunicado: Comunicado): string {
    return classeTipoComunicado(comunicado.tipo);
  }

  protected abrirNovaPublicacao(): void {
    this.publicacaoEditando.set(null);
    this.formPublicacaoAberto.set(true);
  }

  protected abrirEdicaoPublicacao(publicacao: Publicacao): void {
    this.publicacaoEditando.set(publicacao);
    this.formPublicacaoAberto.set(true);
  }

  protected fecharFormPublicacao(): void {
    this.formPublicacaoAberto.set(false);
  }

  protected onPublicacaoSalva(): void {
    this.formPublicacaoAberto.set(false);
  }

  protected async arquivarPublicacao(publicacao: Publicacao): Promise<void> {
    await this.publicacoes.arquivar(publicacao.id);
    this.toast.mostrar('Publicação arquivada.', 'info');
  }

  protected async restaurarPublicacao(publicacao: Publicacao): Promise<void> {
    await this.publicacoes.restaurar(publicacao.id);
    this.toast.mostrar('Publicação republicada.', 'info');
  }

  protected pedirExclusaoPublicacao(publicacao: Publicacao): void {
    this.publicacaoExcluindo.set(publicacao);
  }

  protected cancelarExclusaoPublicacao(): void {
    this.publicacaoExcluindo.set(null);
  }

  protected async confirmarExclusaoPublicacao(): Promise<void> {
    const publicacao = this.publicacaoExcluindo();
    if (!publicacao) return;
    await this.publicacoes.remover(publicacao.id);
    this.toast.mostrar('Publicação excluída.', 'info');
    this.publicacaoExcluindo.set(null);
  }

  protected selecionarAluno(evento: Event): void {
    this.alunoSelecionadoId.set(this.valor(evento));
  }

  protected abrirNovoComunicado(): void {
    if (!this.alunoSelecionado()) {
      this.toast.mostrar('Selecione um aluno para enviar o comunicado.', 'warning');
      return;
    }
    this.formComunicadoAberto.set(true);
  }

  protected fecharFormComunicado(): void {
    this.formComunicadoAberto.set(false);
  }

  protected onComunicadoSalvo(): void {
    this.formComunicadoAberto.set(false);
  }

  protected pedirExclusaoComunicado(comunicado: Comunicado): void {
    this.comunicadoExcluindo.set(comunicado);
  }

  protected cancelarExclusaoComunicado(): void {
    this.comunicadoExcluindo.set(null);
  }

  protected async confirmarExclusaoComunicado(): Promise<void> {
    const comunicado = this.comunicadoExcluindo();
    if (!comunicado) return;
    await this.comunicados.remover(comunicado.id);
    this.toast.mostrar('Comunicado excluído.', 'info');
    this.comunicadoExcluindo.set(null);
  }
}
