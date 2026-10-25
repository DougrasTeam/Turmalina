import { Component, input, output } from '@angular/core';

import {
  Publicacao,
  classeStatusPublicacao,
  imagemPublicacaoValida,
  rotuloStatusPublicacao,
} from '../../../core/models/publicacao.model';

/**
 * Feed de publicações do mural (RF-022) no estilo de um feed social: cada
 * publicação vira um cartão com autor, destino, conteúdo e ações.
 *
 * É apenas apresentação: recebe a lista já filtrada e autorizada, e emite as
 * intenções de editar/arquivar/restaurar/excluir para o componente pai tratar.
 */
@Component({
  selector: 'app-feed-publicacoes',
  templateUrl: './feed-publicacoes.component.html',
  styleUrl: './feed-publicacoes.component.scss',
})
export class FeedPublicacoesComponent {
  readonly publicacoes = input<readonly Publicacao[]>([]);
  /** Nome de cada turma por id, usado para exibir o destino da publicação. */
  readonly nomesTurmas = input<Readonly<Record<string, string>>>({});
  /** Nome de cada disciplina por id, usado para diferenciar o escopo do post. */
  readonly nomesDisciplinas = input<Readonly<Record<string, string>>>({});
  /** Autor da sessão; quem é o autor pode gerenciar as próprias publicações. */
  readonly autorIdAtual = input<string | null>(null);
  /** Quando `true`, o usuário pode gerenciar todas as publicações (admin). */
  readonly gerenciarTudo = input(false);
  readonly vazioTitulo = input('Nenhuma publicação ainda');
  readonly vazioTexto = input('As publicações aparecerão aqui assim que forem compartilhadas.');

  readonly editar = output<Publicacao>();
  readonly arquivar = output<Publicacao>();
  readonly restaurar = output<Publicacao>();
  readonly excluir = output<Publicacao>();

  protected podeGerenciar(publicacao: Publicacao): boolean {
    return this.gerenciarTudo() || publicacao.autorId === this.autorIdAtual();
  }

  protected destino(publicacao: Publicacao): string {
    if (publicacao.turmaId === null) return 'Escola toda';
    const nomeTurma = this.nomesTurmas()[publicacao.turmaId] ?? 'Turma';
    if (!publicacao.disciplinaId) return `${nomeTurma} · Turma toda`;
    const nomeDisciplina = this.nomesDisciplinas()[publicacao.disciplinaId] ?? 'Disciplina';
    return `${nomeTurma} · ${nomeDisciplina}`;
  }

  protected temImagem(publicacao: Publicacao): boolean {
    return imagemPublicacaoValida(publicacao.imagemUrl);
  }

  protected iniciais(nome: string): string {
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  protected status(publicacao: Publicacao): string {
    return rotuloStatusPublicacao(publicacao.status);
  }

  protected classeStatus(publicacao: Publicacao): string {
    return classeStatusPublicacao(publicacao.status);
  }

  protected formatarDataHora(iso: string): string {
    const data = new Date(iso);
    return Number.isNaN(data.getTime())
      ? iso
      : data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  protected formatarData(iso: string | null): string {
    if (!iso) return '—';
    const partes = iso.slice(0, 10).split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : iso;
  }
}
