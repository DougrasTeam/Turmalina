import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';

import { AlunosService } from '../../../core/services/alunos.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { CsvService, ResultadoCsv } from '../../../core/services/csv.service';
import { ToastService } from '../../../core/services/toast.service';
import { TurmasService } from '../../../core/services/turmas.service';
import { Aluno } from '../../../core/models';

interface Mapeamento {
  nome: number;
  email: number;
  matricula: number;
  turma: number;
  dataNascimento: number;
  responsavel: number;
  telefoneResponsavel: number;
}

interface CampoMapeavel {
  chave: keyof Mapeamento;
  label: string;
  obrigatorio: boolean;
}

export interface ResumoImport {
  criados: number;
  turmasCriadas: number;
}

const MAPEAMENTO_VAZIO: Mapeamento = {
  nome: -1,
  email: -1,
  matricula: -1,
  turma: -1,
  dataNascimento: -1,
  responsavel: -1,
  telefoneResponsavel: -1,
};

const CAMPOS: CampoMapeavel[] = [
  { chave: 'nome', label: 'Nome do aluno', obrigatorio: true },
  { chave: 'email', label: 'E-mail', obrigatorio: false },
  { chave: 'matricula', label: 'Matrícula / RA', obrigatorio: false },
  { chave: 'turma', label: 'Turma', obrigatorio: false },
  { chave: 'dataNascimento', label: 'Data de nascimento', obrigatorio: false },
  { chave: 'responsavel', label: 'Responsável', obrigatorio: false },
  { chave: 'telefoneResponsavel', label: 'Telefone do responsável', obrigatorio: false },
];

const ALIASES: Record<keyof Mapeamento, string[]> = {
  nome: ['nome', 'aluno', 'name', 'nome do aluno', 'nome completo'],
  email: ['email', 'e-mail', 'mail', 'e mail'],
  matricula: ['matricula', 'ra', 'registro', 'rm', 'codigo', 'código'],
  turma: ['turma', 'classe', 'class', 'serie', 'série'],
  dataNascimento: ['nascimento', 'data nascimento', 'data de nascimento', 'dt nascimento', 'aniversario'],
  responsavel: ['responsavel', 'responsável', 'pai', 'mae', 'mãe', 'tutor'],
  telefoneResponsavel: ['telefone', 'celular', 'fone', 'contato', 'telefone responsavel', 'tel'],
};

@Component({
  selector: 'app-aluno-import',
  templateUrl: './aluno-import.component.html',
  styleUrl: './aluno-import.component.scss',
})
export class AlunoImportComponent {
  private readonly csv = inject(CsvService);
  private readonly toast = inject(ToastService);
  private readonly auditoria = inject(AuditoriaService);
  protected readonly turmas = inject(TurmasService);
  private readonly alunos = inject(AlunosService);

  readonly importado = output<ResumoImport>();
  readonly turmaIdPadrao = input('');

  protected readonly campos = CAMPOS;
  protected readonly texto = signal('');
  protected readonly resultado = signal<ResultadoCsv | null>(null);
  protected readonly mapeamento = signal<Mapeamento>({ ...MAPEAMENTO_VAZIO });
  protected readonly turmaPadrao = linkedSignal(() => this.turmaIdPadrao());
  protected readonly erro = signal('');
  protected readonly importando = signal(false);

  readonly previa = computed(() => {
    const res = this.resultado();
    const mapa = this.mapeamento();
    if (!res || mapa.nome < 0) return [];
    return res.linhas.slice(0, 8).map((linha) => ({
      nome: linha[mapa.nome] ?? '',
      email: this.celula(linha, mapa.email),
      matricula: this.celula(linha, mapa.matricula),
      turma: this.celula(linha, mapa.turma),
    }));
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected nomeDelimitador(delimitador: string): string {
    if (delimitador === '\t') return 'tabulação';
    if (delimitador === ';') return 'ponto e vírgula';
    if (delimitador === '|') return 'barra vertical';
    return 'vírgula';
  }

  protected lerArquivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      this.texto.set(String(leitor.result ?? ''));
      this.analisar();
    };
    leitor.readAsText(arquivo, 'utf-8');
  }

  protected analisar(): void {
    this.erro.set('');
    if (!this.texto().trim()) {
      this.erro.set('Nenhum conteúdo para analisar.');
      this.resultado.set(null);
      return;
    }
    const res = this.csv.parse(this.texto());
    if (res.cabecalho.length === 0 || res.linhas.length === 0) {
      this.erro.set('Não foi possível ler o CSV. Verifique se há cabeçalho e ao menos uma linha.');
      this.resultado.set(null);
      return;
    }
    this.resultado.set(res);
    this.mapeamento.set(this.automapear(res.cabecalho));
  }

