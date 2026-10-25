import { BaseEntity, createId } from './index';
import type { Disciplina } from './disciplina.model';

export type DiaAula = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta';
export type TipoLinhaGrade = 'aula' | 'intervalo';

export interface DiaAulaOpcao {
  value: DiaAula;
  label: string;
}

export const DIAS_AULA: readonly DiaAulaOpcao[] = [
  { value: 'segunda', label: 'Segunda-feira' },
  { value: 'terca', label: 'Terça-feira' },
  { value: 'quarta', label: 'Quarta-feira' },
  { value: 'quinta', label: 'Quinta-feira' },
  { value: 'sexta', label: 'Sexta-feira' },
];

export interface LinhaGrade {
  id: string;
  tipo: TipoLinhaGrade;
  duracaoMinutos: number | null;
  rotulo: string;
}

export interface AulaGrade {
  diaSemana: DiaAula;
  linhaInicioId: string;
  quantidadeAulas: number;
  disciplinaId: string;
}

export interface GradeHorariaTurma extends BaseEntity {
  turmaId: string;
  inicio: string;
  minutosPorAula: number;
  linhas: LinhaGrade[];
  aulas: AulaGrade[];
}

export interface DadosGradeHoraria {
  turmaId: string;
  inicio: string;
  minutosPorAula: number;
  linhas: LinhaGrade[];
  aulas: AulaGrade[];
}

export function criarLinhaAula(): LinhaGrade {
  return { id: createId(), tipo: 'aula', duracaoMinutos: null, rotulo: '' };
}

export function criarLinhaIntervalo(): LinhaGrade {
  return { id: createId(), tipo: 'intervalo', duracaoMinutos: 15, rotulo: 'Intervalo' };
}

export function gradeVazia(turmaId: string): DadosGradeHoraria {
  return {
    turmaId,
    inicio: '08:00',
    minutosPorAula: 50,
    linhas: [],
    aulas: [],
  };
}

/**
 * Garante a quantidade de aulas diárias da grade.
 *
 * As linhas valem para todos os dias da semana, então a quantidade de linhas
 * do tipo `aula` é também a quantidade de aulas por dia. Pausas não entram na
 * contagem. Se a grade já tiver a quantidade desejada (ou mais), é mantida.
 */
export function garantirAulasPorDia(
  grade: DadosGradeHoraria,
  quantidade: number = AULAS_POR_DIA_PADRAO,
): DadosGradeHoraria {
  const aulasExistentes = grade.linhas.filter((linha) => linha.tipo === 'aula').length;
  if (aulasExistentes >= quantidade) return grade;

  const linhasFaltantes = Array.from(
    { length: quantidade - aulasExistentes },
    () => criarLinhaAula(),
  );
  return { ...grade, linhas: [...grade.linhas, ...linhasFaltantes] };
}

export function nomeDiaAula(diaSemana: DiaAula): string {
  return DIAS_AULA.find((dia) => dia.value === diaSemana)?.label ?? diaSemana;
}

export function diaAulaDaData(data: string): DiaAula | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  const dataLocal = new Date(`${data}T12:00:00`);
  if (Number.isNaN(dataLocal.getTime())) return null;
  return DIAS_AULA[(dataLocal.getDay() + 6) % 7]?.value ?? null;
}

