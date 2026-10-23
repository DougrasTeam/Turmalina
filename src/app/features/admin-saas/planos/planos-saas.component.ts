import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PlanosService, DadosPlano } from '../../../core/services/planos.service';
import { FuncionalidadesService } from '../../../core/services/funcionalidades.service';
import { ToastService } from '../../../core/services/toast.service';
import { Plano, formatarPrecoMensal } from '../../../core/models/plano.model';
import { Funcionalidade, agruparFuncionalidades } from '../../../core/models/funcionalidade.model';

interface EditorPlano {
  id: string | null;
  nome: string;
  descricao: string;
  precoMensal: number;
  ativo: boolean;
  funcionalidades: Set<string>;
}

/** Editor de planos comerciais e das funcionalidades incluídas em cada um. */
@Component({
  selector: 'app-planos-saas',
  imports: [FormsModule],
  templateUrl: './planos-saas.component.html',
  styleUrl: './planos-saas.component.scss',
})
export class PlanosSaasComponent implements OnInit {
  protected readonly planos = inject(PlanosService);
  protected readonly funcionalidades = inject(FuncionalidadesService);
  private readonly toast = inject(ToastService);

  protected readonly editor = signal<EditorPlano | null>(null);
  protected readonly salvando = signal(false);

  protected readonly grupos = computed(() => agruparFuncionalidades(this.funcionalidades.catalogo()));

  protected formatarPreco = formatarPrecoMensal;

  async ngOnInit(): Promise<void> {
    await Promise.all([this.planos.load(), this.funcionalidades.carregarCatalogoAtualizado()]);
  }

  protected contagem(plano: Plano): number {
    return this.planos.funcionalidadesDoPlano(plano.id).length;
  }

  protected totalFuncionalidades(): number {
    return this.funcionalidades.catalogo().length;
  }

  protected editar(plano: Plano): void {
    this.editor.set({
      id: plano.id,
      nome: plano.nome,
      descricao: plano.descricao,
      precoMensal: plano.precoMensal,
      ativo: plano.ativo,
      funcionalidades: new Set(this.planos.funcionalidadesDoPlano(plano.id)),
    });
  }

  protected novo(): void {
    this.editor.set({
      id: null,
      nome: '',
      descricao: '',
      precoMensal: 0,
      ativo: true,
      funcionalidades: new Set(),
    });
  }

  protected fechar(): void {
    this.editor.set(null);
  }

  protected estaIncluida(chave: string): boolean {
    return this.editor()?.funcionalidades.has(chave) ?? false;
  }

  protected alternarFuncionalidade(chave: string): void {
    this.editor.update((atual) => {
      if (!atual) return atual;
      const funcionalidades = new Set(atual.funcionalidades);
      if (funcionalidades.has(chave)) {
        funcionalidades.delete(chave);
      } else {
        funcionalidades.add(chave);
      }
      return { ...atual, funcionalidades };
    });
  }

  protected alternarGrupo(itens: Funcionalidade[]): void {
    const todasIncluidas = itens.every((item) => this.estaIncluida(item.chave));
    this.editor.update((atual) => {
      if (!atual) return atual;
      const funcionalidades = new Set(atual.funcionalidades);
      for (const item of itens) {
        if (todasIncluidas) {
          funcionalidades.delete(item.chave);
        } else {
          funcionalidades.add(item.chave);
        }
      }
      return { ...atual, funcionalidades };
    });
  }

  protected grupoCompleto(itens: Funcionalidade[]): boolean {
    return itens.length > 0 && itens.every((item) => this.estaIncluida(item.chave));
  }

  protected atualizarNome(valor: string): void {
    this.editor.update((atual) => (atual ? { ...atual, nome: valor } : atual));
  }

  protected atualizarDescricao(valor: string): void {
    this.editor.update((atual) => (atual ? { ...atual, descricao: valor } : atual));
  }

  protected atualizarPreco(valor: string): void {
    const numero = Number(valor.replace(',', '.'));
    this.editor.update((atual) => (atual ? { ...atual, precoMensal: numero } : atual));
  }

  protected atualizarAtivo(valor: boolean): void {
    this.editor.update((atual) => (atual ? { ...atual, ativo: valor } : atual));
  }

  protected async salvar(): Promise<void> {
    const atual = this.editor();
    if (!atual) return;

    this.salvando.set(true);
    try {
      const dados: DadosPlano = {
        nome: atual.nome,
        descricao: atual.descricao,
        precoMensal: atual.precoMensal,
        ativo: atual.ativo,
        funcionalidades: Array.from(atual.funcionalidades),
      };
      await this.planos.salvar(atual.id, dados);
      this.toast.mostrar('Plano salvo.', 'success');
      this.editor.set(null);
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : 'Não foi possível salvar o plano.';
      this.toast.mostrar(mensagem, 'danger');
    } finally {
      this.salvando.set(false);
    }
  }

  protected async remover(plano: Plano): Promise<void> {
    try {
      await this.planos.remover(plano.id);
      this.toast.mostrar('Plano removido.', 'success');
    } catch {
      this.toast.mostrar('Não foi possível remover o plano.', 'danger');
    }
  }
}
