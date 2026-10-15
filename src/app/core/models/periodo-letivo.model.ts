import { BaseEntity } from './index';
import { EtapaAvaliacao } from './etapa-avaliacao.model';

export type StatusPeriodoLetivo = 'planejado' | 'ativo' | 'encerrado';

export interface PeriodoLetivo extends BaseEntity {
  nome: string;
  dataInicio: string;
  dataFim: string;
  status: StatusPeriodoLetivo;
  etapas: EtapaAvaliacao[];
}

export interface StatusPeriodoLetivoOpcao {
  value: StatusPeriodoLetivo;
  label: string;
}

export const STATUS_PERIODO: readonly StatusPeriodoLetivoOpcao[] = [
  { value: 'planejado', label: 'Planejado' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'encerrado', label: 'Encerrado' },
];

export function rotuloStatusPeriodo(status: StatusPeriodoLetivo): string {
  return STATUS_PERIODO.find((opcao) => opcao.value === status)?.label ?? status;
}

export interface DadosPeriodoLetivo {
  nome: string;
  dataInicio: string;
  dataFim: string;
  etapas: EtapaAvaliacao[];
}

/**
 * Valida um período letivo antes de gravar (RF-002).
 * Regras: nome e datas obrigatórios, início <= fim, sem sobreposição entre
 * períodos e etapas contidas e não sobrepostas dentro do período.
 */
export function validarPeriodoLetivo(
  dados: DadosPeriodoLetivo,
  existentes: readonly PeriodoLetivo[],
  idAtual?: string,
): string[] {
  const erros: string[] = [];
  if (!dados.nome.trim()) {
    erros.push('Informe o nome do período letivo.');
  }
  if (!dados.dataInicio || !dados.dataFim) {
    erros.push('Informe a data inicial e a data final do período.');
  } else if (dados.dataInicio > dados.dataFim) {
    erros.push('A data inicial não pode ser posterior à data final.');
  }

  if (dados.dataInicio && dados.dataFim && dados.dataInicio <= dados.dataFim) {
    const sobreposto = existentes.find(
      (outro) =>
        outro.id !== idAtual &&
        outro.dataInicio <= outro.dataFim &&
        dados.dataInicio <= outro.dataFim &&
        outro.dataInicio <= dados.dataFim,
    );
    if (sobreposto) {
      erros.push(`As datas se sobrepõem ao período "${sobreposto.nome}".`);
    }
  }

  const idsEtapas = new Set<string>();
  dados.etapas.forEach((etapa, indice) => {
    const rotulo = etapa.nome.trim() || `Etapa ${indice + 1}`;
    if (!etapa.nome.trim()) {
      erros.push(`A ${indice + 1}ª etapa precisa de um nome.`);
    }
    if (!etapa.dataInicio || !etapa.dataFim) {
      erros.push(`A etapa "${rotulo}" precisa de data inicial e final.`);
    } else if (etapa.dataInicio > etapa.dataFim) {
      erros.push(`Na etapa "${rotulo}", a data inicial é posterior à final.`);
    } else if (
      dados.dataInicio &&
      dados.dataFim &&
      (etapa.dataInicio < dados.dataInicio || etapa.dataFim > dados.dataFim)
    ) {
      erros.push(`A etapa "${rotulo}" deve estar dentro das datas do período.`);
    }
    if (idsEtapas.has(etapa.id)) {
      erros.push(`A etapa "${rotulo}" está duplicada.`);
    }
    idsEtapas.add(etapa.id);
  });

  for (let i = 0; i < dados.etapas.length; i++) {
    const primeira = dados.etapas[i];
    if (!primeira.dataInicio || !primeira.dataFim) continue;
    for (let j = i + 1; j < dados.etapas.length; j++) {
      const segunda = dados.etapas[j];
      if (!segunda.dataInicio || !segunda.dataFim) continue;
      if (sobreposicaoDatas(primeira, segunda)) {
        erros.push(`As etapas "${primeira.nome}" e "${segunda.nome}" se sobrepõem.`);
      }
    }
  }

  return erros;
}

function sobreposicaoDatas(primeira: EtapaAvaliacao, segunda: EtapaAvaliacao): boolean {
  return primeira.dataInicio <= segunda.dataFim && segunda.dataInicio <= primeira.dataFim;
}