export function formatarHorario(minutosDoDia: number): string {
  const minutosNormalizados = ((minutosDoDia % 1440) + 1440) % 1440;
  const horas = Math.floor(minutosNormalizados / 60);
  const minutos = minutosNormalizados % 60;
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/** Formato aceito em colunas `time` do PostgreSQL (`HH:mm` ou `HH:mm:ss`). */
const FORMATO_HORARIO = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/;

/**
 * Normaliza um horário vindo do banco para o formato usado na interface.
 *
 * O PostgreSQL devolve colunas `time` como `07:10:00`; a aplicação trabalha com
 * `HH:mm`. Valores já normalizados ou inválidos são retornados sem alteração.
 */
export function normalizarHorario(horario: string): string {
  if (!FORMATO_HORARIO.test(horario)) return horario;
  const [horas, minutos] = horario.split(':');
  return `${horas}:${minutos}`;
}

export function minutosDeHorario(horario: string): number | null {
  if (!FORMATO_HORARIO.test(horario)) return null;
  const [horas, minutos] = horario.split(':').map(Number);
  return horas * 60 + minutos;
}

export const SEMANAS_LETIVAS_PADRAO = 40;
export const AULAS_POR_DIA_PADRAO = 10;
export const MAXIMO_AULAS_POR_DISCIPLINA_POR_DIA_PADRAO = 3;

export interface ResumoAulasSemanais {
  disciplinaId: string;
  cargaHoraria: number;
  aulasSemanais: number;
}

export interface PosicaoCelulaAula {
  diaSemana: DiaAula;
  linhaInicioId: string;
}

export interface ResultadoMovimentacaoAula {
  aulas: AulaGrade[];
  erro: string | null;
}

/** Estima quantas semanas letivas existem entre duas datas. */
export function calcularSemanasLetivas(dataInicio: string, dataFim: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFim)) {
    return SEMANAS_LETIVAS_PADRAO;
  }

  const inicio = new Date(`${dataInicio}T12:00:00`);
  const fim = new Date(`${dataFim}T12:00:00`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim < inicio) {
    return SEMANAS_LETIVAS_PADRAO;
  }

  const dias = Math.floor((fim.getTime() - inicio.getTime()) / 86_400_000) + 1;
  return Math.max(1, Math.round(dias / 7));
}

/**
 * Converte a carga horária da disciplina em aulas semanais.
 *
 * A carga horária é tratada como o total do período letivo. O total é dividido
 * pelas semanas letivas e pela duração de cada aula.
 */
export function calcularAulasSemanais(
  cargaHoraria: number,
  minutosPorAula: number,
  semanasLetivas: number,
): number {
  if (cargaHoraria <= 0 || minutosPorAula <= 0 || semanasLetivas <= 0) return 0;

  const horasPorAula = minutosPorAula / 60;
  return Math.max(1, Math.round(cargaHoraria / semanasLetivas / horasPorAula));
}

/** Resume a distribuição semanal que será usada pelo gerador automático. */
export function resumirAulasSemanais(
  grade: DadosGradeHoraria,
  disciplinas: readonly Disciplina[],
  semanasLetivas: number,
): ResumoAulasSemanais[] {
  return disciplinas
    .filter((disciplina) => disciplina.ativa)
    .map((disciplina) => ({
      disciplinaId: disciplina.id,
      cargaHoraria: disciplina.cargaHoraria,
      aulasSemanais: calcularAulasSemanais(
        disciplina.cargaHoraria,
        grade.minutosPorAula,
        semanasLetivas,
      ),
    }))
    .sort((primeira, segunda) => segunda.aulasSemanais - primeira.aulasSemanais);
}

/**
 * Distribui as aulas da semana automaticamente.
 *
 * Regras aplicadas:
 * - usa apenas linhas do tipo `aula`;
 * - respeita o limite de aulas da mesma disciplina por dia;
 * - equilibra a quantidade entre os dias e evita aulas geminadas quando há
 *   outra opção;
 * - quando a demanda supera as vagas, reduz proporcionalmente a carga de cada
 *   disciplina para caber na grade.
 */
