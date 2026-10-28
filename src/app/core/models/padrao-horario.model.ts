import type { BaseEntity, Turno } from './index';
import {
  DadosGradeHoraria,
  LinhaGrade,
  criarLinhaAula,
  criarLinhaIntervalo,
  formatarHorario,
  gradeVazia,
  minutosDeHorario,
} from './horario-turma.model';

export interface PadraoHorarioEscola extends BaseEntity {
  inicioManha: string;
  aulasManha: number;
  inicioTarde: string;
  aulasTarde: number;
  minutosPorAula: number;
  minutosIntervalo: number;
  intervaloAposAulas: number;
}

export interface DadosPadraoHorario {
  inicioManha: string;
  aulasManha: number;
  inicioTarde: string;
  aulasTarde: number;
  minutosPorAula: number;
  minutosIntervalo: number;
  intervaloAposAulas: number;
}

export const MINUTOS_INTERVALO_OPCOES = [15, 20] as const;

export const PADRAO_HORARIO_INICIAL: DadosPadraoHorario = {
  inicioManha: '07:30',
  aulasManha: 5,
  inicioTarde: '13:00',
  aulasTarde: 5,
  minutosPorAula: 50,
  minutosIntervalo: 15,
  intervaloAposAulas: 3,
};

export function turnoUsaPadraoHorario(turno: Turno): boolean {
  return turno === 'manha' || turno === 'tarde' || turno === 'integral';
}

export function calcularFimPeriodo(
  inicio: string,
  quantidadeAulas: number,
  minutosPorAula: number,
  minutosIntervalo: number,
  intervaloAposAulas: number,
): string | null {
  const inicioEmMinutos = minutosDeHorario(inicio);
  if (inicioEmMinutos === null) return null;

  const duracao = duracaoDoPeriodo(
    quantidadeAulas,
    minutosPorAula,
    minutosIntervalo,
    intervaloAposAulas,
  );
  return formatarHorario(inicioEmMinutos + duracao);
}

export function montarGradeAPartirDoPadrao(
  turmaId: string,
  padrao: DadosPadraoHorario,
  turno: Turno,
): DadosGradeHoraria {
  const usaManha = turno === 'manha' || turno === 'integral';
  const usaTarde = turno === 'tarde' || turno === 'integral';
  if (!usaManha && !usaTarde) return gradeVazia(turmaId);

  const linhas: LinhaGrade[] = [];

  if (usaManha) {
    linhas.push(
      ...criarLinhasDoPeriodo(
        padrao.aulasManha,
        padrao.minutosPorAula,
        padrao.minutosIntervalo,
        padrao.intervaloAposAulas,
      ),
    );
  }

  if (usaManha && usaTarde) {
    const fimManha = minutosDeHorario(
      calcularFimPeriodo(
        padrao.inicioManha,
        padrao.aulasManha,
        padrao.minutosPorAula,
        padrao.minutosIntervalo,
        padrao.intervaloAposAulas,
      ) ?? '',
    );
    const inicioTarde = minutosDeHorario(padrao.inicioTarde);

    if (fimManha === null || inicioTarde === null || inicioTarde < fimManha) {
      return gradeVazia(turmaId);
    }

    if (inicioTarde > fimManha) {
      linhas.push({
        ...criarLinhaIntervalo(),
        rotulo: 'Almoço',
        duracaoMinutos: inicioTarde - fimManha,
      });
    }
  }

  if (usaTarde) {
    linhas.push(
      ...criarLinhasDoPeriodo(
        padrao.aulasTarde,
        padrao.minutosPorAula,
        padrao.minutosIntervalo,
        padrao.intervaloAposAulas,
      ),
    );
  }

  return {
    turmaId,
    inicio: usaManha ? padrao.inicioManha : padrao.inicioTarde,
    minutosPorAula: padrao.minutosPorAula,
    linhas,
    aulas: [],
  };
}

export function validarPadraoHorario(dados: DadosPadraoHorario): string[] {
  const erros: string[] = [];
  const inicioManha = minutosDeHorario(dados.inicioManha);
  const inicioTarde = minutosDeHorario(dados.inicioTarde);

  if (inicioManha === null) erros.push('Informe um horário de início da manhã válido.');
  if (inicioTarde === null) erros.push('Informe um horário de início da tarde válido.');

  const periodosValidos = [
    dados.aulasManha,
    dados.aulasTarde,
  ].every((quantidade) => Number.isInteger(quantidade) && quantidade >= 1 && quantidade <= 15);
  if (!periodosValidos) {
    erros.push('A quantidade de aulas por período deve ser entre 1 e 15.');
  }

  if (
    !Number.isInteger(dados.minutosPorAula) ||
    dados.minutosPorAula < 1 ||
    dados.minutosPorAula > 240
  ) {
    erros.push('A duração de cada aula deve ser entre 1 e 240 minutos.');
  }

  if (
    !Number.isInteger(dados.minutosIntervalo) ||
    dados.minutosIntervalo < 1 ||
    dados.minutosIntervalo > 120
  ) {
    erros.push('A duração do intervalo deve ser entre 1 e 120 minutos.');
  }

  if (
    !Number.isInteger(dados.intervaloAposAulas) ||
    dados.intervaloAposAulas < 1 ||
    dados.intervaloAposAulas > 15
  ) {
    erros.push('O intervalo deve ocorrer após uma quantidade válida de aulas.');
  }

  if (erros.length > 0) return [...new Set(erros)];

  const duracaoManha = duracaoDoPeriodo(
    dados.aulasManha,
    dados.minutosPorAula,
    dados.minutosIntervalo,
    dados.intervaloAposAulas,
  );
  const duracaoTarde = duracaoDoPeriodo(
    dados.aulasTarde,
    dados.minutosPorAula,
    dados.minutosIntervalo,
    dados.intervaloAposAulas,
  );

  if (inicioManha !== null && inicioManha + duracaoManha > 1440) {
    erros.push('O horário da manhã não pode ultrapassar o fim do dia.');
  }
  if (inicioTarde !== null && inicioTarde + duracaoTarde > 1440) {
    erros.push('O horário da tarde não pode ultrapassar o fim do dia.');
  }
  if (inicioManha !== null && inicioTarde !== null && inicioTarde < inicioManha + duracaoManha) {
    erros.push('O início da tarde deve ser igual ou posterior ao fim da manhã.');
  }

  return [...new Set(erros)];
}

function criarLinhasDoPeriodo(
  quantidadeAulas: number,
  minutosPorAula: number,
  minutosIntervalo: number,
  intervaloAposAulas: number,
): LinhaGrade[] {
  const linhas: LinhaGrade[] = [];

  for (let indiceAula = 0; indiceAula < quantidadeAulas; indiceAula++) {
    linhas.push(criarLinhaAula());

    const deveInserirIntervalo =
      indiceAula + 1 === intervaloAposAulas && indiceAula + 1 < quantidadeAulas;
    if (deveInserirIntervalo) {
      linhas.push({
        ...criarLinhaIntervalo(),
        duracaoMinutos: minutosIntervalo,
      });
    }
  }

  return linhas;
}

function duracaoDoPeriodo(
  quantidadeAulas: number,
  minutosPorAula: number,
  minutosIntervalo: number,
  intervaloAposAulas: number,
): number {
  const temIntervalo =
    intervaloAposAulas > 0 && quantidadeAulas > intervaloAposAulas;
  return quantidadeAulas * minutosPorAula + (temIntervalo ? minutosIntervalo : 0);
}
