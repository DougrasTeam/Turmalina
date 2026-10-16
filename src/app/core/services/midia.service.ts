import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { environment } from '../../../environments/environment';
import { createId } from '../models';
import { SupabaseService } from './supabase.service';

/** Bucket do Supabase Storage onde ficam as fotos das publicações. */
export const BUCKET_MIDIA_PUBLICACOES = 'mural-publicacoes';

/** Lado máximo (px) da imagem compactada antes do envio. */
const LADO_MAXIMO_IMAGEM = 1280;

/** Qualidade do JPEG gerado na compactação (0 a 1). */
const QUALIDADE_IMAGEM = 0.8;

/**
 * Envio e remoção das fotos anexadas às publicações do mural (RF-022).
 *
 * Toda imagem é compactada (redimensionada e convertida em JPEG) antes do envio.
 * Quando os dados usam o Supabase, a imagem compactada vai para o Storage e a
 * publicação guarda a URL pública. No modo local (demonstração/testes) a imagem
 * é convertida em data URL, para não estourar o armazenamento do navegador.
 */
@Injectable({ providedIn: 'root' })
export class MidiaService {
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);

  private usarSupabase(): boolean {
    return environment.usarSupabaseDados && isPlatformBrowser(this.platformId);
  }

  /** Compacta a foto, envia e devolve a URL que deve ser salva na publicação. */
  async enviarImagemPublicacao(arquivo: File): Promise<string> {
    const imagemCompactada = await this.compactar(arquivo);
    if (this.usarSupabase()) {
      return this.enviarParaStorage(imagemCompactada);
    }
    return this.paraDataUrl(imagemCompactada);
  }

  /** Remove a foto enviada quando ela pertence ao nosso bucket (best effort). */
  async removerImagemPublicacao(url: string | null): Promise<void> {
    if (!url || !this.usarSupabase()) return;
    const caminho = this.caminhoNoBucket(url);
    if (!caminho) return;

    try {
      const cliente = await this.supabase.obterCliente();
      await cliente.storage.from(BUCKET_MIDIA_PUBLICACOES).remove([caminho]);
    } catch {
      // A limpeza é best-effort e não deve interromper o fluxo do usuário.
    }
  }

  private async enviarParaStorage(arquivo: File): Promise<string> {
    const cliente = await this.supabase.obterCliente();
    const caminho = `${createId()}.${this.extensao(arquivo)}`;

    const { error } = await cliente.storage
      .from(BUCKET_MIDIA_PUBLICACOES)
      .upload(caminho, arquivo, {
        cacheControl: '3600',
        upsert: false,
        contentType: arquivo.type,
      });
    if (error) {
      throw new Error(`Não foi possível enviar a imagem: ${error.message}`);
    }

    return cliente.storage.from(BUCKET_MIDIA_PUBLICACOES).getPublicUrl(caminho).data.publicUrl;
  }

  /** Redimensiona e converte a imagem em JPEG; devolve o arquivo original se falhar. */
  private async compactar(arquivo: File): Promise<File> {
    try {
      return await this.redimensionar(arquivo);
    } catch {
      return arquivo;
    }
  }

  private async redimensionar(arquivo: File): Promise<File> {
    const imagem = await createImageBitmap(arquivo);
    const escala = Math.min(1, LADO_MAXIMO_IMAGEM / Math.max(imagem.width, imagem.height));
    const largura = Math.max(1, Math.round(imagem.width * escala));
    const altura = Math.max(1, Math.round(imagem.height * escala));

    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;

    const contexto = canvas.getContext('2d');
    if (!contexto) {
      imagem.close();
      throw new Error('Não foi possível processar a imagem.');
    }

    contexto.drawImage(imagem, 0, 0, largura, altura);
    imagem.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALIDADE_IMAGEM),
    );
    if (!blob) {
      throw new Error('Não foi possível compactar a imagem.');
    }

    return new File([blob], this.nomeCompactado(arquivo.name), { type: 'image/jpeg' });
  }

  private paraDataUrl(arquivo: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result));
      leitor.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
      leitor.readAsDataURL(arquivo);
    });
  }

  private extensao(arquivo: File): string {
    const nome = arquivo.name;
    if (nome.includes('.')) {
      return nome.split('.').pop()?.toLowerCase() ?? 'jpg';
    }
    return arquivo.type.split('/')[1] ?? 'jpg';
  }

  private nomeCompactado(nomeOriginal: string): string {
    const base = nomeOriginal.includes('.') ? nomeOriginal.replace(/\.[^.]+$/, '') : nomeOriginal;
    return `${base || 'foto'}.jpg`;
  }

  private caminhoNoBucket(url: string): string | null {
    const marcador = `/object/public/${BUCKET_MIDIA_PUBLICACOES}/`;
    const indice = url.indexOf(marcador);
    return indice === -1 ? null : url.slice(indice + marcador.length);
  }
}