export function gerarAulasAutomaticas(
  grade: DadosGradeHoraria,
  disciplinas: readonly Disciplina[],
  semanasLetivas: number,
  maximoAulasPorDisciplinaPorDia: number = MAXIMO_AULAS_POR_DISCIPLINA_POR_DIA_PADRAO,
  aleatorio: () => number = Math.random,
): AulaGrade[] {
  const linhasAula = grade.linhas.filter((linha) => linha.tipo === 'aula');
  if (linhasAula.length === 0) return [];

  const dias = DIAS_AULA.map((dia) => dia.value);
  const totalVagas = dias.length * linhasAula.length;
  const demandas = resumirAulasSemanais(grade, disciplinas, semanasLetivas).map((item) => ({
    ...item,
  }));

  ajustarDemandasAoTotal(demandas, totalVagas);
  const demandasValidas = demandas.filter((demanda) => demanda.aulasSemanais > 0);
  if (demandasValidas.length === 0) return [];

  const limitePorDia = Math.max(1, Math.min(maximoAulasPorDisciplinaPorDia, linhasAula.length));
  const ocupacao = new Map<DiaAula, (string | null)[]>(
    dias.map((dia) => [dia, linhasAula.map(() => null)]),
  );
  const totalPorDia = new Map<DiaAula, number>(dias.map((dia) => [dia, 0]));
  const aulasPorDisciplina = new Map<string, Map<DiaAula, number>>();
  const continuidade = linhasAula.map((linha) => {
    const indiceReal = grade.linhas.findIndex((linhaGrade) => linhaGrade.id === linha.id);
    const anterior = grade.linhas[indiceReal - 1];
    const proximo = grade.linhas[indiceReal + 1];
    return {
      anteriorEhAula: anterior?.tipo === 'aula',
      proximoEhAula: proximo?.tipo === 'aula',
    };
  });

  const maiorDemanda = Math.max(...demandasValidas.map((demanda) => demanda.aulasSemanais));

  for (let rodada = 0; rodada < maiorDemanda; rodada++) {
    const disciplinasDaRodada = embaralhar(
      demandasValidas.filter((demanda) => demanda.aulasSemanais > rodada),
      aleatorio,
    );

    for (const demanda of disciplinasDaRodada) {
      const contagemNoDia =
        aulasPorDisciplina.get(demanda.disciplinaId) ?? new Map<DiaAula, number>();
      aulasPorDisciplina.set(demanda.disciplinaId, contagemNoDia);

      const diasDisponiveis = dias.filter((dia) => {
        const ocupadosNoDia = ocupacao.get(dia) ?? [];
        const quantidadeNoDia = contagemNoDia.get(dia) ?? 0;
        return quantidadeNoDia < limitePorDia && ocupadosNoDia.includes(null);
      });
      if (diasDisponiveis.length === 0) continue;

      const menorQuantidadeNoDia = Math.min(
        ...diasDisponiveis.map((dia) => contagemNoDia.get(dia) ?? 0),
      );
      const diasComMenosAulas = diasDisponiveis.filter(
        (dia) => (contagemNoDia.get(dia) ?? 0) === menorQuantidadeNoDia,
      );
      const menorCargaTotal = Math.min(
        ...diasComMenosAulas.map((dia) => totalPorDia.get(dia) ?? 0),
      );
      const diasEquilibrados = diasComMenosAulas.filter(
        (dia) => (totalPorDia.get(dia) ?? 0) === menorCargaTotal,
      );
      const diaEscolhido = embaralhar(diasEquilibrados, aleatorio)[0];
      if (!diaEscolhido) continue;

      const ocupados = ocupacao.get(diaEscolhido) ?? [];
      const indicesLivres = ocupados
        .map((disciplinaId, indice) => (disciplinaId === null ? indice : -1))
        .filter((indice) => indice >= 0)
        .filter((indice) => !temVizinhoDaMesmaDisciplina(
          ocupados,
          continuidade,
          indice,
          demanda.disciplinaId,
        ));
      const candidatos = indicesLivres.length
        ? indicesLivres
        : ocupados
            .map((disciplinaId, indice) => (disciplinaId === null ? indice : -1))
            .filter((indice) => indice >= 0);
      const indiceEscolhido = embaralhar(candidatos, aleatorio)[0];
      if (indiceEscolhido === undefined) continue;

      ocupados[indiceEscolhido] = demanda.disciplinaId;
      contagemNoDia.set(diaEscolhido, (contagemNoDia.get(diaEscolhido) ?? 0) + 1);
      totalPorDia.set(diaEscolhido, (totalPorDia.get(diaEscolhido) ?? 0) + 1);
    }
  }

  const aulasGeradas: AulaGrade[] = [];
  for (const dia of dias) {
    ocupacao.get(dia)?.forEach((disciplinaId, indice) => {
      if (!disciplinaId) return;
      aulasGeradas.push({
        diaSemana: dia,
        linhaInicioId: linhasAula[indice].id,
        quantidadeAulas: 1,
        disciplinaId,
      });
    });
  }
  return aulasGeradas;
}

/**
 * Move uma aula para outra célula da grade.
 *
 * Retorna as aulas atualizadas e uma mensagem de erro quando o destino é
 * inválido. A origem é identificada pelo dia e pela linha inicial.
 */
