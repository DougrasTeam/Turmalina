import { Injectable, computed, inject } from '@angular/core';

import { AlunosService } from './alunos.service';
import { AuditoriaService } from './auditoria.service';
import { AvaliacoesService } from './avaliacoes.service';
import { ComunicadosService } from './comunicados.service';
import { ConquistasService } from './conquistas.service';
import { DisciplinasService } from './disciplinas.service';
import { EquipesService } from './equipes.service';
import { EventosService } from './eventos.service';
import { FrequenciasService } from './frequencias.service';
import { GamificacaoService } from './gamificacao.service';
import { MatriculasService } from './matriculas.service';
import { MoedasService } from './moedas.service';
import { PeriodosLetivosService } from './periodos-letivos.service';
import { ProfessoresService } from './professores.service';
import { PublicacoesService } from './publicacoes.service';
import { TurmasService } from './turmas.service';
import { VinculosDocentesService } from './vinculos-docentes.service';

export type GrupoDados =
  | 'alunos'
  | 'turmas'
  | 'professores'
  | 'disciplinas'
  | 'periodos'
  | 'frequencias'
  | 'avaliacoes'
  | 'comunicacao'
  | 'agenda'
  | 'equipes'
  | 'gamificacao';
export type AlvoLimpeza = GrupoDados | 'tudo';

export interface ResumoDados {
  alunos: number;
  turmas: number;
  professores: number;
  disciplinas: number;
  periodos: number;
  frequencias: number;
  avaliacoes: number;
  vinculos: number;
  matriculas: number;
  publicacoes: number;
  comunicados: number;
  comunicacao: number;
  agenda: number;
  acoesGamificacao: number;
  eventosXp: number;
  movimentacoesMoedas: number;
  conquistas: number;
  desbloqueiosConquista: number;
  equipes: number;
  membrosEquipe: number;
  gamificacao: number;
}

export interface ConfirmacaoLimpeza {
  titulo: string;
  mensagem: string;
  detalhes: string[];
  rotuloConfirmar: string;
}

/**
 * Limpeza em cascata dos dados de demonstração.
 * Centraliza aqui as dependências (matrículas, vínculos, referências em turmas/alunos)
 * para que nenhuma exclusão deixe registros órfãos.
 */
@Injectable({ providedIn: 'root' })
export class DadosService {
  private readonly alunos = inject(AlunosService);
  private readonly turmas = inject(TurmasService);
  private readonly professores = inject(ProfessoresService);
  private readonly disciplinas = inject(DisciplinasService);
  private readonly periodos = inject(PeriodosLetivosService);
  private readonly vinculos = inject(VinculosDocentesService);
  private readonly matriculas = inject(MatriculasService);
  private readonly frequencias = inject(FrequenciasService);
  private readonly avaliacoes = inject(AvaliacoesService);
  private readonly publicacoes = inject(PublicacoesService);
  private readonly comunicados = inject(ComunicadosService);
  private readonly eventos = inject(EventosService);
  private readonly gamificacao = inject(GamificacaoService);
  private readonly moedas = inject(MoedasService);
  private readonly conquistas = inject(ConquistasService);
  private readonly equipes = inject(EquipesService);
  private readonly auditoria = inject(AuditoriaService);

  readonly resumo = computed<ResumoDados>(() => ({
    alunos: this.alunos.total(),
    turmas: this.turmas.total(),
    professores: this.professores.total(),
    disciplinas: this.disciplinas.total(),
    periodos: this.periodos.periodos().length,
    frequencias: this.frequencias.total(),
    avaliacoes: this.avaliacoes.total(),
    vinculos: this.vinculos.total(),
    matriculas: this.matriculas.total(),
    publicacoes: this.publicacoes.total(),
    comunicados: this.comunicados.total(),
    comunicacao: this.publicacoes.total() + this.comunicados.total(),
    agenda: this.eventos.total(),
    acoesGamificacao: this.gamificacao.totalAcoes(),
    eventosXp: this.gamificacao.totalEventos(),
    movimentacoesMoedas: this.moedas.totalMovimentacoes(),
    conquistas: this.conquistas.totalConquistas(),
    desbloqueiosConquista: this.conquistas.totalDesbloqueios(),
    equipes: this.equipes.totalEquipes(),
    membrosEquipe: this.equipes.totalMembros(),
    gamificacao:
      this.gamificacao.totalAcoes() +
      this.gamificacao.totalEventos() +
      this.moedas.totalMovimentacoes() +
      this.conquistas.totalConquistas() +
      this.conquistas.totalDesbloqueios(),
  }));