  protected setMapeamento(campo: keyof Mapeamento, evento: Event): void {
    const indice = Number(this.valor(evento));
    this.mapeamento.update((atual) => ({ ...atual, [campo]: indice }));
  }

  async importar(): Promise<void> {
    const res = this.resultado();
    const mapa = this.mapeamento();
    if (!res || mapa.nome < 0) {
      this.toast.mostrar('Relacione a coluna de nome antes de importar.', 'warning');
      return;
    }
    if (this.importando()) return;
    this.importando.set(true);

    try {
      const turmasPorNome = new Map<string, string>();
      const nomesNovasTurmas = new Map<string, string>();
      const padrao = this.turmaPadrao();

      for (const linha of res.linhas) {
        if (!(linha[mapa.nome] ?? '').trim()) continue;
        const nomeTurma = this.celula(linha, mapa.turma).trim();
        const chaveTurma = nomeTurma.toLowerCase();
        if (nomeTurma && !turmasPorNome.has(chaveTurma)) {
          const turmaExistente = this.turmas.porNome(nomeTurma);
          if (turmaExistente) {
            turmasPorNome.set(chaveTurma, turmaExistente.id);
          } else {
            nomesNovasTurmas.set(chaveTurma, nomeTurma);
          }
        }
      }

      const turmasNovas = await this.turmas.createMuitas(
        [...nomesNovasTurmas.values()].map((nome) => ({ nome })),
      );
      for (const turmaNova of turmasNovas) {
        turmasPorNome.set(turmaNova.nome.trim().toLowerCase(), turmaNova.id);
      }

      const entradas: Partial<Aluno>[] = res.linhas.flatMap((linha) => {
        const nome = (linha[mapa.nome] ?? '').trim();
        if (!nome) return [];

        const nomeTurma = this.celula(linha, mapa.turma).trim();
        const chaveTurma = nomeTurma.toLowerCase();
        const turmaId = nomeTurma ? turmasPorNome.get(chaveTurma) ?? padrao : padrao;

        return [
          {
            nome,
            email: this.celula(linha, mapa.email).trim(),
            matricula: this.celula(linha, mapa.matricula).trim(),
            turmaId,
            dataNascimento: this.normalizarData(this.celula(linha, mapa.dataNascimento)),
            responsavel: this.celula(linha, mapa.responsavel).trim(),
            telefoneResponsavel: this.celula(linha, mapa.telefoneResponsavel).trim(),
          },
        ];
      });

      if (entradas.length === 0) {
        this.toast.mostrar('Nenhuma linha válida encontrada.', 'warning');
        return;
      }

      const criados = await this.alunos.createMuitos(entradas);
      this.auditoria.registrar(
        'aluno.importado',
        'Aluno',
        null,
        `${criados.length} aluno(s), ${turmasNovas.length} turma(s)`,
      );
      this.importado.emit({ criados: criados.length, turmasCriadas: turmasNovas.length });
    } catch (erro) {
      this.toast.mostrar(
        erro instanceof Error ? erro.message : 'Não foi possível importar os alunos.',
        'danger',
      );
    } finally {
      this.importando.set(false);
    }
  }

  private celula(linha: string[], indice: number): string {
    return indice >= 0 ? linha[indice] ?? '' : '';
  }

  private normalizarData(valor: string): string {
    const limpo = valor.trim();
    if (!limpo) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(limpo)) return limpo;
    const match = limpo.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if (match) {
      const dia = match[1].padStart(2, '0');
      const mes = match[2].padStart(2, '0');
      const ano = match[3].length === 2 ? `20${match[3]}` : match[3];
      return `${ano}-${mes}-${dia}`;
    }
    return '';
  }

  private automapear(cabecalho: string[]): Mapeamento {
    const normalizados = cabecalho.map((titulo) => this.normalizar(titulo));
    const mapa: Mapeamento = { ...MAPEAMENTO_VAZIO };

    (Object.keys(ALIASES) as (keyof Mapeamento)[]).forEach((chave) => {
      const aliases = ALIASES[chave];
      const indice = normalizados.findIndex((titulo) => aliases.includes(titulo));
      mapa[chave] = indice;
    });

    return mapa;
  }

  private normalizar(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_-]+/g, ' ')
      .trim();
  }
}