export function moverAulaNaGrade(
  grade: DadosGradeHoraria,
  origem: PosicaoCelulaAula,
  destino: PosicaoCelulaAula,
): ResultadoMovimentacaoAula {
  const aulaOrigem = grade.aulas.find(
    (aula) =>
      aula.diaSemana === origem.diaSemana && aula.linhaInicioId === origem.linhaInicioId,
  );
  if (!aulaOrigem) {
    return { aulas: grade.aulas, erro: 'Aula de origem não encontrada.' };
  }
  if (
    origem.diaSemana === destino.diaSemana &&
    origem.linhaInicioId === destino.linhaInicioId
  ) {
    return { aulas: grade.aulas, erro: null };
  }

  const indiceDestino = grade.linhas.findIndex((linha) => linha.id === destino.linhaInicioId);
  if (indiceDestino < 0 || grade.linhas[indiceDestino].tipo !== 'aula') {
    return { aulas: grade.aulas, erro: 'Só é possível soltar aulas em uma linha de aula.' };
  }

  const linhasDestino = grade.linhas.slice(
    indiceDestino,
    indiceDestino + aulaOrigem.quantidadeAulas,
  );
  const destinoCabe =
    linhasDestino.length === aulaOrigem.quantidadeAulas &&
    linhasDestino.every((linha) => linha.tipo === 'aula');
  if (!destinoCabe) {
    return {
      aulas: grade.aulas,
      erro: 'A aula não cabe nesse destino sem atravessar uma pausa ou o fim da grade.',
    };
  }

  const linhasOcupadas = new Set<string>();
  for (const aula of grade.aulas) {
    const ehAOrigem =
      aula.diaSemana === origem.diaSemana && aula.linhaInicioId === origem.linhaInicioId;
    if (ehAOrigem || aula.diaSemana !== destino.diaSemana) continue;

    const linhasAula = linhasDaAula(grade, aula);
    if (!linhasAula) continue;
    for (const linhaId of linhasAula) linhasOcupadas.add(linhaId);
  }

  if (linhasDestino.some((linha) => linhasOcupadas.has(linha.id))) {
    return { aulas: grade.aulas, erro: 'O destino já está ocupado por outra aula.' };
  }

  const aulasAtualizadas = grade.aulas
    .filter(
      (aula) =>
        !(aula.diaSemana === origem.diaSemana && aula.linhaInicioId === origem.linhaInicioId),
    )
    .concat({
      ...aulaOrigem,
      diaSemana: destino.diaSemana,
      linhaInicioId: destino.linhaInicioId,
    });

  return { aulas: aulasAtualizadas, erro: null };
}

function ajustarDemandasAoTotal(
  demandas: { aulasSemanais: number }[],
  totalVagas: number,
): void {
  const totalDemandado = demandas.reduce((total, demanda) => total + demanda.aulasSemanais, 0);
  if (totalDemandado <= totalVagas) return;
  if (totalVagas <= 0) {
    for (const demanda of demandas) demanda.aulasSemanais = 0;
    return;
  }

  const proporcao = totalVagas / totalDemandado;
  const restos: { demanda: { aulasSemanais: number }; resto: number }[] = [];
  let distribuidos = 0;

  for (const demanda of demandas) {
    const ideal = demanda.aulasSemanais * proporcao;
    const base = Math.floor(ideal);
    demanda.aulasSemanais = base;
    distribuidos += base;
    restos.push({ demanda, resto: ideal - base });
  }

  restos.sort((primeiro, segundo) => segundo.resto - primeiro.resto);
  let sobra = totalVagas - distribuidos;
  for (const { demanda } of restos) {
    if (sobra <= 0) break;
    demanda.aulasSemanais += 1;
    sobra -= 1;
  }
}

function embaralhar<T>(itens: readonly T[], aleatorio: () => number): T[] {
  const copia = [...itens];
  for (let indice = copia.length - 1; indice > 0; indice--) {
    const sorteado = Math.floor(aleatorio() * (indice + 1));
    [copia[indice], copia[sorteado]] = [copia[sorteado], copia[indice]];
  }
  return copia;
}

function temVizinhoDaMesmaDisciplina(
  ocupados: readonly (string | null)[],
  continuidade: readonly { anteriorEhAula: boolean; proximoEhAula: boolean }[],
  indice: number,
  disciplinaId: string,
): boolean {
  const vizinhoAnterior =
    continuidade[indice]?.anteriorEhAula &&
    indice > 0 &&
    ocupados[indice - 1] === disciplinaId;
  const vizinhoProximo =
    continuidade[indice]?.proximoEhAula &&
    indice < ocupados.length - 1 &&
    ocupados[indice + 1] === disciplinaId;
  return Boolean(vizinhoAnterior || vizinhoProximo);
}