  confirmacao(alvo: AlvoLimpeza): ConfirmacaoLimpeza {
    const resumo = this.resumo();
    switch (alvo) {
      case 'alunos':
        return {
          titulo: 'Excluir todos os alunos',
          mensagem: 'Todos os alunos cadastrados serão excluídos permanentemente.',
          detalhes: [
            `${resumo.alunos} aluno(s) serão excluídos.`,
            `${resumo.matriculas} matrícula(s) relacionadas serão removidas.`,
            `${resumo.frequencias} chamada(s) de frequência e ${resumo.avaliacoes} avaliação(ões) serão removidas.`,
            `${resumo.eventosXp} lançamento(s) de XP e ${resumo.movimentacoesMoedas} movimentação(ões) de moedas serão removidos.`,
            `${resumo.desbloqueiosConquista} conquista(s) desbloqueada(s) serão removidas.`,
          ],
          rotuloConfirmar: 'Excluir alunos',
        };
      case 'turmas':
        return {
          titulo: 'Excluir todas as turmas',
          mensagem: 'Todas as turmas serão excluídas permanentemente.',
          detalhes: [
            `${resumo.turmas} turma(s) serão excluídas.`,
            `${resumo.vinculos} vínculo(s) docente(s) serão removidos.`,
            'As matrículas dessas turmas serão removidas.',
            `${resumo.frequencias} chamada(s) de frequência e ${resumo.avaliacoes} avaliação(ões) serão removidas.`,
            `${resumo.eventosXp} lançamento(s) de XP vinculados às turmas serão removidos.`,
            `${resumo.movimentacoesMoedas} movimentação(ões) de moedas vinculadas às turmas serão removidas.`,
            'Os alunos ficarão sem turma.',
          ],
          rotuloConfirmar: 'Excluir turmas',
        };
      case 'professores':
        return {
          titulo: 'Excluir todos os professores',
          mensagem: 'Todos os professores serão excluídos permanentemente.',
          detalhes: [
            `${resumo.professores} professor(es) serão excluídos.`,
            `${resumo.vinculos} vínculo(s) docente(s) serão removidos.`,
            'As turmas ficarão sem professores vinculados.',
          ],
          rotuloConfirmar: 'Excluir professores',
        };
      case 'disciplinas':
        return {
          titulo: 'Excluir todas as disciplinas',
          mensagem: 'Todas as disciplinas serão excluídas permanentemente.',
          detalhes: [
            `${resumo.disciplinas} disciplina(s) serão excluídas.`,
            `${resumo.vinculos} vínculo(s) docente(s) serão removidos.`,
            'As turmas ficarão sem disciplinas ofertadas.',
            `${resumo.avaliacoes} avaliação(ões) serão removidas.`,
          ],
          rotuloConfirmar: 'Excluir disciplinas',
        };
      case 'periodos':
        return {
          titulo: 'Excluir todos os períodos letivos',
          mensagem: 'Todos os períodos letivos serão excluídos permanentemente.',
          detalhes: [
            `${resumo.periodos} período(s) serão excluídos, inclusive o ativo.`,
            `${resumo.matriculas} matrícula(s) relacionadas serão removidas.`,
            `${resumo.frequencias} chamada(s) de frequência e ${resumo.avaliacoes} avaliação(ões) serão removidas.`,
          ],
          rotuloConfirmar: 'Excluir períodos',
        };
      case 'frequencias':
        return {
          titulo: 'Excluir todas as chamadas de frequência',
          mensagem: 'Todos os registros de frequência serão excluídos permanentemente.',
          detalhes: [`${resumo.frequencias} chamada(s) de frequência serão excluídas.`],
          rotuloConfirmar: 'Excluir chamadas',
        };
      case 'avaliacoes':
        return {
          titulo: 'Excluir todas as avaliações',
          mensagem: 'Todas as avaliações e suas notas serão excluídas permanentemente.',
          detalhes: [`${resumo.avaliacoes} avaliação(ões) e todas as notas lançadas serão excluídas.`],
          rotuloConfirmar: 'Excluir avaliações',
        };
      case 'comunicacao':
        return {
          titulo: 'Excluir mural e comunicados',
          mensagem: 'Todas as publicações, recados e observações serão excluídos permanentemente.',
          detalhes: [
            `${resumo.publicacoes} publicação(ões) do mural serão excluídas.`,
            `${resumo.comunicados} recado(s)/observação(ões) serão excluídos.`,
          ],
          rotuloConfirmar: 'Excluir comunicação',
        };
      case 'agenda':
        return {
          titulo: 'Excluir agenda',
          mensagem: 'Todos os eventos da agenda serão excluídos permanentemente.',
          detalhes: [`${resumo.agenda} evento(s) da agenda serão excluídos.`],
          rotuloConfirmar: 'Excluir agenda',
        };
      case 'equipes':
        return {
          titulo: 'Excluir equipes',
          mensagem: 'Todas as equipes e seus vínculos de alunos serão excluídos permanentemente.',
          detalhes: [
            `${resumo.equipes} equipe(s) serão excluídas.`,
            `${resumo.membrosEquipe} vínculo(s) de aluno(s) com equipes serão removidos.`,
            'O XP já conquistado pelos alunos é preservado.',
          ],
          rotuloConfirmar: 'Excluir equipes',
        };
      case 'gamificacao':
        return {
          titulo: 'Excluir gamificação',
          mensagem:
            'Ações de XP, lançamentos de XP, moedas e conquistas serão excluídos permanentemente.',
          detalhes: [
            `${resumo.acoesGamificacao} ação(ões) de XP serão excluídas.`,
            `${resumo.eventosXp} lançamento(s) de XP serão excluídos.`,
            `${resumo.movimentacoesMoedas} movimentação(ões) de moedas serão excluídas.`,
            `${resumo.conquistas} conquista(s) e ${resumo.desbloqueiosConquista} desbloqueio(s) serão excluídos.`,
            'O XP e o saldo de moedas dos alunos serão recalculados a partir do histórico restante.',
          ],
          rotuloConfirmar: 'Excluir gamificação',
        };
      case 'tudo':
        return {
          titulo: 'Excluir todos os dados',
          mensagem: 'Todos os dados acadêmicos serão excluídos permanentemente.',
          detalhes: [
            `${resumo.turmas} turma(s), ${resumo.alunos} aluno(s) e ${resumo.professores} professor(es).`,
            `${resumo.disciplinas} disciplina(s) e ${resumo.periodos} período(s) letivo(s).`,
            `${resumo.matriculas} matrícula(s), ${resumo.vinculos} vínculo(s) docente(s).`,
            `${resumo.frequencias} chamada(s) de frequência e ${resumo.avaliacoes} avaliação(ões).`,
            `${resumo.publicacoes} publicação(ões) e ${resumo.comunicados} comunicado(s).`,
            `${resumo.agenda} evento(s) da agenda.`,
            `${resumo.acoesGamificacao} ação(ões) e ${resumo.eventosXp} lançamento(s) de XP.`,
            `${resumo.movimentacoesMoedas} movimentação(ões) de moedas e ${resumo.conquistas} conquista(s).`,
            `${resumo.equipes} equipe(s) e ${resumo.membrosEquipe} vínculo(s) de aluno(s).`,
            'A trilha de auditoria também será apagada.',
          ],
          rotuloConfirmar: 'Excluir tudo',
        };
    }
  }

