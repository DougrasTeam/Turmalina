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
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { GamificacaoService } from '../../../core/services/gamificacao.service';

/** Painel do aluno com seu XP, nível, progresso e histórico (RF-015). */
@Component({
  selector: 'app-gamificacao-aluno',
  templateUrl: './gamificacao-aluno.component.html',
  styleUrl: './gamificacao-aluno.component.scss',
})
export class GamificacaoAlunoComponent {
  private readonly auth = inject(AuthService);
  private readonly alunos = inject(AlunosService);
  protected readonly gamificacao = inject(GamificacaoService);

  protected readonly alunoProprio = computed<Aluno | null>(() => {
    const usuario = this.auth.usuario();
    if (!usuario) return null;
    return this.alunos.encontrarPorUsuario(usuario.id, usuario.email);
  });

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

  protected readonly estornados = computed(
    () =>
      new Set(
        this.gamificacao
          .eventos()
          .map((evento) => evento.estornoDe)
          .filter((eventoId): eventoId is string => Boolean(eventoId)),
      ),
  );

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
}