function linhasDaAula(
  grade: DadosGradeHoraria,
  aula: Pick<AulaGrade, 'linhaInicioId' | 'quantidadeAulas'>,
): string[] | null {
  const indiceInicio = grade.linhas.findIndex((linha) => linha.id === aula.linhaInicioId);
  if (indiceInicio < 0) return null;

  const linhas = grade.linhas.slice(indiceInicio, indiceInicio + aula.quantidadeAulas);
  if (linhas.length !== aula.quantidadeAulas || linhas.some((linha) => linha.tipo !== 'aula')) {
    return null;
  }
  return linhas.map((linha) => linha.id);
}

export function validarGradeHoraria(
  grade: DadosGradeHoraria,
  disciplinasOfertadas: ReadonlySet<string>,
): string[] {
  const erros: string[] = [];
  const inicioEmMinutos = minutosDeHorario(grade.inicio);

  if (!grade.turmaId.trim()) erros.push('Turma inválida.');
  if (inicioEmMinutos === null) erros.push('Informe um horário de início válido.');
  if (!Number.isInteger(grade.minutosPorAula) || grade.minutosPorAula < 1 || grade.minutosPorAula > 240) {
    erros.push('A duração de cada aula deve ser entre 1 e 240 minutos.');
  }
  if (grade.linhas.length === 0) erros.push('Adicione ao menos uma linha de aula ou intervalo.');

  const idsLinhas = new Set<string>();
  for (const linha of grade.linhas) {
    if (!linha.id || idsLinhas.has(linha.id)) erros.push('A grade contém uma linha inválida.');
    idsLinhas.add(linha.id);
    if (linha.tipo === 'intervalo' && (!linha.duracaoMinutos || linha.duracaoMinutos < 1)) {
      erros.push('A duração do intervalo deve ser maior que zero.');
    }
  }

  if (inicioEmMinutos !== null && erros.length === 0) {
    const duracaoTotal = grade.linhas.reduce(
      (total, linha) =>
        total + (linha.tipo === 'aula' ? grade.minutosPorAula : (linha.duracaoMinutos ?? 0)),
      0,
    );
    if (inicioEmMinutos + duracaoTotal > 1440) {
      erros.push('A grade não pode ultrapassar o fim do dia.');
    }
  }

  const ocupacoes = new Map<DiaAula, Set<string>>();
  for (const aula of grade.aulas) {
    if (!disciplinasOfertadas.has(aula.disciplinaId)) {
      erros.push('Toda aula precisa usar uma disciplina ativa e ofertada na turma.');
      continue;
    }

    const indiceInicial = grade.linhas.findIndex((linha) => linha.id === aula.linhaInicioId);
    if (indiceInicial < 0 || grade.linhas[indiceInicial].tipo !== 'aula') {
      erros.push('A aula começa em uma linha inválida.');
      continue;
    }
    if (!Number.isInteger(aula.quantidadeAulas) || aula.quantidadeAulas < 1) {
      erros.push('A quantidade de aulas deve ser maior que zero.');
      continue;
    }

    const linhasAula: string[] = [];
    for (const linha of grade.linhas.slice(indiceInicial)) {
      if (linha.tipo === 'intervalo' || linhasAula.length === aula.quantidadeAulas) break;
      linhasAula.push(linha.id);
    }
    if (linhasAula.length !== aula.quantidadeAulas) {
      erros.push('A sequência de aulas não pode ultrapassar uma linha de intervalo ou o fim da grade.');
      continue;
    }

    const ocupadasNoDia = ocupacoes.get(aula.diaSemana) ?? new Set<string>();
    if (linhasAula.some((linhaId) => ocupadasNoDia.has(linhaId))) {
      erros.push('Há duas disciplinas ocupando a mesma aula no mesmo dia.');
      continue;
    }
    for (const linhaId of linhasAula) ocupadasNoDia.add(linhaId);
    ocupacoes.set(aula.diaSemana, ocupadasNoDia);
  }

  return [...new Set(erros)];
}
