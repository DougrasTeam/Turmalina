import {
  Component,
  OnDestroy,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { MidiaService } from '../../../core/services/midia.service';
import { PublicacoesService } from '../../../core/services/publicacoes.service';
import { ToastService } from '../../../core/services/toast.service';
import { Turma } from '../../../core/models';
import {
  CONTEUDO_PUBLICACAO_MAX,
  DadosPublicacao,
  Publicacao,
  TITULO_PUBLICACAO_MAX,
  validarImagemPublicacao,
  validarPublicacao,
} from '../../../core/models/publicacao.model';

interface PublicacaoFormData {
  titulo: string;
  conteudo: string;
  imagemUrl: string;
  turmaId: string;
  expiraEm: string;
}

@Component({
  selector: 'app-publicacao-form',
  imports: [ModalComponent],
  templateUrl: './publicacao-form.component.html',
  styleUrl: './publicacao-form.component.scss',
})
export class PublicacaoFormComponent implements OnDestroy {
  readonly open = input(false);
  readonly publicacao = input<Publicacao | null>(null);
  readonly turmas = input<readonly Turma[]>([]);
  /** Permite publicar para toda a instituição (além de uma turma específica). */
  readonly permitirInstitucional = input(true);
  /** Quando definido, a publicação fica restrita a esta turma (destino fixo). */
  readonly turmaFixa = input<string | null>(null);

  readonly salvo = output<void>();
  readonly fechado = output<void>();

  private readonly publicacoes = inject(PublicacoesService);
  private readonly midia = inject(MidiaService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly tituloMax = TITULO_PUBLICACAO_MAX;
  protected readonly conteudoMax = CONTEUDO_PUBLICACAO_MAX;

  /** Arquivo escolhido e ainda não enviado (o envio acontece ao salvar). */
  protected readonly arquivoPendente = signal<File | null>(null);
  /** URL temporária (object URL) usada apenas para pré-visualizar o arquivo escolhido. */
  protected readonly previewUrl = signal<string | null>(null);
  /** Marca que a imagem existente deve ser removida ao salvar. */
  protected readonly removerImagem = signal(false);
  protected readonly salvando = signal(false);

  protected readonly form = linkedSignal<PublicacaoFormData>(() => {
    this.open();
    return this.paraForm(this.publicacao());
  });

  protected readonly nomeTurmaFixa = computed(() => {
    const turmaId = this.turmaFixa();
    if (!turmaId) return '';
    return this.turmas().find((turma) => turma.id === turmaId)?.nome ?? 'Turma';
  });

  /** Imagem a exibir no formulário: pré-visualização local ou a já publicada. */
  protected readonly imagemExibida = computed<string | null>(() => {
    if (this.previewUrl()) return this.previewUrl();
    if (this.removerImagem()) return null;
    return this.form().imagemUrl || null;
  });

  ngOnDestroy(): void {
    this.limparPreview();
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected patch<K extends keyof PublicacaoFormData>(
    campo: K,
    valorCampo: PublicacaoFormData[K],
  ): void {
    this.form.update((atual) => ({ ...atual, [campo]: valorCampo }));
  }

  protected selecionarImagem(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const arquivo = campo.files?.[0] ?? null;
    campo.value = '';
    if (!arquivo) return;

    const erro = validarImagemPublicacao(arquivo);
    if (erro) {
      this.toast.mostrar(erro, 'warning');
      return;
    }

    this.limparPreview();
    this.arquivoPendente.set(arquivo);
    this.previewUrl.set(URL.createObjectURL(arquivo));
    this.removerImagem.set(false);
  }

  protected removerImagemSelecionada(): void {
    if (this.arquivoPendente()) {
      this.limparPreview();
      return;
    }
    this.removerImagem.set(true);
  }

  protected fechar(): void {
    this.limparPreview();
    this.removerImagem.set(false);
    this.fechado.emit();
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    const dados = this.paraDados(this.form());
    const erros = validarPublicacao(dados);
    if (erros.length) {
      this.toast.mostrar(erros[0], 'warning');
      return;
    }

    const autor = this.auth.usuario();
    if (!autor) {
      this.toast.mostrar('Sessão expirada. Entre novamente.', 'danger');
      return;
    }

    this.salvando.set(true);
    try {
      const dadosComImagem: DadosPublicacao = {
        ...dados,
        imagemUrl: await this.resolverImagem(dados.imagemUrl),
      };

      const atual = this.publicacao();
      if (atual) {
        await this.publicacoes.atualizar(atual.id, dadosComImagem);
        this.toast.mostrar('Publicação atualizada com sucesso!');
      } else {
        await this.publicacoes.criar(dadosComImagem, autor);
        this.toast.mostrar('Publicação criada com sucesso!');
      }
      this.limparPreview();
      this.removerImagem.set(false);
      this.salvo.emit();
    } catch (erro) {
      this.toast.mostrar((erro as Error).message, 'danger');
    } finally {
      this.salvando.set(false);
    }
  }

  /** Decide a URL final da imagem: envia o arquivo novo, remove a antiga ou mantém. */
  private async resolverImagem(urlAtual: string | null): Promise<string | null> {
    const arquivo = this.arquivoPendente();
    if (arquivo) {
      const novaUrl = await this.midia.enviarImagemPublicacao(arquivo);
      await this.midia.removerImagemPublicacao(urlAtual);
      return novaUrl;
    }

    if (this.removerImagem()) {
      await this.midia.removerImagemPublicacao(urlAtual);
      return null;
    }

    return urlAtual;
  }

  private limparPreview(): void {
    const url = this.previewUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.previewUrl.set(null);
    this.arquivoPendente.set(null);
  }

  private paraDados(form: PublicacaoFormData): DadosPublicacao {
    return {
      titulo: form.titulo,
      conteudo: form.conteudo,
      imagemUrl: form.imagemUrl || null,
      turmaId: this.turmaFixa() ?? (form.turmaId || null),
      publicadaEm: this.publicacao()?.publicadaEm ?? new Date().toISOString(),
      expiraEm: form.expiraEm || null,
    };
  }

  private paraForm(publicacao: Publicacao | null): PublicacaoFormData {
    if (publicacao) {
      return {
        titulo: publicacao.titulo,
        conteudo: publicacao.conteudo,
        imagemUrl: publicacao.imagemUrl ?? '',
        turmaId: publicacao.turmaId ?? '',
        expiraEm: publicacao.expiraEm ?? '',
      };
    }
    return {
      titulo: '',
      conteudo: '',
      imagemUrl: '',
      turmaId: this.turmaFixa() ?? '',
      expiraEm: '',
    };
  }
}