  async excluir(alvo: GrupoDados): Promise<void> {
    switch (alvo) {
      case 'alunos':
        await this.avaliacoes.removerTodas();
        await this.frequencias.removerTodas();
        await this.matriculas.removerTodas();
        await this.comunicados.removerTodas();
        await this.gamificacao.removerTodosEventos();
        await this.moedas.limparMovimentacoes();
        await this.conquistas.limparDesbloqueios();
        await this.equipes.removerTodosMembros();
        await this.alunos.removeTodos();
        break;
      case 'turmas':
        await this.vinculos.removerTodos();
        await this.avaliacoes.removerTodas();
        await this.frequencias.removerTodas();
        await this.matriculas.removerTodas();
        await this.publicacoes.removerVinculadasATurmas();
        await this.eventos.removerVinculadasATurmas();
        await this.gamificacao.removerEventosDeTurmas();
        await this.moedas.removerDeTurmas();
        await this.equipes.removerDeTurmas();
        await this.alunos.limparTurmas();
        await this.turmas.removeTodos();
        break;
      case 'professores':
        await this.vinculos.removerTodos();
        await this.turmas.limparProfessores();
        await this.professores.removeTodos();
        break;
      case 'disciplinas':
        await this.vinculos.removerTodos();
        await this.avaliacoes.removerTodas();
        await this.turmas.limparDisciplinas();
        await this.disciplinas.removerTodas();
        break;
      case 'periodos':
        await this.avaliacoes.removerTodas();
        await this.frequencias.removerTodas();
        await this.matriculas.removerTodas();
        await this.periodos.removerTodos();
        break;
      case 'frequencias':
        await this.frequencias.removerTodas();
        break;
      case 'avaliacoes':
        await this.avaliacoes.removerTodas();
        break;
      case 'comunicacao':
        await this.publicacoes.removerTodas();
        await this.comunicados.removerTodas();
        break;
      case 'agenda':
        await this.eventos.removerTodas();
        break;
      case 'equipes':
        await this.equipes.removerTodos();
        break;
      case 'gamificacao':
        await this.gamificacao.removerTudo();
        await this.moedas.removerTodas();
        await this.conquistas.removerTudo();
        break;
    }
  }

  async excluirTudo(): Promise<void> {
    await this.publicacoes.removerTodas();
    await this.comunicados.removerTodas();
    await this.eventos.removerTodas();
    await this.gamificacao.removerTudo();
    await this.moedas.removerTodas();
    await this.conquistas.removerTudo();
    await this.equipes.removerTodos();
    await this.vinculos.removerTodos();
    await this.avaliacoes.removerTodas();
    await this.frequencias.removerTodas();
    await this.matriculas.removerTodas();
    await this.turmas.limparProfessores();
    await this.turmas.limparDisciplinas();
    await this.alunos.limparTurmas();
    await this.turmas.removeTodos();
    await this.alunos.removeTodos();
    await this.professores.removeTodos();
    await this.disciplinas.removerTodas();
    await this.periodos.removerTodos();
    await this.auditoria.limpar();
  }
}
