import { Component, computed, inject } from '@angular/core';

import { Aluno } from '../../../core/models';
import {
  EventoXp,
  XP_POR_NIVEL,
  formatarDeltaXp,
  nivelPorXp,
  progressoNivel,
  xpNoNivelAtual,
  xpParaProximoNivel,
} from '../../../core/models/gamificacao.model';
import { formatarDataHoraAuditoria } from '../../../core/models/auditoria.model';
import {
  Missao,
  MissaoAluno,
  ProgressoMetaAluno,
  rotuloIndicador,
} from '../../../core/models/missoes-metas.model';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { DisciplinasService } from '../../../core/services/disciplinas.service';
import { GamificacaoService } from '../../../core/services/gamificacao.service';
import { MetasService } from '../../../core/services/metas.service';
import { MissoesService } from '../../../core/services/missoes.service';

/** Painel do aluno com seu XP, nível, progresso e histórico (RF-015). */
@Component({
  selector: 'app-gamificacao-aluno',
  templateUrl: './gamificacao-aluno.component.html',
  styleUrl: './gamificacao-aluno.component.scss',
})
export class GamificacaoAlunoComponent {
  private readonly auth = inject(AuthService);
  private readonly alunos = inject(AlunosService);
  private readonly disciplinas = inject(DisciplinasService);
  protected readonly gamificacao = inject(GamificacaoService);
  protected readonly metas = inject(MetasService);
  protected readonly missoes = inject(MissoesService);

  protected readonly alunoProprio = computed<Aluno | null>(() => {
    const usuario = this.auth.usuario();
    if (!usuario) return null;
    return this.alunos.encontrarPorUsuario(usuario.id, usuario.email);
  });

  protected readonly metasDoAluno = computed(() => {
    const aluno = this.alunoProprio();
    if (!aluno || !aluno.turmaId) return [];
    return this.metas.metasDoAluno(aluno.id, aluno.turmaId);
  });

  protected readonly missoesDisponiveis = computed(() => {
    const aluno = this.alunoProprio();
    if (!aluno || !aluno.turmaId) return [];
    return this.missoes.missoesVisiveisDoAluno(aluno.id, aluno.turmaId);
  });

  protected readonly missoesConcluidas = computed<{ missao: Missao; conclusao: MissaoAluno }[]>(
    () => {
      const aluno = this.alunoProprio();
      if (!aluno) return [];

      const itens: { missao: Missao; conclusao: MissaoAluno }[] = [];
      for (const conclusao of this.missoes.conclusoesDoAluno(aluno.id)) {
        const missao = this.missoes.porId(conclusao.missaoId);
        if (missao) itens.push({ missao, conclusao });
      }
      return itens;
    },
  );

  protected readonly xp = computed(() => this.alunoProprio()?.xp ?? 0);
  protected readonly xpPorNivel = XP_POR_NIVEL;
  protected readonly nivel = computed(() => nivelPorXp(this.xp()));
  protected readonly xpNoNivel = computed(() => xpNoNivelAtual(this.xp()));
  protected readonly faltamParaProximoNivel = computed(() => xpParaProximoNivel(this.xp()));
  protected readonly progresso = computed(() => progressoNivel(this.xp()));

  protected readonly eventos = computed<EventoXp[]>(() => {
    const aluno = this.alunoProprio();
    return aluno ? this.gamificacao.eventosDoAluno(aluno.id) : [];
  });

  protected readonly xpPorDisciplina = computed(() => {
    const aluno = this.alunoProprio();
    if (!aluno || !aluno.turmaId) return [];

    const xpPorDisciplina = new Map<string, number>();
    for (const evento of this.eventos()) {
      if (evento.turmaId !== aluno.turmaId || !evento.disciplinaId) continue;
      const xpAtual = xpPorDisciplina.get(evento.disciplinaId) ?? 0;
      xpPorDisciplina.set(evento.disciplinaId, xpAtual + evento.deltaXp);
    }

    return [...xpPorDisciplina.entries()]
      .map(([disciplinaId, xpNaDisciplina]) => ({
        disciplinaId,
        disciplinaNome: this.nomeDisciplina(disciplinaId),
        xp: xpNaDisciplina,
      }))
      .sort((primeira, segunda) =>
        primeira.disciplinaNome.localeCompare(segunda.disciplinaNome, 'pt-BR'),
      );
  });

  protected readonly estornados = computed(
    () =>
      new Set(
        this.gamificacao
          .eventos()
          .map((evento) => evento.estornoDe)
          .filter((eventoId): eventoId is string => Boolean(eventoId)),
      ),
  );

  protected nomeDisciplina(disciplinaId: string | null): string {
    if (!disciplinaId) return 'Geral';
    return this.disciplinas.porId(disciplinaId)?.nome ?? 'Disciplina removida';
  }

  protected iniciais(nome: string): string {
    const partes = nome.trim().split(/\s+/);
    const primeira = partes[0]?.charAt(0) ?? '';
    const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return `${primeira}${ultima}`.toUpperCase();
  }

  protected formatarDeltaXp(deltaXp: number): string {
    return formatarDeltaXp(deltaXp);
  }

  protected formatarDataHora(iso: string): string {
    return formatarDataHoraAuditoria(iso);
  }

  protected rotuloIndicador(indicador: string): string {
    return rotuloIndicador(indicador);
  }

  protected rotuloTipoMissao(missao: Missao): string {
    return missao.tipo === 'turma' ? 'Coletiva' : 'Individual';
  }

  protected formatarRecompensaMeta(progresso: ProgressoMetaAluno): string {
    return formatarRecompensa(progresso.meta.recompensaXp, progresso.meta.recompensaMoedas);
  }

  protected formatarRecompensaMissao(missao: Missao): string {
    return formatarRecompensa(missao.xpRecompensa, missao.moedasRecompensa);
  }

  protected formatarPeriodoMissao(missao: Missao): string {
    if (!missao.inicioEm && !missao.fimEm) return 'Sem prazo definido';
    if (missao.inicioEm && missao.fimEm) {
      return `${formatarData(missao.inicioEm)} a ${formatarData(missao.fimEm)}`;
    }
    if (missao.inicioEm) return `A partir de ${formatarData(missao.inicioEm)}`;
    return `Até ${formatarData(missao.fimEm ?? '')}`;
  }
}

function formatarRecompensa(xp: number, moedas: number): string {
  const partes: string[] = [];
  if (xp > 0) partes.push(`${xp} XP`);
  if (moedas > 0) partes.push(`${moedas} moedas`);
  return partes.length > 0 ? partes.join(' + ') : 'Sem recompensa';
}

function formatarData(dataIso: string): string {
  if (!dataIso) return '';
  const [ano, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}/${ano}`;
}
