import { Component, computed, inject } from '@angular/core';

import { Aluno } from '../../../core/models';
import { formatarDataHoraAuditoria } from '../../../core/models/auditoria.model';
import {
  Conquista,
  ConquistaAluno,
  percentualAlbum,
} from '../../../core/models/conquistas.model';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConquistasService } from '../../../core/services/conquistas.service';

/** Álbum de conquistas do aluno com seu progresso pessoal (RF-020). */
@Component({
  selector: 'app-album-aluno',
  templateUrl: './album-aluno.component.html',
  styleUrl: './album-aluno.component.scss',
})
export class AlbumAlunoComponent {
  private readonly auth = inject(AuthService);
  private readonly alunos = inject(AlunosService);
  protected readonly conquistas = inject(ConquistasService);

  protected readonly alunoProprio = computed<Aluno | null>(() => {
    const usuario = this.auth.usuario();
    if (!usuario) return null;
    return this.alunos.encontrarPorUsuario(usuario.id, usuario.email);
  });

  protected readonly conquistasAtivas = computed<Conquista[]>(() =>
    this.conquistas.conquistasAtivas(),
  );

  protected readonly ganhos = computed<ConquistaAluno[]>(() => {
    const aluno = this.alunoProprio();
    return aluno ? this.conquistas.desbloqueiosDoAluno(aluno.id) : [];
  });

  protected readonly idsConquistados = computed(
    () => new Set(this.ganhos().map((desbloqueio) => desbloqueio.conquistaId)),
  );

  protected readonly total = computed(() => this.conquistasAtivas().length);
  protected readonly quantidadeGanha = computed(
    () => this.conquistasAtivas().filter((conquista) => this.idsConquistados().has(conquista.id)).length,
  );
  protected readonly percentual = computed(() =>
    percentualAlbum(this.quantidadeGanha(), this.total()),
  );

  protected conquistou(conquistaId: string): boolean {
    return this.idsConquistados().has(conquistaId);
  }

  protected iniciais(nome: string): string {
    const partes = nome.trim().split(/\s+/);
    const primeira = partes[0]?.charAt(0) ?? '';
    const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return `${primeira}${ultima}`.toUpperCase();
  }

  protected formatarData(iso: string): string {
    return formatarDataHoraAuditoria(iso);
  }
}
