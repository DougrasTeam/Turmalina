import { Component, computed, inject } from '@angular/core';

import { Aluno } from '../../../core/models';
import { formatarDataHoraAuditoria } from '../../../core/models/auditoria.model';
import {
  MovimentacaoMoeda,
  formatarDeltaMoedas,
  rotuloOrigemMoeda,
} from '../../../core/models/moedas.model';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { MoedasService } from '../../../core/services/moedas.service';

/** Painel do aluno com seu saldo e extrato de moedas virtuais (RF-016). */
@Component({
  selector: 'app-moedas-aluno',
  templateUrl: './moedas-aluno.component.html',
  styleUrl: './moedas-aluno.component.scss',
})
export class MoedasAlunoComponent {
  private readonly auth = inject(AuthService);
  private readonly alunos = inject(AlunosService);
  protected readonly moedas = inject(MoedasService);

  protected readonly alunoProprio = computed<Aluno | null>(() => {
    const usuario = this.auth.usuario();
    if (!usuario) return null;
    return this.alunos.encontrarPorUsuario(usuario.id, usuario.email);
  });

  protected readonly saldo = computed(() => {
    const aluno = this.alunoProprio();
    return aluno ? this.moedas.saldoDoAluno(aluno.id) : 0;
  });

  protected readonly extrato = computed<MovimentacaoMoeda[]>(() => {
    const aluno = this.alunoProprio();
    return aluno ? this.moedas.movimentacoesDoAluno(aluno.id) : [];
  });

  protected readonly estornadas = computed(
    () =>
      new Set(
        this.extrato()
          .map((movimentacao) => movimentacao.estornoDe)
          .filter((movimentacaoId): movimentacaoId is string => Boolean(movimentacaoId)),
      ),
  );

  protected iniciais(nome: string): string {
    const partes = nome.trim().split(/\s+/);
    const primeira = partes[0]?.charAt(0) ?? '';
    const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return `${primeira}${ultima}`.toUpperCase();
  }

  protected formatarDelta(delta: number): string {
    return `${formatarDeltaMoedas(delta)} moedas`;
  }

  protected rotuloOrigem(origem: MovimentacaoMoeda['origem']): string {
    return rotuloOrigemMoeda(origem);
  }

  protected formatarDataHora(iso: string): string {
    return formatarDataHoraAuditoria(iso);
  }
}
